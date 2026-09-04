/**
 * Email delivery abstraction.
 *
 * Provider: Resend. Set RESEND_API_KEY + FROM_EMAIL.
 * ORDER_NOTIFY_EMAIL: separate owner “new order” email + Reply-To (optional).
 * Without a key, emails are logged to the console (dev mode).
 */

import { fetchSiteSettings } from "@/lib/db/store";
import { publicSiteUrl } from "@/lib/deploy-rules";
import { SHOPPER_BRAND } from "@/lib/brand";
import {
  buildAdminNewOrderEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  defaultFromAddress,
  orderEmailFailureNote,
  resolveNotifyAddress,
  type NewOrderEmailResult,
  type OrderEmailPayload,
  type OrderStatusEmailPayload,
} from "@/lib/email-rules";
import type { OrderEmailConfig } from "@/lib/order-email-cms-rules";

export type { OrderEmailPayload, OrderStatusEmailPayload };
export { buildOrderConfirmationEmail, buildOrderStatusEmail, buildAdminNewOrderEmail };

const BRAND_NAME = process.env.BRAND_NAME || SHOPPER_BRAND.spokenName;
const FROM_EMAIL = process.env.FROM_EMAIL || defaultFromAddress(BRAND_NAME);

function pkr(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
}

function notifyEmail(settingsEmail?: string | null, customerEmail?: string | null): string {
  return resolveNotifyAddress({
    envNotify: process.env.ORDER_NOTIFY_EMAIL,
    settingsEmail,
    customerEmail,
  });
}

async function loadOrderEmailConfig(): Promise<OrderEmailConfig | undefined> {
  try {
    const settings = await fetchSiteSettings();
    const cfg = settings?.orderEmails;
    if (!cfg || (!cfg.theme && !cfg.letters)) return undefined;
    return cfg;
  } catch {
    return undefined;
  }
}

async function deliver(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const replyTo = notifyEmail() || message.replyTo;
  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
  if (message.bcc?.length) payload.bcc = message.bcc;
  if (replyTo) payload.reply_to = replyTo;

  if (!apiKey) {
    console.info("[email][dev] would send:", JSON.stringify({ ...message, replyTo }, null, 2));
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(
      `[email] send failed (${res.status}):`,
      await res.text().catch(() => "")
    );
    return false;
  }
  return true;
}

/** Dark shell — marketing emails only (abandoned cart, win-back, review). */
function shell({ title, body }: { title: string; body: string }): string {
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b0f19;color:#e5e9f0;padding:24px;margin:0">
<div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px">
<h1 style="margin:0 0 4px;font-size:18px">${BRAND_NAME}</h1>
<p style="color:#8b93a7;margin:0 0 20px">${title}</p>
<div style="color:#e5e9f0;font-size:14px;line-height:1.6">${body}</div>
<p style="color:#8b93a7;font-size:12px;margin-top:24px">You received this email from ${BRAND_NAME}. ${BRAND_NAME}, all rights reserved.</p>
</div></body></html>`;
}

export const emailTemplates = {
  orderConfirmation(p: OrderEmailPayload): Omit<EmailMessage, "to"> {
    return buildOrderConfirmationEmail(p);
  },

  postPurchase(p: OrderEmailPayload): Omit<EmailMessage, "to"> {
    const first = p.items[0];
    const reviewUrl = `${
      publicSiteUrl()
    }${first?.slug ? `/write-review?product=${first.slug}` : "/write-review"}`;
    return {
      subject: `How did ${first?.name ?? "your order"} work out?`,
      text: `Hi ${p.name}, we hope you're enjoying your order. We'd love your feedback — reviews help other shoppers decide with confidence.`,
      html: shell({
        title: "Share your experience",
        body: `<p>Hi ${p.name}, we hope you're enjoying your ${BRAND_NAME} order.</p>
<p>If you have a moment, please leave a review — real customer feedback is what helps other shoppers buy with confidence. You can even attach a photo of the product.</p>
<p style="margin-top:20px"><a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Write a review</a></p>`,
      }),
    };
  },

  abandonedCart(p: {
    name?: string;
    items: { name: string; price: number; quantity: number }[];
    subtotal: number;
  }): Omit<EmailMessage, "to"> {
    const rows = p.items
      .map(
        (i) =>
          `<tr><td style="padding:4px 0;border-bottom:1px solid #1f2937">${i.name} × ${i.quantity}</td><td style="text-align:right;color:#e5e9f0;white-space:nowrap">${pkr(
            i.price * i.quantity
          )}</td></tr>`
      )
      .join("");
    return {
      subject: `Your ${BRAND_NAME} cart is waiting`,
      text: `Hi${p.name ? " " + p.name : ""}, you left items in your cart. Your order is ready whenever you are.`,
      html: shell({
        title: "You left something behind",
        body: `<p>Hi${p.name ? " " + p.name : ""}, your cart is still waiting for you.</p>
<table style="width:100%;border-collapse:collapse">${rows}
<tr><td style="padding-top:8px;font-weight:600">Subtotal</td><td style="text-align:right;font-weight:600;white-space:nowrap">${pkr(p.subtotal)}</td></tr></table>
<p style="margin-top:20px"><a href="${publicSiteUrl()}/checkout" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Complete your order</a></p>`,
      }),
    };
  },

  winback(p: { name?: string }): Omit<EmailMessage, "to"> {
    return {
      subject: `We miss you, ${p.name || "friend"}`,
      text: "It's been a while since your last order. New arrivals are in — and free shipping is waiting.",
      html: shell({
        title: "We miss you",
        body: `<p>Hi ${p.name || "there"}, it's been a while.</p>
<p>We've restocked and added new products since your last order. Come take a look.</p>
<p style="margin-top:20px"><a href="${publicSiteUrl()}/products" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">Shop new arrivals</a></p>`,
      }),
    };
  },
};

