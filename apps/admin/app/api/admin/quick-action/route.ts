import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isQuickActionStatus, verifyAction } from "@/lib/crypto-actions";
import { publicSiteUrl } from "@/lib/deploy-rules";
import { cancelOrder, getOrderById, updateOrderStatus } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionParameters = {
  orderId: string;
  action: "shipped" | "cancelled";
  exp: string;
  sig: string;
};

const htmlHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Content-Type": "text/html; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function readActionParameters(values: URLSearchParams | FormData): ActionParameters | null {
  const orderId = values.get("orderId");
  const action = values.get("action");
  const exp = values.get("exp");
  const sig = values.get("sig");
  if (
    typeof orderId !== "string" || typeof action !== "string" ||
    typeof exp !== "string" || typeof sig !== "string" || !orderId ||
    !isQuickActionStatus(action) || !verifyAction(sig, orderId, action, exp)
  ) return null;
  return { orderId, action, exp, sig };
}

function actionPage(parameters: ActionParameters): string {
  const orderId = escapeHtml(parameters.orderId);
  const action = escapeHtml(parameters.action);
  const exp = escapeHtml(parameters.exp);
  const sig = escapeHtml(parameters.sig);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm order action</title><style>body{font-family:system-ui;background:#eef2ff;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#fff;padding:32px;border-radius:20px;box-shadow:0 10px 40px #0001;text-align:center;max-width:360px}button{border:0;border-radius:12px;padding:14px 20px;background:#1e293b;color:#fff;font-weight:700;cursor:pointer}p{color:#64748b;line-height:1.5}</style></head><body><main class="card"><h1>Confirm order update</h1><p>Mark order <strong>${orderId}</strong> as <strong>${action}</strong>?</p><form method="post"><input type="hidden" name="orderId" value="${orderId}"><input type="hidden" name="action" value="${action}"><input type="hidden" name="exp" value="${exp}"><input type="hidden" name="sig" value="${sig}"><button type="submit">Confirm ${action}</button></form></main></body></html>`;
}

async function GETHandler(request: Request) {
  const parameters = readActionParameters(new URL(request.url).searchParams);
  if (!parameters) return new NextResponse("Invalid or expired action link", { status: 403 });
  if (!await getOrderById(parameters.orderId)) return new NextResponse("Order not found", { status: 404 });
  return new NextResponse(actionPage(parameters), { headers: htmlHeaders });
}

async function POSTHandler(request: Request) {
  const parameters = readActionParameters(await request.formData());
  if (!parameters) return new NextResponse("Invalid or expired action link", { status: 403 });
  if (!await getOrderById(parameters.orderId)) return new NextResponse("Order not found", { status: 404 });
  try {
    const note = `Confirmed via signed fulfillment email at ${new Date().toISOString()}`;
    if (parameters.action === "cancelled") {
      const cancelled = await cancelOrder(parameters.orderId, note);
      if (!cancelled.ok) {
        return new NextResponse(cancelled.error || "Could not cancel order", {
          status: cancelled.status,
        });
      }
    } else {
      const updated = await updateOrderStatus(
        parameters.orderId,
        parameters.action,
        note,
      );
      if (!updated) {
        return new NextResponse("Could not update order", { status: 409 });
      }
    }
    const target = escapeHtml(`${publicSiteUrl()}/admin/orders/${encodeURIComponent(parameters.orderId)}`);
    return new NextResponse(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order updated</title><style>body{font-family:system-ui;background:#eef2ff;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:#fff;padding:32px;border-radius:20px;text-align:center}a{display:block;padding:14px;background:#1e293b;color:#fff;border-radius:12px;text-decoration:none}</style></head><body><main class="card"><h1>Order updated</h1><p>The signed action was applied successfully.</p><a href="${target}">View order</a></main></body></html>`, { headers: htmlHeaders });
  } catch {
    return new NextResponse("Could not update order", { status: 500 });
  }
}

export const GET = withAdminApiObservability("GET /api/admin/quick-action", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/quick-action", POSTHandler);
