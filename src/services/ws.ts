// src/services/ws.ts
// Multi-node aware WS client with small event bus + single-series fallback

type Handler = (data?: any) => void

class Bus {
  private map = new Map<string, Set<Handler>>()
  on(evt: string, fn: Handler) {
    if (!this.map.has(evt)) this.map.set(evt, new Set())
    this.map.get(evt)!.add(fn)
  }
  off(evt: string, fn: Handler) {
    this.map.get(evt)?.delete(fn)
  }
  emit(evt: string, data?: any) {
    this.map.get(evt)?.forEach((fn) => fn(data))
  }
  get all() { return this.map }
}
export const bus = new Bus()

// Prefer env; default to 8081 (mock server)
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081'

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let heartbeatTimer: number | null = null
const RECONNECT_MS = 1500
const HEARTBEAT_MS = 20000

// simple reactive flag (no Vue ref to avoid coupling)
export const connected = { value: false }

export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return

  console.log('[WS] connecting to', WS_URL)
  try {
    socket = new WebSocket(WS_URL)
  } catch {
    scheduleReconnect()
    return
  }

  socket.addEventListener('open', () => {
    connected.value = true
    bus.emit('open')
    startHeartbeat()
  })

  socket.addEventListener('close', () => {
    connected.value = false
    bus.emit('close')
    stopHeartbeat()
    scheduleReconnect()
  })

  socket.addEventListener('error', (e) => {
    connected.value = false
    bus.emit('error', e)
    // close will trigger reconnect
  })

  socket.addEventListener('message', (ev) => {
    let msg: any
    try { msg = JSON.parse(ev.data as string) } catch { return }

    // ---- Multi-node packet ----
    if (msg?.type === 'multi-metric' && Array.isArray(msg.data)) {
      const list = msg.data
        .filter((m: any) => m && typeof m.node === 'string')
        .map((m: any) => ({
          node: m.node,
          ts: m.ts,
          throughput: m.throughput,
          latencyMs: m.latencyMs,
          alertRate: m.alertRate,
          flowIndex: m.flowIndex,
        }))

      // Broadcast each metric for multi-node aware stores
      for (const m of list) bus.emit('metric', m)

      // Fallback so single-series UIs keep working: emit first item again
      if (list.length) bus.emit('metric', list[0])

      // Announce node list when present
      const nodes = list.map((m: { node: any }) => m.node)
      if (nodes.length) bus.emit('nodes', nodes)
      return
    }

    // ---- Single metric packet ----
    if (msg?.type === 'metric') {
      const m = {
        node: typeof msg.node === 'string' ? msg.node : 'DEFAULT',
        ts: msg.ts,
        throughput: msg.throughput,
        latencyMs: msg.latencyMs,
        alertRate: msg.alertRate,
        flowIndex: msg.flowIndex,
      }
      bus.emit('metric', m)
      return
    }

    // ---- Info / mode packets ----
    if (msg?.type === 'info' && Array.isArray(msg.nodes)) {
      bus.emit('nodes', msg.nodes)
      return
    }
    if (msg?.type === 'mode' && typeof msg.mode === 'string') {
      bus.emit('mode', msg.mode)
      return
    }
  })
}

export function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  stopHeartbeat()
  try { socket?.close() } catch {}
  socket = null
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_MS)
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'ping', ts: Date.now() })) } catch {}
    }
  }, HEARTBEAT_MS)
}
function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

// Send JSON to server (e.g., { mode: 'CONGESTION' })
export function send(obj: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try { socket.send(JSON.stringify(obj)) } catch {}
  }
}
