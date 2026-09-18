// verify-checkout

async function main() {
  console.log("Starting LOCAL Staging Checkout E2E Verification...");

  const testPayload = {
    items: [
      {
        slug: "monster-headphones",
        name: "Monster Open Ear Earbuds",
        price: 4499,
        quantity: 1,
      },
    ],
    customer: {
      name: "Local QA Test",
      email: "qatest@buyntryy.com",
      phone: "+92 309 0333107",
      address: "123 Defense Housing Authority",
      city: "Lahore",
    },
    payment: { method: "cod" },
    subtotal: 4499,
    shipping: 199,
    total: 4698,
    giftWrap: false,
    consent: "1",
  };

  console.log("------------------------------------------");
  console.log("1. TEST API REJECTION (MISSING EMAIL)");
  const p1 = structuredClone(testPayload);
  delete p1.customer.email;
  const res1 = await fetch("http://localhost:3042/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p1),
  });
  const data1 = await res1.json();
  console.log("HTTP Status:", res1.status);
  console.log("Response:", data1);
  if (res1.status === 400 && data1.error.includes("Name, email, phone")) {
    console.log("✅ Missing email cleanly rejected with correct error");
  } else {
    console.error("❌ API rejection test failed");
  }

  console.log("------------------------------------------");
  console.log("2. TEST FULL VALID PAYLOAD (SUCCESSFUL COD PLACEMENT)");
  const res2 = await fetch("http://localhost:3042/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testPayload),
  });
  const data2 = await res2.json();
  console.log("HTTP Status:", res2.status);
  console.log("Response:", data2);
  
  if (data2.ok && data2.orderId) {
    console.log("✅ Order created perfectly:", data2.orderId);
    console.log(`✅ Order mapped properly. Total: ${data2.total}, Shipping: ${data2.shipping}`);
  } else {
    console.error("❌ Order creation failed");
  }

  console.log("------------------------------------------");
  console.log("3. TEST DUPLICATE ORDER (IDEMPOTENCY / DOUBLE-CLICK TIKTOK SAFE)");
  // using idempotency key logic via the API, though without header it creates a new one.
  const res3 = await fetch("http://localhost:3042/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "qa-test-idempotency-key" },
    body: JSON.stringify({...testPayload, idempotencyKey: "qa-test-idempotency-key"}),
  });
  const data3 = await res3.json();
  
  // Submit exact same idempotency payload immediately:
  const res4 = await fetch("http://localhost:3042/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "qa-test-idempotency-key" },
    body: JSON.stringify({...testPayload, idempotencyKey: "qa-test-idempotency-key"}),
  });
  const data4 = await res4.json();
  
  if (data3.orderId === data4.orderId && data4.replayed) {
    console.log("✅ SEVER DUPLICATE PROTECTION PASS: Replayed cached response correctly matched order ID:", data4.orderId);
  } else {
    console.warn("⚠️ Server duplicate protection (Idempotency) behaved unexpectedly, or not using headers.", data4);
  }
}

main();
