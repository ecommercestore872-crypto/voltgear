import http from 'http';

function doRequest(options, body) {
  return new Promise((resolve) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ code: res.statusCode, data }));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const reqData = {
    customer: {
      name: "QA Agent Test",
      email: "qa-test@example.com",
      phone: "0341 4043446",
      address: "123 QA Street",
      city: "Karachi"
    },
    items: [
      {
        slug: "tws-m10",
        name: "TWS M10",
        quantity: 1,
        price: 1500,
        productId: "3bc8e0ea-7360-4b13-b51f-5080e7225c56" // random but existing format
      }
    ],
    shipping: 100,
    discount: 0,
    promoCode: "",
    total: 1600,
    payment: "cod",
    idempotencyKey: "test-" + Date.now(),
    idempotencyFingerprint: "qa-fingerprint-" + Date.now(),
    attribution: {
      source: "tiktok",
      medium: "paid",
      campaign: "qa_physical",
      content: "qa_creative",
      ttclid: "qa-test-123"
    },
    notes: ""
  };

  const res = await doRequest({
    method: 'POST', hostname: 'localhost', port: 3000, path: '/api/checkout',
    headers: { 'Content-Type': 'application/json' }
  }, reqData);
  console.log('Status', res.code);
  console.log('Response', res.data);
}
run();
