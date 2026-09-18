import { randomUUID } from "node:crypto";

const TARGET = "http://localhost:3000/api/checkout";

async function attempt() {
  const body = JSON.stringify({
    items: [{ slug: "test-item", quantity: 1, price: 500 }],
    customer: {
      name: "Concurrency Replay",
      email: "replay@buyntryy.com",
      phone: "+923001234567",
      address: "123 Main St",
      city: "Lahore"
    },
    payment: { method: "cod" },
    idempotencyKey: "fixed-key-54321" // the Vercel function will cache this! Wait, the Node memory map caches it! Let's see!
  });

  const start = Date.now();
  try {
    const res = await fetch(TARGET, {
      method: "POST",
      headers: { "Content-Type": "application/json", "idempotency-key": "fixed-key-54321" },
      body
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, latency: Date.now() - start, id: data.orderId || data.error };
  } catch (err) {
    return { ok: false, error: err.message, latency: Date.now() - start };
  }
}

async function runTest(concurrent) {
  const promises = [];
  for (let i = 0; i < concurrent; i++) {
    promises.push(attempt());
  }
  const results = await Promise.all(promises);
  console.log(`\nReplay ${concurrent}:`);
  console.log(results.map(r => `Status: ${r.status}, ID: ${r.id}`).join('\n'));
}

async function start() {
  await runTest(2);
}
start();
