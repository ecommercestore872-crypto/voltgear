import crypto from "crypto";

import { normalizePhoneForCheckout } from "@/lib/checkout-customer-rules";
import { purchaseTrackLog } from "@/lib/purchase-track-observability";

export const TIKTOK_CURRENCY = "PKR";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** TikTok requires normalized phone before SHA-256 (E.164-style +92…). */
export function normalizeTikTokPhoneForHash(raw: string): string | null {
  return normalizePhoneForCheckout(raw);
}

export async function trackTikTokServerPurchase(input: {
  orderId: string;
  total: number;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  consent?: string | null;
  ttclid?: string | null;
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
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN || process.env.TIKTOK_ACCESS_TOKEN;
  const enabled = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;

  if (input.consent !== "all") {
    purchaseTrackLog({ channel: "tiktok", outcome: "skipped_consent" });
    return;
  }
  if (!pixelId || !token || enabled !== "true") {
    purchaseTrackLog({ channel: "tiktok", outcome: "skipped_config" });
    return;
  }

  // The event_id matches the browser implementation exactly for 100% accurate deduplication
  const event_id = `purchase_${input.orderId}`;
  
  const userPayload: Record<string, string> = {};
  if (input.email) {
    const cleanEmail = input.email.trim().toLowerCase();
    if (cleanEmail) userPayload.email = sha256Hex(cleanEmail);
  }
  if (input.phone) {
    const cleanPhone = normalizeTikTokPhoneForHash(input.phone);
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
      },
      ...(input.ttclid ? { ad: { callback: input.ttclid } } : {})
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
      signal: AbortSignal.timeout(5000),
    });
    
    let responseBody: { code?: number; message?: string; request_id?: string } =
      {};
    try {
      responseBody = (await res.json()) as typeof responseBody;
    } catch {
      // non-JSON body
    }

    const requestId = responseBody.request_id;
    if (!res.ok || (typeof responseBody.code === "number" && responseBody.code !== 0)) {
      console.error("[tiktok-events-api] API response error:", {
        httpStatus: res.status,
        code: responseBody.code,
        message: responseBody.message,
        requestId,
      });
      purchaseTrackLog({ channel: "tiktok", outcome: "failed" });
      return;
    }
    console.info("[tiktok-events-api] Purchase accepted", {
      httpStatus: res.status,
      code: responseBody.code ?? 0,
      requestId,
      event_id,
    });
    purchaseTrackLog({ channel: "tiktok", outcome: "sent" });
  } catch (error) {
    purchaseTrackLog({ channel: "tiktok", outcome: "failed" });
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("[tiktok-events-api] Request timed out");
    } else {
      console.error("[tiktok-events-api] Request failed:", error);
    }
  }
}
