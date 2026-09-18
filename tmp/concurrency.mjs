import https from "node:https";

const TARGET = "http://localhost:3000/api/checkout";

async function attempt(idx) {
  const body = JSON.stringify({
    items: [{ slug: "test-item", quantity: 1, price: 500 }],
    customer: {
      name: "Concurrency Test",
      email: "test@buyntryy.com",
      phone: "+923001234567",
      address: "123 Main St",
      city: "Lahore"
    },
    payment: { method: "cod" },
    idempotencyKey: "test-idem-key-12345"
  });

  const start = Date.now();
  const res = await fetch(TARGET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  const data = await res.json();
  const latency = Date.now() - start;
  
  return { idx, status: res.status, latency, orderId: data.orderId || data.error };
}

async function runTest(concurrent) {
  console.log(`Starting ${concurrent} concurrent checkout requests...`);
  const promises = [];
  for (let i = 0; i < concurrent; i++) {
    promises.push(attempt(i));
  }
  const results = await Promise.all(promises);
  console.log(results);
}

runTest(5);