export type OrderStatusPayload = OrderStatusEmailPayload;

export async function sendOrderStatusUpdateEmail(
  to: string,
  payload: OrderStatusEmailPayload
): Promise<boolean> {
  const config = await loadOrderEmailConfig();
  return deliver({ to, ...buildOrderStatusEmail({ ...payload, email: to }, config) });
}

export async function sendOrderConfirmationEmail(
  to: string,
  payload: OrderEmailPayload,
  replyTo?: string
): Promise<boolean> {
  const config = await loadOrderEmailConfig();
  return deliver({
    to,
    replyTo,
    ...buildOrderConfirmationEmail({ ...payload, email: to }, config),
  });
}

export async function sendAdminNewOrderEmail(
  to: string,
  payload: OrderEmailPayload
): Promise<boolean> {
  const dest = to.trim();
  if (!dest) return false;
  const config = await loadOrderEmailConfig();
  return deliver({
    to: dest,
    ...buildAdminNewOrderEmail({ ...payload, email: payload.email }, config),
  });
}

export async function notifyNewOrderEmails(
  customerEmail: string,
  payload: OrderEmailPayload,
  opts?: { settingsEmail?: string | null }
): Promise<NewOrderEmailResult> {
  const adminTo = notifyEmail(opts?.settingsEmail, customerEmail);
  const customerSent = await sendOrderConfirmationEmail(
    customerEmail,
    payload,
    adminTo || undefined
  );
  let adminSent = false;
  if (adminTo) {
    adminSent = await sendAdminNewOrderEmail(adminTo, { ...payload, email: customerEmail });
  }
  return { customerSent, adminSent, adminTo };
}

export { orderEmailFailureNote };

export async function sendPostPurchaseEmail(
  to: string,
  payload: OrderEmailPayload
): Promise<boolean> {
  return deliver({ to, ...emailTemplates.postPurchase(payload) });
}

export async function sendAbandonedCartEmail(
  to: string,
  payload: { name?: string; items: OrderEmailPayload["items"]; subtotal: number }
): Promise<boolean> {
  return deliver({ to, ...emailTemplates.abandonedCart(payload) });
}

export async function sendWinbackEmail(
  to: string,
  payload: { name?: string }
): Promise<boolean> {
  return deliver({ to, ...emailTemplates.winback(payload) });
}

/** Admin marketing send — one or many recipients (batched). */
export async function sendMarketingEmail(input: {
  recipients: string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<{
  sent: number;
  failed: { email: string }[];
}> {
  const html =
    input.html?.trim() ||
    shell({
      title: input.subject,
      body: `<p style="white-space:pre-wrap">${input.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`,
    });

  const failed: { email: string }[] = [];
  let sent = 0;
  const batchSize = 10;
  for (let i = 0; i < input.recipients.length; i += batchSize) {
    const batch = input.recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (to) => {
        const ok = await deliver({
          to,
          subject: input.subject,
          text: input.text,
          html,
        });
        if (ok) sent += 1;
        else failed.push({ email: to });
      })
    );
  }
  return { sent, failed };
}
