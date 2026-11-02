

async function run() {
  const pixelId = process.env.TIKTOK_TEST_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN || process.env.TIKTOK_ACCESS_TOKEN;
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE;

  if (process.env.TIKTOK_ISOLATED_TEST_MODE !== "true" || !pixelId || !token || !testEventCode) {
    console.error("Explicit isolated Test Events mode, test Pixel ID, token and test event code are required.");
    process.exitCode = 1;
    return;
  }

  const event_id = `test_page_view_${crypto.randomUUID()}`;

  const body = {
    event_source: "web",
    event_source_id: pixelId,
    test_event_code: testEventCode,
    data: [{ event: "PageView", event_id, event_time: Math.floor(Date.now() / 1000), page: { url: "https://buyntryy.com/" } }],
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json().catch(() => null) as { code?: number } | null;
    console.log("HTTP Status:", res.status);
    console.log("Application code:", typeof data?.code === "number" ? data.code : "invalid_response");
    if (!res.ok || data?.code !== 0) process.exitCode = 1;
  } catch {
    console.error("Isolated Test Events request failed.");
    process.exitCode = 1;
  }
}

run();
