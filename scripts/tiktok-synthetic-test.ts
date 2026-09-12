

async function run() {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "DAF1KQBC77UES974M180";
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE;

  if (!token || !testEventCode) {
    console.error("Missing token or test_event_code in .env.local");
    return;
  }

  const event_id = `test_synthetic_view_${Date.now()}`;

  const body = {
    pixel_code: pixelId,
    event: "ViewContent",
    event_id: event_id,
    test_event_code: testEventCode,
    context: {
      page: {
        url: "https://buyntryy.com/product/demo-synthetic"
      }
    },
    properties: {
      contents: [
        {
          content_id: "DEMO-SKU-999",
          content_type: "product",
          content_name: "Automated Synthetic Test",
          quantity: 1,
          price: 5000
        }
      ],
      value: 5000,
      currency: "PKR"
    }
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/pixel/track/", {
      method: "POST",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.text();
    console.log("HTTP Status:", res.status);
    console.log("Event Name:", body.event);
    console.log("Event ID:", event_id);
    console.log("TikTok API Response:", data);
  } catch (err) {
    console.error("Failed:", err);
  }
}

run();
