import {
  readPostExJsonResponse,
  resolvePostExGetInvoiceUrl,
} from "@/lib/postex";

import type { Order } from "@/lib/types";

export type PostExAirwayBillSuccess = {
  ok: true;
  pdfBytes: Uint8Array;
  contentType: string;
  contentDisposition: string;
};

export type PostExAirwayBillFailure = {
  ok: false;
  error: string;
  httpStatus: number;
};

export type PostExAirwayBillFetchResult = PostExAirwayBillSuccess | PostExAirwayBillFailure;

type PostExAirwayBillEnv = Pick<
  NodeJS.ProcessEnv,
  "POSTEX_API_BASE_URL" | "POSTEX_API_TOKEN"
>;

function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export function formatPostExAirwayBillContentDisposition(
  orderId: string,
  trackingNumber: string,
): string {
  const safeOrderId = orderId.trim().replace(/[^\w-]+/g, "-");
  const safeTracking = trackingNumber.trim().replace(/[^\w-]+/g, "-");
  return `inline; filename="PostEx-${safeOrderId}-${safeTracking}.pdf"`;
}

export async function fetchPostExAirwayBillPdf(
  trackingNumber: string,
  options: {
    fetchImpl?: typeof fetch;
    env?: PostExAirwayBillEnv;
  } = {},
): Promise<PostExAirwayBillFetchResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = env.POSTEX_API_TOKEN?.trim() ?? "";
  if (!token) {
    return {
      ok: false,
      error: "PostEx API Token is missing.",
      httpStatus: 503,
    };
  }

  const tn = trackingNumber.trim();
  if (!tn) {
    return { ok: false, error: "Missing tracking number.", httpStatus: 400 };
  }

  const url = resolvePostExGetInvoiceUrl(tn, env);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: { token },
      cache: "no-store",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to communicate with PostEx API.";
    return { ok: false, error: message, httpStatus: 502 };
  }

  const upstreamHttpStatus = res.status;
  const contentTypeHeader = (res.headers.get("content-type") ?? "").toLowerCase();

  let bodyBytes: Uint8Array;
  try {
    const buffer = await res.arrayBuffer();
    bodyBytes = new Uint8Array(buffer);
  } catch {
    return {
      ok: false,
      error: "PostEx returned an unreadable response.",
      httpStatus: upstreamHttpStatus >= 400 ? upstreamHttpStatus : 502,
    };
  }

  if (!bodyBytes.length) {
    return {
      ok: false,
      error: "PostEx returned an empty airway bill response.",
      httpStatus: upstreamHttpStatus >= 400 ? upstreamHttpStatus : 502,
    };
  }

  const pdfByType = contentTypeHeader.includes("pdf");
  const pdfByMagic = isPdfBytes(bodyBytes);

  if (pdfByType || pdfByMagic) {
    if (!res.ok) {
      return {
        ok: false,
        error: `PostEx airway bill request failed (${upstreamHttpStatus}).`,
        httpStatus: upstreamHttpStatus,
      };
    }
    return {
      ok: true,
      pdfBytes: bodyBytes,
      contentType: pdfByType ? contentTypeHeader.split(";")[0]!.trim() : "application/pdf",
      contentDisposition: "",
    };
  }

  const text = new TextDecoder().decode(bodyBytes.slice(0, 8192));
  const looksJson =
    contentTypeHeader.includes("json") ||
    text.trimStart().startsWith("{") ||
    text.trimStart().startsWith("[");
  if (looksJson) {
    const parsed = await readPostExJsonResponse(
      new Response(bodyBytes, {
        status: upstreamHttpStatus,
        headers: { "content-type": contentTypeHeader || "application/json" },
      }),
    );
    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error,
        httpStatus: parsed.upstreamHttpStatus >= 400 ? parsed.upstreamHttpStatus : 502,
      };
    }
    const data = parsed.data;
    const msg =
      (typeof data.statusMessage === "string" && data.statusMessage) ||
      (typeof data.message === "string" && data.message) ||
      `PostEx airway bill request failed (${upstreamHttpStatus}).`;
    return {
      ok: false,
      error: msg,
      httpStatus: upstreamHttpStatus >= 400 ? upstreamHttpStatus : 502,
    };
  }

  return {
    ok: false,
    error: "PostEx returned a non-PDF airway bill response.",
    httpStatus: upstreamHttpStatus >= 400 ? upstreamHttpStatus : 502,
  };
}

export type PostExAirwayBillHttpResult =
  | { kind: "pdf"; status: 200; pdfBytes: Uint8Array; headers: Record<string, string> }
  | { kind: "json"; status: number; body: Record<string, unknown> };

export type PostExAirwayBillDeps = {
  getOrder: (orderId: string) => Promise<Order | null>;
  fetchAirwayBill?: typeof fetchPostExAirwayBillPdf;
};

export async function runPostExAirwayBillForOrderId(
  orderId: string,
  deps: PostExAirwayBillDeps,
): Promise<PostExAirwayBillHttpResult> {
  const trimmedId = orderId?.trim();
  if (!trimmedId) {
    return {
      kind: "json",
      status: 400,
      body: { success: false, error: "Missing orderId." },
    };
  }

  const order = await deps.getOrder(trimmedId);
  if (!order) {
    return {
      kind: "json",
      status: 404,
      body: { success: false, error: "Order not found." },
    };
  }

  const trackingNumber = order.postexTrackingNumber?.trim() ?? "";
  if (!trackingNumber) {
    return {
      kind: "json",
      status: 400,
      body: {
        success: false,
        error: "This order has no PostEx tracking number yet.",
      },
    };
  }

  const fetchAirwayBill = deps.fetchAirwayBill ?? fetchPostExAirwayBillPdf;
  const fetched = await fetchAirwayBill(trackingNumber);
  if (!fetched.ok) {
    return {
      kind: "json",
      status: fetched.httpStatus,
      body: { success: false, error: fetched.error },
    };
  }

  const contentDisposition = formatPostExAirwayBillContentDisposition(
    trimmedId,
    trackingNumber,
  );

  return {
    kind: "pdf",
    status: 200,
    pdfBytes: fetched.pdfBytes,
    headers: {
      "Content-Type": fetched.contentType || "application/pdf",
      "Content-Disposition": contentDisposition,
    },
  };
}
