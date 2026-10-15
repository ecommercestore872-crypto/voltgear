/**
 * Email delivery abstraction.
 *
 * Provider: Resend. Set RESEND_API_KEY + FROM_EMAIL.
 * ORDER_NOTIFY_EMAIL: separate owner “new order” email + Reply-To (optional).
 * Without a key, emails are logged to the console (dev mode).
 */

import { fetchSiteSettings } from "@/lib/db/store";
import { publicSiteUrl } from "@/lib/deploy-rules";

import {
  buildAdminNewOrderEmail,
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  orderEmailFailureNote,
  type NewOrderEmailResult,
  type OrderEmailPayload,
  type OrderStatusEmailPayload,
} from "@/lib/email-rules";
import { resolveCustomerDisplayName } from "@/lib/brand";
import { applyPremiumEmailChrome, EMAIL_PALETTE, emailButtonHtml } from "@/lib/email-layout";
import { escapeEmailHtml, type OrderEmailConfig } from "@/lib/order-email-cms-rules";
import {
  deliverEmail,
  EMAIL_BRAND_NAME,
  resolveNotificationEmail,
  type EmailMessage,
} from "@/lib/email-delivery";

export type { OrderEmailPayload, OrderStatusEmailPayload };
export { buildOrderConfirmationEmail, buildOrderStatusEmail, buildAdminNewOrderEmail };

const BRAND_NAME = EMAIL_BRAND_NAME;

function shopperFirstName(raw?: string | null): string {
  const display = resolveCustomerDisplayName(raw);
  return display === "Customer" ? "there" : display;
}

function pkr(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
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

/** Shared shop chrome — order letters, review, cart, win-back, and marketing. */
function shell({ title, body, footer }: { title: string; body: string; footer?: string }): string {
  return applyPremiumEmailChrome({
    title,
    body,
    footer:
      footer ||
      `You received this email from ${BRAND_NAME}. ${BRAND_NAME}, Pakistan · cash on delivery.`,
    brand: BRAND_NAME,
  });
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
    const name = escapeEmailHtml(shopperFirstName(p.name));
    return {
      subject: `How did ${first?.name ?? "your order"} work out?`,
      text: `Hi ${p.name}, we hope you're enjoying your order. We'd love your feedback — reviews help other shoppers decide with confidence.`,
      html: shell({
        title: "How did it feel at home?",
        body: `<p style="margin:0 0 12px">Hi ${name}, we hope you're enjoying your ${escapeEmailHtml(
          BRAND_NAME
        )} order.</p>
<p style="margin:0 0 8px">A short review — even one line — helps the next shopper try with confidence. You can attach a photo of the product as it arrived.</p>
${emailButtonHtml({ href: reviewUrl, label: "Write a review" })}`,
      }),
    };
  },

  abandonedCart(p: {
    name?: string;
    items: { name: string; price: number; quantity: number }[];
    subtotal: number;
  }): Omit<EmailMessage, "to"> {
    const name = p.name?.trim() ? escapeEmailHtml(shopperFirstName(p.name)) : "";
    const rows = p.items
      .map(
        (i) =>
          `<tr><td style="padding:12px 0;border-bottom:1px solid ${EMAIL_PALETTE.line}">${escapeEmailHtml(
            i.name
          )} × ${i.quantity}</td><td style="padding:12px 0;border-bottom:1px solid ${EMAIL_PALETTE.line};text-align:right;color:${EMAIL_PALETTE.forest};white-space:nowrap;font-weight:600">${pkr(
            i.price * i.quantity
          )}</td></tr>`
      )
      .join("");
    return {
      subject: `Your ${BRAND_NAME} cart is waiting`,
      text: `Hi${p.name ? " " + p.name : ""}, you left items in your cart. Your order is ready whenever you are.`,
      html: shell({
        title: "Your cart is still waiting",
        body: `<p style="margin:0 0 16px">Hi${name ? " " + name : ""}, you were a few taps from cash on delivery. The items are still reserved in your cart.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${rows}
<tr><td style="padding-top:14px;font-weight:700">Subtotal</td><td style="padding-top:14px;text-align:right;font-weight:700;white-space:nowrap;color:${EMAIL_PALETTE.forest}">${pkr(p.subtotal)}</td></tr></table>
${emailButtonHtml({ href: `${publicSiteUrl()}/checkout`, label: "Complete your order" })}`,
      }),
    };
  },

  winback(p: { name?: string }): Omit<EmailMessage, "to"> {
    const name = escapeEmailHtml(shopperFirstName(p.name));
    return {
      subject: `We miss you, ${p.name || "friend"}`,
      text: "It's been a while since your last order. New arrivals are in — and cash on delivery is still waiting.",
      html: shell({
        title: "We kept a place for you",
        body: `<p style="margin:0 0 12px">Hi ${name}, it's been a while.</p>
<p style="margin:0 0 8px">New watches, audio, and chargers are in. Pay cash on delivery — try it at home, same as last time.</p>
${emailButtonHtml({ href: `${publicSiteUrl()}/products`, label: "Shop new arrivals" })}`,
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
  return deliverEmail({ to, ...buildOrderStatusEmail({ ...payload, email: to }, config) }, "orderStatus");
}

export async function sendOrderConfirmationEmail(
  to: string,
  payload: OrderEmailPayload,
  replyTo?: string
): Promise<boolean> {
  const config = await loadOrderEmailConfig();
  return deliverEmail(
    {
      to,
      replyTo,
      ...buildOrderConfirmationEmail({ ...payload, email: to }, config),
    },
    "orderConfirmation"
  );
}

export async function sendAdminNewOrderEmail(
  to: string,
  payload: OrderEmailPayload
): Promise<boolean> {
  const dest = to.trim();
  if (!dest) return false;
  const config = await loadOrderEmailConfig();
  return deliverEmail(
    {
      to: dest,
      ...buildAdminNewOrderEmail({ ...payload, email: payload.email }, config),
    },
    "ownerNewOrder"
  );
}

export async function notifyNewOrderEmails(
  customerEmail: string,
  payload: OrderEmailPayload,
  opts?: { settingsEmail?: string | null }
): Promise<NewOrderEmailResult> {
  const adminTo = resolveNotificationEmail(opts?.settingsEmail, customerEmail);
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
  return deliverEmail({ to, ...emailTemplates.postPurchase(payload) }, "reviewRequest");
}

export async function sendAbandonedCartEmail(
  to: string,
  payload: { name?: string; items: OrderEmailPayload["items"]; subtotal: number }
): Promise<boolean> {
  return deliverEmail({ to, ...emailTemplates.abandonedCart(payload) }, "abandonedCart");
}

export async function sendWinbackEmail(
  to: string,
  payload: { name?: string }
): Promise<boolean> {
  return deliverEmail({ to, ...emailTemplates.winback(payload) }, "winback");
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
    const outcomes = await Promise.all(
      batch.map(async (to) => {
        const ok = await deliverEmail(
          {
            to,
            subject: input.subject,
            text: input.text,
            html,
          },
          "marketing"
        );
        return { to, ok };
      })
    );
    for (const outcome of outcomes) {
      if (outcome.ok) sent += 1;
      else failed.push({ email: outcome.to });
    }
  }
  return { sent, failed };
}
