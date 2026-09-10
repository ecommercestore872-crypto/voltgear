import { NextResponse, type NextRequest } from "next/server";
import { verifyAction } from "@/lib/crypto-actions";
import { updateOrderStatus, getOrderById } from "@/lib/order-store";
import type { OrderStatus } from "@/lib/types";
import { publicSiteUrl } from "@/lib/deploy-rules";

export const dynamic = "force-dynamic"; // Prevents static caching of GET query parameters

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const action = searchParams.get("action");
  const exp = searchParams.get("exp");
  const sig = searchParams.get("sig");

  if (!orderId || !action || !exp || !sig) {
    return new NextResponse("Missing cryptographic parameters", { status: 400 });
  }

  // Verify the military-grade HMAC token to guarantee the action was authorized
  const isValid = verifyAction(sig, orderId, action, exp);
  if (!isValid) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>body{font-family:system-ui;background:#fef2f2;color:#991b1b;padding:40px;text-align:center;}</style>
        </head>
        <body>
          <h2>Security Error 🚨</h2>
          <p>This action link is expired or cryptographically invalid.</p>
        </body>
      </html>
    `, { status: 403, headers: { "Content-Type": "text/html" } });
  }

  // Ensure order actually exists in DB
  const order = await getOrderById(orderId);
  if (!order) {
    return new NextResponse("Order not found.", { status: 404 });
  }

  const baseUrl = publicSiteUrl();
  const targetUrl = `${baseUrl}/admin/orders/${encodeURIComponent(orderId)}`;

  try {
    const statusNote = `Automated via 1-Tap Mobile fulfillment email at ${new Date().toLocaleTimeString()}`;
    await updateOrderStatus(orderId, action as OrderStatus, statusNote);
    
    // Render a hyper-optimized premium success card
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Updated | Buy n Try</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; background: #eef2ff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); text-align: center; max-width: 90%; width: 340px; }
            h1 { color: #166534; font-size: 24px; margin: 0 0 12px; tracking: -0.5px; }
            p { color: #64748b; font-size: 15px; margin: 0 0 28px; line-height: 1.5; }
            a { display: block; background: #1e293b; color: white; text-decoration: none; padding: 16px; border-radius: 14px; font-weight: 600; font-size: 16px; transition: transform 0.1s; }
            a:active { transform: scale(0.97); }
            @media(prefers-color-scheme: dark) {
              body { background: #020617; }
              .card { background: #0f172a; border: 1px solid #1e293b; }
              h1 { color: #4ade80; }
              p { color: #cbd5e1; }
              a { background: #f8fafc; color: #0f172a; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <h1>Action Successful</h1>
            <p>Order <strong>${orderId}</strong> has been instantly updated to state <strong>${action.toUpperCase()}</strong>.</p>
            <a href="${targetUrl}">Close & View Dashboard</a>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    return new NextResponse("Server mutation error", { status: 500 });
  }
}
