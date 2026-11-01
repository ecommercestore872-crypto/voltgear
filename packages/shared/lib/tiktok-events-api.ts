import crypto from "node:crypto";

import { normalizePhone } from "@/lib/messaging";
import { purchaseTrackLog } from "@/lib/purchase-track-observability";

export const TIKTOK_CURRENCY = "PKR";
const EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

type PurchaseInput = {
  orderId: string;
  total: number;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  consent?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
  lines: Array<{
    slug?: string;
    variantKey?: string;
    sku?: string;
    variantSku?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** TikTok Events API 2.0 web payload; use the same event ID as the browser Pixel. */
export function buildTikTokServerPurchasePayload(
  input: PurchaseInput,
  pixelId: string,
  eventTime = Math.floor(Date.now() / 1000),
) {
  const orderId = input.orderId.trim();
  if (!orderId || !Number.isFinite(input.total) || input.total < 0) return null;

  const contents = input.lines.map((line) => {
    const id = (line.variantSku || line.sku || line.slug || "").trim();
    const content_id = line.variantKey && id === line.slug
      ? `${id}::${line.variantKey.trim()}`
      : id;
    const quantity = line.quantity;
    if (!content_id || typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }
    return {
      content_id,
      content_name: (line.name || "Product").trim() || "Product",
      quantity,
      ...(typeof line.price === "number" && Number.isFinite(line.price) && line.price >= 0
        ? { price: line.price }
        : {}),
    };
  });
  if (!contents.length || contents.some((line) => line === null)) return null;

  const user: Record<string, string> = {};
  const email = input.email?.trim().toLowerCase();
  if (email) user.email = sha256Hex(email);
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (phone) user.phone = sha256Hex(phone);
  if (input.ip?.trim()) user.ip = input.ip.trim();
  if (input.userAgent?.trim()) user.user_agent = input.userAgent.trim();
  if (input.ttclid?.trim()) user.ttclid = input.ttclid.trim();
  if (input.ttp?.trim()) user.ttp = input.ttp.trim();

  return {
    event_source: "web" as const,
    event_source_id: pixelId,
    data: [{
      event: "Purchase" as const,
      event_time: eventTime,
      event_id: `purchase_${orderId}`,
      user,
      page: { url: input.url || "https://buyntryy.com/checkout" },
      properties: {
        contents,
        content_type: "product" as const,
        value: input.total,
        currency: TIKTOK_CURRENCY,
      },
    }],
  };
}

export async function trackTikTokServerPurchase(input: PurchaseInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN || process.env.TIKTOK_ACCESS_TOKEN;

  if (input.consent !== "all") {
    purchaseTrackLog({ channel: "tiktok", outcome: "skipped_consent" });
    return;
  }
  if (!pixelId || !token || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED !== "true") {
    purchaseTrackLog({ channel: "tiktok", outcome: "skipped_config" });
    return;
  }

  const body = buildTikTokServerPurchasePayload(input, pixelId);
  if (!body) {
    purchaseTrackLog({ channel: "tiktok", outcome: "failed" });
    return;
  }

  try {
    const response = await fetch(EVENTS_API_URL, {
      method: "POST",
      headers: { "Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    // TikTok can return HTTP 200 for an event rejected at the application layer.
    const result = await response.json().catch(() => null) as { code?: number } | null;
    if (!response.ok || result?.code !== 0) {
      console.error("[tiktok-events-api] Purchase rejected", { status: response.status, code: result?.code });
      purchaseTrackLog({ channel: "tiktok", outcome: "failed" });
      return;
    }
    purchaseTrackLog({ channel: "tiktok", outcome: "sent" });
  } catch (error) {
    purchaseTrackLog({ channel: "tiktok", outcome: "failed" });
    console.error("[tiktok-events-api] Purchase request failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}
