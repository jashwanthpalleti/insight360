// scripts/mock-ws.cjs — multi-node mock (CommonJS) — Render-ready (single port)
const WebSocket = require("ws");
const http = require("http");

const PORT = Number(process.env.PORT) || 8092;
const TICK = 800;

// Create ONE HTTP server (Render exposes ONE port)
const server = http.createServer((req, res) => {
  if (req.url === "/snapshot") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ nodes, mode }));
    return;
  }

  // simple health check endpoint (optional but handy)
  if (req.url === "/" || req.url === "/health") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.statusCode = 404;
  res.end("not found");
});

// Attach WebSocket server to the same HTTP server
const wss = new WebSocket.Server({ server });

const nodes = ["NYC", "LA", "Frankfurt", "Tokyo", "Sydney"];
let mode = "NORMAL";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function jitter(mean, dev) {
  return mean + (Math.random() * 2 - 1) * dev;
}

const scenarios = {
  NORMAL: { latency: 50, throughput: 200, alert: 0.02, ltDev: 15, thDev: 25, arDev: 0.03 },
  CONGESTION: { latency: 180, throughput: 110, alert: 0.12, ltDev: 40, thDev: 50, arDev: 0.06 },
  OUTAGE: { latency: 600, throughput: 5, alert: 0.95, ltDev: 80, thDev: 10, arDev: 0.02 },
  FLAP: { latency: 250, throughput: 180, alert: 0.25, ltDev: 70, thDev: 60, arDev: 0.1 },
};

function genMetric(region) {
  const s = scenarios[mode] || scenarios.NORMAL;
  return {
    node: region,
    ts: Date.now(),
    throughput: Math.max(0, jitter(s.throughput, s.thDev)),
    latencyMs: Math.max(0, jitter(s.latency, s.ltDev)),
    alertRate: clamp01(jitter(s.alert, s.arDev)),
    flowIndex: Math.random(),
  };
}

setInterval(() => {
  const metrics = nodes.map(genMetric);
  const msg = JSON.stringify({ type: "multi-metric", data: metrics });
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}, TICK);

wss.on("connection", (ws) => {
  console.log("[WS] client connected");
  ws.send(JSON.stringify({ type: "info", nodes, mode }));
  ws.on("message", (buf) => {
    try {
      const d = JSON.parse(buf.toString());
      if (d.mode) {
        mode = String(d.mode).toUpperCase();
        console.log("[WS] mode ->", mode);
      }
    } catch {}
  });
});

// Listen on Render’s assigned port + bind to 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Mock WS] running`);
  console.log(`  WS:       wss://<your-render-service> (same host/port)`);
  console.log(`  Snapshot: https://<your-render-service>/snapshot`);
  console.log(`  Port:     ${PORT}`);
});
