import crypto from "crypto";

export const META_CURRENCY = "PKR";

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhone(phone: string): string {
  // Extract only digits
  let cleaned = phone.replace(/[^0-9]/g, "");
  // Standardize Pakistani numbers to 92...
  if (cleaned.startsWith("0092")) {
    cleaned = "92" + cleaned.slice(4);
  } else if (cleaned.startsWith("03") && cleaned.length === 11) {
    cleaned = "92" + cleaned.slice(1);
  } else if (cleaned.startsWith("3") && cleaned.length === 10) {
    cleaned = "92" + cleaned;
  }
  return cleaned;
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
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const version = process.env.META_GRAPH_API_VERSION || "v19.0";
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !token || !version) return;

  const userData: Record<string, any> = {};

  if (input.email) {
    const cleanEmail = input.email.trim().toLowerCase();
    if (cleanEmail) userData.em = [sha256Hex(cleanEmail)];
  }

  if (input.phone) {
    const cleanPhone = normalizePhone(input.phone);
    if (cleanPhone) userData.ph = [sha256Hex(cleanPhone)];
  }

  if (input.fullName) {
    const parts = input.fullName.trim().replace(/\s+/g, " ").toLowerCase().split(" ");
    if (parts.length > 0 && parts[0]) {
      userData.fn = [sha256Hex(parts[0])];
      if (parts.length > 1) {
        const ln = parts.slice(1).join(" ");
        if (ln) userData.ln = [sha256Hex(ln)];
      }
    }
  }

  if (input.city) {
    const cleanCity = input.city.trim().toLowerCase().replace(/[.\-_,]/g, "");
    if (cleanCity) userData.ct = [sha256Hex(cleanCity)];
  }

  if (input.postalCode) {
    const cleanPostal = input.postalCode.trim().toLowerCase();
    if (cleanPostal) userData.zp = [sha256Hex(cleanPostal)];
  }

  if (input.country) {
    const cleanCountry = input.country.trim().toLowerCase();
    if (cleanCountry === "pakistan" || cleanCountry === "pk") {
      userData.country = [sha256Hex("pk")];
    } else if (cleanCountry) {
      userData.country = [sha256Hex(cleanCountry)];
    }
  }

  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

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

  const customData: Record<string, any> = {
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

  const payload: Record<string, any> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: input.orderId,
        user_data: userData,
        custom_data: customData,
      }
    ]
  };

  if (input.eventSourceUrl) {
    payload.data[0].event_source_url = input.eventSourceUrl;
  }

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
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.warn("[meta-capi] Purchase send timeout", { orderId: input.orderId });
    } else {
      console.warn("[meta-capi] Purchase send failed with exception", { orderId: input.orderId, error: error instanceof Error ? error.message : "Unknown" });
    }
  }
}
