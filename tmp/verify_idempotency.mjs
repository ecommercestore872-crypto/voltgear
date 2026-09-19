import https from "node:http"; // Because we use local dev server running on :3000

const TARGET = "http://localhost:3000/api/checkout";
const IDEMPOTENCY_KEY = "test-idem-" + Date.now();
const DIFFERENT_KEY = "test-idem-diff-" + Date.now();

const validPayload = {
  items: [{ slug: "tws-m10", quantity: 1, price: 50 }],
  customer: {
    name: "Idempotency Prover", 
    email: "prover@buyntryy.com", 
    phone: "+923001234567",
    address: "123 Test", 
    city: "Lahore"
  },
  payment: { method: "cod" },
  idempotencyKey: IDEMPOTENCY_KEY
};

async function execute(payload, label) {
  const start = Date.now();
  console.log(`Executing ${label}...`);
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https.request(TARGET, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": payload.idempotencyKey || ""
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, latency: Date.now() - start });
        } catch {
          resolve({ status: res.statusCode, data: data, latency: Date.now() - start });
        }
      });
    });
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('--- TEST A & B: Sequential Replay ---');
  const res1 = await execute(validPayload, 'Original Request A');
  console.log('A (Initial):', res1.status, res1.data.replayed ? 'REPLAYED' : 'NEW');
  
  if (res1.status === 200) {
    const res2 = await execute(validPayload, 'Sequential Replay B');
    console.log('B (Sequential):', res2.status, res2.data.replayed ? 'REPLAYED' : 'NEW');
  }

  console.log('\n--- TEST C, D, E: Concurrent Identical (Bypassing Local Cache Race) ---');
  // Creating a new key to avoid sequential cache hits doing the fast-fail
  const CONCURRENT_KEY = "test-idem-concurrent-" + Date.now();
  const cPayload = { ...validPayload, idempotencyKey: CONCURRENT_KEY };
  
  const promises = [];
  for (let i = 0; i < 5; i++) promises.push(execute(cPayload, `Concurrent D/E ${i}`));
  const cResults = await Promise.all(promises);
  for (const r of cResults) console.log(r.status, r.data.replayed ? 'REPLAYED' : 'NEW (or Error)', r.data.error || r.data.orderId);

  console.log('\n--- TEST F: Same Key / Different Payload ---');
  const diffPayload = { ...validPayload, items: [{ slug: "tws-m10", quantity: 2, price: 50 }] };
  const resF = await execute(diffPayload, 'Payload Hack F');
  console.log('F (Collision):', resF.status, resF.data.error || 'Passed');
}

runTests();
