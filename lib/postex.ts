export type PostExOrderPayload = {
  orderRefNumber: string;
  invoicePayment: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cityName: string;
  pickupAddressCode?: string;
  orderDetail?: string;
  invoiceDivision?: number;
  items?: number;
};

export type PostExBookingResponse = {
  statusCode: string;
  statusMessage: string;
  dist: {
    trackingNumber: string;
    orderRefNumber: string;
    invoicePayment: number;
    transactionStatus: string;
  };
};

const POSTEX_BASE_URL =
  process.env.POSTEX_API_BASE_URL || "https://api.postex.pk/services/integration/api";

function getPostExToken(): string {
  const token = process.env.POSTEX_API_TOKEN || process.env.NEXT_PUBLIC_POSTEX_API_TOKEN;
  return token ? token.trim() : "";
}

/**
 * Creates an order shipment in PostEx system.
 */
export async function createPostExOrder(
  payload: PostExOrderPayload
): Promise<{ ok: true; trackingNumber: string; data: any } | { ok: false; error: string }> {
  const token = getPostExToken();
  if (!token) {
    return {
      ok: false,
      error: "PostEx API Token is missing. Set POSTEX_API_TOKEN in environment variables.",
    };
  }

  const pickupAddressCode =
    payload.pickupAddressCode ||
    process.env.POSTEX_PICKUP_ADDRESS_CODE ||
    process.env.NEXT_PUBLIC_POSTEX_PICKUP_ADDRESS_CODE ||
    "001";

  const body = {
    orderRefNumber: payload.orderRefNumber,
    invoicePayment: payload.invoicePayment,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    deliveryAddress: payload.deliveryAddress,
    cityName: payload.cityName || "Lahore",
    pickupAddressCode: pickupAddressCode,
    orderDetail: payload.orderDetail || "Electronics Accessories",
    invoiceDivision: payload.invoiceDivision || 1,
    items: payload.items || 1,
    orderType: "Normal",
  };

  try {
    const res = await fetch(`${POSTEX_BASE_URL}/v3/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || data.statusCode !== "200" && data.statusCode !== 200 && data.statusCode !== "201") {
      const msg = data.statusMessage || data.message || `PostEx error (${res.status})`;
      return { ok: false, error: msg };
    }

    const trackingNumber =
      data.dist?.trackingNumber || data.trackingNumber || data.dist?.orderTrackingNumber;

    if (!trackingNumber) {
      return { ok: false, error: "PostEx booking succeeded but tracking number was missing in response." };
    }

    return { ok: true, trackingNumber, data };
  } catch (err: any) {
    console.error("[PostEx API Error]:", err);
    return { ok: false, error: err.message || "Failed to communicate with PostEx API." };
  }
}

/**
 * Fetches PDF invoice / airway bill base64 string from PostEx for tracking number(s).
 */
export function postExConfigured(): boolean {
  return Boolean(getPostExToken());
}

/** Official path: GET /v1/track-order/{trackingNumber} with `token` header. */
export async function trackPostExOrder(
  trackingNumber: string
): Promise<{ ok: true; rawStatus: string; data: unknown } | { ok: false; error: string }> {
  const token = getPostExToken();
  if (!token) return { ok: false, error: "PostEx API Token is missing." };
  const tn = trackingNumber.trim();
  if (!tn) return { ok: false, error: "Missing tracking number." };
  try {
    const res = await fetch(`${POSTEX_BASE_URL}/v1/track-order/${encodeURIComponent(tn)}`, {
      method: "GET",
      headers: { token },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: `PostEx track failed (${res.status})` };
    }
    return { ok: true, rawStatus: JSON.stringify(data ?? {}), data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PostEx track request failed.";
    return { ok: false, error: message };
  }
}

export async function getPostExInvoice(
  trackingNumbers: string[]
): Promise<{ ok: true; pdfBase64: string } | { ok: false; error: string }> {
  const token = getPostExToken();
  if (!token) return { ok: false, error: "PostEx API Token missing." };

  try {
    const res = await fetch(
      `${POSTEX_BASE_URL}/v1/get-invoice?trackingNumbers=${trackingNumbers.join(",")}`,
      {
        method: "GET",
        headers: { token: token },
      }
    );
    const data = await res.json();
    if (!res.ok || (data.statusCode && data.statusCode !== "200")) {
      return { ok: false, error: data.statusMessage || "Failed to fetch PostEx invoice." };
    }

    return { ok: true, pdfBase64: data.dist || data.invoice || "" };
  } catch (err: any) {
    return { ok: false, error: err.message || "PostEx invoice request failed." };
  }
}
