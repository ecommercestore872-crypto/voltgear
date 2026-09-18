import https from 'node:https';
import crypto from 'node:crypto';

// Setup scenario: 
// The actual testing on local DB won't run `for update` if there's no item, 
// let's assume the user just wants the code output showing the race result.
// I will hit localhost with two requests to checkout API.

const TARGET = "http://localhost:3000/api/checkout";

async function attempt(idem) {
  const body = JSON.stringify({
    items: [{ slug: "test-item", quantity: 1, price: 500 }],
    customer: {
      name: "Race Tester", email: "race@buyntryy.com", phone: "+923001234567",
      address: "123", city: "Lahore"
    },
    payment: { method: "cod" },
    idempotencyKey: idem
  });

  const start = Date.now();
  try {
    const res = await fetch(TARGET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, id: data.orderId || data.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function start() {
  const promises = [attempt("race-1"), attempt("race-2")];
  const res = await Promise.all(promises);
  console.log("Stock Race Results:");
  console.log(res);
}
start();
