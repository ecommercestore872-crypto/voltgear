import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";

const TARGET = "http://localhost:3000/api/checkout";
const STAGES = [5, 10, 25];

function attemptWrite(idx) {
  return new Promise((resolve) => {
    const start = Date.now();
    const uid = crypto.randomUUID().split("-")[0];
    const body = JSON.stringify({
      items: [{ slug: "tws-m10", quantity: 1, price: 999 }], // Actually valid item based on typical tests for this repo. Let's use it or fallback to error 400. Even if 400, I'll log it.
      customer: {
        name: `Customer ${uid}`,
        email: `test-${uid}@buyntryy.com`,
        phone: `+92300123${idx.toString().padStart(4, '0')}`,
        address: "123 Main St",
        city: "Lahore"
      },
      payment: { method: "cod" }
    });
    
    const req = http.request(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ ok: res.statusCode === 200, status: res.statusCode, latency: Date.now() - start });
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 500, error: err.message, latency: Date.now() - start }));
    req.write(body);
    req.end();
  });
}

async function runStage(concurrency) {
  console.log(`\n\n--- Write Concurrency ${concurrency} ---`);
  
  const promises = [];
  for(let i=0; i<concurrency; i++) {
    promises.push(attemptWrite(i));
  }
  
  const results = await Promise.all(promises);
  
  const latencies = results.map(r => r.latency).sort((a,b) => a-b);
  const totalReq = latencies.length;
  
  const p50 = latencies[Math.floor(totalReq * 0.5)] || 0;
  const p95 = latencies[Math.floor(totalReq * 0.95)] || 0;
  const p99 = latencies[Math.floor(totalReq * 0.99)] || 0;
  
  const successes = results.filter(r => r.ok).length;
  const failures = results.filter(r => !r.ok).length;
  
  console.log(`Attempts: ${totalReq}`);
  console.log(`Success: ${successes}`);
  console.log(`Failures: ${failures} (Status codes: ${[...new Set(results.filter(r=>!r.ok).map(r=>r.status))].join(',')})`);
  console.log(`p50: ${p50}ms`);
  console.log(`p95: ${p95}ms`);
  console.log(`p99: ${p99}ms`);
}

async function main() {
  for (const c of STAGES) {
    await runStage(c);
  }
}
main();
