import crypto from "crypto";

export const TIKTOK_CURRENCY = "PKR";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function trackTikTokServerPurchase(input: {
  orderId: string;
  total: number;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  lines: Array<{
    slug?: string;
    variantKey?: string;
    sku?: string;
    variantSku?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
}) {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const enabled = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;

  if (!pixelId || !token || enabled !== "true") return;

  // The event_id matches the browser implementation exactly for 100% accurate deduplication
  const event_id = `purchase_${input.orderId}`;
  
  const userPayload: Record<string, string> = {};
  if (input.email) {
    const cleanEmail = input.email.trim().toLowerCase();
    if (cleanEmail) userPayload.email = sha256Hex(cleanEmail);
  }
  if (input.phone) {
    const cleanPhone = input.phone.trim();
    if (cleanPhone) userPayload.phone_number = sha256Hex(cleanPhone);
  }

  const contents = input.lines.map(line => {
    let content_id = line.variantSku || line.sku || line.slug || "unknown";
    if (line.variantKey && content_id === line.slug) {
       content_id = `${line.slug}::${line.variantKey}`;
    }
    return {
      content_id,
      content_type: "product",
      content_name: line.name || "Product",
      quantity: line.quantity || 1,
      price: line.price || 0,
    };
  });

  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE;

  const body = {
    pixel_code: pixelId,
    event: "Purchase",
    event_id: event_id,
    test_event_code: testEventCode || undefined,
    context: {
      user: Object.keys(userPayload).length > 0 ? userPayload : undefined,
      ip: input.ip || undefined,
      user_agent: input.userAgent || undefined,
      page: {
        url: input.url || "https://buyntryy.com/checkout"
      }
    },
    properties: {
      contents,
      value: input.total,
      currency: TIKTOK_CURRENCY,
    }
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/pixel/track/", {
      method: "POST",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      console.error("[tiktok-events-api] API response error:", await res.text());
    }
  } catch (error) {
    console.error("[tiktok-events-api] Request failed:", error);
  }
}
