import { purchaseTrackLog } from "@/lib/purchase-track-observability";
import { buildMetaHashedCustomer, type MetaCustomer } from "@/lib/meta-matching";

export const META_CURRENCY = "PKR";

export type MetaEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export type MetaServerEventInput = MetaCustomer & {
  eventName: MetaEventName;
  eventId: string;
  customData?: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbp?: string;
  fbc?: string;
};

export function buildMetaServerEventPayload(input: MetaServerEventInput, eventTime = Math.floor(Date.now() / 1000)) {
  const userData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(buildMetaHashedCustomer(input))) {
    userData[key] = [value];
  }
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  return {
    data: [{
      event_name: input.eventName,
      event_time: eventTime,
      action_source: "website",
      event_id: input.eventId,
      user_data: userData,
      ...(input.customData ? { custom_data: input.customData } : {}),
      ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
    }],
  };
}

export async function trackMetaServerEvent(input: MetaServerEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v19.0";
  if (!pixelId || !token) return;
  const payload: Record<string, unknown> = buildMetaServerEventPayload(input);
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn("[meta-capi] Event rejected", { eventName: input.eventName, status: response.status });
  } catch (error) {
    console.warn("[meta-capi] Event request failed", { eventName: input.eventName, reason: error instanceof Error ? error.name : "unknown" });
  }
}

export async function trackMetaServerPurchase(input: {
  orderId: string;
  value: number;
  items: Array<{
    productId?: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
  email?: string;
  phone?: string;
  fullName?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  fbp?: string;
  fbc?: string;
  consent?: string | null;
  privacyOptOut?: boolean;
}) {
  if (input.consent !== "all" || input.privacyOptOut) {
    purchaseTrackLog({ channel: "meta", outcome: "skipped_consent" });
    return;
  }
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v19.0";
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !token || !version) {
    purchaseTrackLog({ channel: "meta", outcome: "skipped_config" });
    return;
  }

  let allItemsValid = true;
  let summedQuantity = 0;
  
  const contents = input.items.map(i => {
    if (
      !i.productId ||
      typeof i.price !== "number" || i.price < 0 || !Number.isFinite(i.price) ||
      typeof i.quantity !== "number" || i.quantity <= 0 || !Number.isFinite(i.quantity)
    ) {
      allItemsValid = false;
    }
    const safeQty = typeof i.quantity === "number" && Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : 0;
    summedQuantity += safeQty;

    return {
      id: i.productId || "",
      quantity: safeQty,
      item_price: i.price,
    };
  });

  const customData: Record<string, unknown> = {
    currency: META_CURRENCY,
    value: input.value,
  };

  if (allItemsValid && input.items.length > 0) {
    customData.content_type = "product";
    customData.content_ids = input.items.map(i => i.productId);
    customData.contents = contents;
    customData.num_items = summedQuantity;
  } else {
    customData.num_items = summedQuantity;
  }

  const payload: ReturnType<typeof buildMetaServerEventPayload> & { test_event_code?: string } = buildMetaServerEventPayload({
    eventName: "Purchase", eventId: input.orderId, externalId: input.orderId,
    email: input.email, phone: input.phone, fullName: input.fullName,
    city: input.city, postalCode: input.postalCode, country: input.country,
    clientIp: input.clientIp, userAgent: input.userAgent,
    fbp: input.fbp, fbc: input.fbc, eventSourceUrl: input.eventSourceUrl,
    customData,
  });

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  try {
    const url = `https://graph.facebook.com/${version}/${pixelId}/events?access_token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      let message = await res.text();
      try { message = JSON.parse(message).error?.message || message; } catch {}
      console.warn("[meta-capi] Purchase send failed", { orderId: input.orderId, status: res.status, message });
      purchaseTrackLog({ channel: "meta", outcome: "failed" });
      return;
    }
    purchaseTrackLog({ channel: "meta", outcome: "sent" });
  } catch (error) {
    purchaseTrackLog({ channel: "meta", outcome: "failed" });
    if (error instanceof Error && error.name === "TimeoutError") {
      console.warn("[meta-capi] Purchase send timeout", { orderId: input.orderId });
    } else {
      console.warn("[meta-capi] Purchase send failed with exception", { orderId: input.orderId, error: error instanceof Error ? error.message : "Unknown" });
    }
  }
}
