// src/store/metrics.ts
import { defineStore } from 'pinia'

export type MetricPayload = {
  node: string          // NEW: node/region id
  ts: number
  throughput: number    // Mbps
  latencyMs: number     // p99 ms
  alertRate: number     // 0..1
  flowIndex: number     // 0..1 (for color)
}

type HistMap = Record<string, MetricPayload[]>
type LastMap = Record<string, MetricPayload | null>

const MAX_POINTS_PER_NODE = 600

export const useMetricsStore = defineStore('metrics', {
  state: () => ({
    nodes: [] as string[],               // known nodes (order for charts/legend)
    historyByNode: {} as HistMap,        // node -> timeline
    lastByNode: {} as LastMap,           // node -> last point
  }),

  getters: {
    // For legacy single-node UI bits (cards), show an aggregate across nodes
    lastAggregate: (s) => {
      const lasts = Object.values(s.lastByNode).filter(Boolean) as MetricPayload[]
      if (!lasts.length) return null
      const avg = (k: keyof MetricPayload) =>
        lasts.reduce((acc, m) => acc + (m[k] as unknown as number), 0) / lasts.length
      // pick the newest ts among nodes
      const ts = Math.max(...lasts.map((m) => m.ts))
      return {
        node: 'ALL',
        ts,
        throughput: avg('throughput'),
        latencyMs: avg('latencyMs'),
        alertRate: avg('alertRate'),
        flowIndex: avg('flowIndex'),
      } as MetricPayload
    },

    // Flattened recent history across nodes (if you still need a single array)
    historyFlat: (s) => {
      const all: MetricPayload[] = []
      for (const n of s.nodes) {
        const arr = s.historyByNode[n] || []
        all.push(...arr)
      }
      // sort by ts if you ever need it
      return all.sort((a, b) => a.ts - b.ts)
    },
  },

  actions: {
    setNodes(nodes: string[]) {
      this.nodes = nodes
      for (const n of nodes) {
        if (!this.historyByNode[n]) this.historyByNode[n] = []
        if (!(n in this.lastByNode)) this.lastByNode[n] = null
      }
      // prune unknown nodes
      for (const key of Object.keys(this.historyByNode)) {
        if (!nodes.includes(key)) {
          delete this.historyByNode[key]
          delete this.lastByNode[key]
        }
      }
    },

    // push a single metric
    push(m: MetricPayload) {
      const n = m.node
      if (!this.historyByNode[n]) this.historyByNode[n] = []
      this.historyByNode[n].push(m)
      if (this.historyByNode[n].length > MAX_POINTS_PER_NODE) {
        this.historyByNode[n].splice(0, this.historyByNode[n].length - MAX_POINTS_PER_NODE)
      }
      this.lastByNode[n] = m
      // ensure node is tracked
      if (!this.nodes.includes(n)) this.nodes.push(n)
    },

    // push many metrics (e.g., from multi-metric packet)
    pushMany(list: MetricPayload[]) {
      for (const m of list) this.push(m)
    },

    clear() {
      this.historyByNode = {}
      this.lastByNode = {}
      this.nodes = []
    },
  },
})
