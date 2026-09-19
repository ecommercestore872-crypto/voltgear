import https from "node:https";
import http from "node:http";

const TARGET = "https://buyntryy.com";
const STAGES = [5, 10, 25, 50];

function fetchOnce() {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(TARGET, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve({ ok: res.statusCode === 200, status: res.statusCode, latency: Date.now() - start });
      });
    }).on('error', (err) => resolve({ ok: false, status: 500, error: err.message, latency: Date.now() - start }));
  });
}

async function runStage(concurrency) {
  const DURATION_MS = 15000;
  console.log(`\n\n--- Concurrency ${concurrency} ---`);
  
  const results = [];
  let isRunning = true;
  
  const workers = Array.from({ length: concurrency }).map(async () => {
    while (isRunning) {
      results.push(await fetchOnce());
    }
  });

  await new Promise(r => setTimeout(r, DURATION_MS));
  isRunning = false;
  await Promise.all(workers);

  const durationSec = DURATION_MS / 1000;
  const latencies = results.map(r => r.latency).sort((a,b) => a-b);
  const totalReq = latencies.length;
  
  const rps = totalReq / durationSec;
  const p50 = latencies[Math.floor(totalReq * 0.5)] || 0;
  const p90 = latencies[Math.floor(totalReq * 0.90)] || 0;
  const p95 = latencies[Math.floor(totalReq * 0.95)] || 0;
  const p99 = latencies[Math.floor(totalReq * 0.99)] || 0;
  
  const http2xx = results.filter(r => r.status >= 200 && r.status < 300).length;
  const http4xx = results.filter(r => r.status >= 400 && r.status < 500).length;
  const http5xx = results.filter(r => r.status >= 500).length;
  const errors = results.filter(r => !r.ok).length;
  
  console.log(`Duration: ${durationSec}s`);
  console.log(`Requests: ${totalReq}`);
  console.log(`RPS: ${rps.toFixed(2)}`);
  console.log(`p50: ${p50}ms`);
  console.log(`p90: ${p90}ms`);
  console.log(`p95: ${p95}ms`);
  console.log(`p99: ${p99}ms`);
  console.log(`HTTP 2xx: ${http2xx}`);
  console.log(`HTTP 4xx: ${http4xx}`);
  console.log(`HTTP 5xx: ${http5xx}`);
  console.log(`Error %: ${((errors / totalReq) * 100).toFixed(2)}%`);
}

async function main() {
  for (const c of STAGES) {
    await runStage(c);
  }
}
main();
