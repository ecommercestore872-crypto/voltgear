import https from "node:https";

const TARGET = "https://buyntryy.com";
const CONCURRENCY = [5, 10, 25];

async function measureRequest() {
  const start = Date.now();
  try {
    const res = await fetch(TARGET);
    await res.text();
    return { ok: res.ok, status: res.status, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, latency: Date.now() - start };
  }
}

async function runStage(concurrency) {
  const promises = Array.from({ length: concurrency }).map(() => measureRequest());
  const results = await Promise.all(promises);
  
  const latencies = results.map(r => r.latency).sort((a,b) => a-b);
  const ok = results.filter(r => r.ok).length;
  console.log(`\nConcurrency: ${concurrency}`);
  console.log(`Requests: ${concurrency}`);
  console.log(`p50: ${latencies[Math.floor(concurrency * 0.5)]}ms`);
  console.log(`p95: ${latencies[Math.floor(concurrency * 0.95)]}ms`);
  console.log(`p99: ${latencies[Math.floor(concurrency * 0.99)]}ms`);
  console.log(`Errors: ${concurrency - ok}`);
}

async function start() {
  for (const c of CONCURRENCY) {
    await runStage(c);
    await new Promise(r => setTimeout(r, 1000));
  }
}
start();
