import { SHOPPER_BRAND, resolveCustomerDisplayName, shouldReplaceBrandName } from "./brand";
import { signActionUrl } from "./crypto-actions";
import type { OrderStatus } from "./types";

import { publicSiteUrl } from "./deploy-rules";
import { EMAIL_PALETTE, emailButtonHtml, emailSectionLabel } from "./email-layout";
import {
  buildOrderBillLines,
  resolveOrderSubtotal,
  type OrderBillTotals,
} from "./order-bill-rules";
import {
  applyEmailWrapper,
  emailBodyToHtml,
  interpolateEmailText,
  letterCopy,
  type OrderEmailConfig,
  type OrderEmailKind,
} from "./order-email-cms-rules";

export function resolveEmailBrandName(envBrand?: string | null): string {
  if (shouldReplaceBrandName(envBrand)) return SHOPPER_BRAND.spokenName;
  return (envBrand ?? "").trim();
}

const BRAND_NAME = resolveEmailBrandName(process.env.BRAND_NAME);

function greetingName(raw?: string | null): string {
  const display = resolveCustomerDisplayName(raw);
  return display === "Customer" ? "there" : display;
}

export interface OrderEmailPayload {
  orderId: string;
  name: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    slug?: string;
    variantName?: string;
  }[];
  total: number;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  promoCode?: string | null;
  giftWrapFee?: number;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
}

export interface OrderStatusEmailPayload {
  orderId: string;
  name: string;
  status: OrderStatus;
  note?: string;
  total?: number;
  email?: string;
  phone?: string;
  address?: string;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pkr(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

export function trackUrl(orderId: string, email: string): string {
  return `${publicSiteUrl()}/track?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`;
}

function trackButton(orderId: string, email: string, buttonColor?: string): string {
  return emailButtonHtml({
    href: trackUrl(orderId, email),
    label: "Track your order",
    color: buttonColor,
  });
}

function emailVars(p: { name?: string; orderId: string; note?: string }) {
  return {
    name: p.name || "there",
    orderId: p.orderId,
    brand: BRAND_NAME,
    note: p.note?.trim() || "",
  };
}

export function orderShell({
  title,
  body,
  footer,
  config,
  audience = "shopper",
}: {
  title: string;
  body: string;
  footer?: string;
  config?: OrderEmailConfig;
  audience?: "shopper" | "owner";
}): string {
  const foot =
    footer ??
    `You received this email from ${BRAND_NAME} because you placed an order.`;
  return applyEmailWrapper({
    theme: config?.theme,
    title,
    body,
    footer: config?.theme?.footer || foot,
    brand: BRAND_NAME,
    audience,
  });
}

function resolveSubject(
  config: OrderEmailConfig | undefined,
  kind: OrderEmailKind,
  fallback: string,
  vars: Record<string, string>
): string {
  const custom = letterCopy(config, kind).subject?.trim();
  return custom ? interpolateEmailText(custom, vars) : fallback;
}

/** Resend's documented test sender until FROM_EMAIL is a verified domain. */
export const RESEND_TEST_FROM_MAILBOX = "onboarding@resend.dev";

export function defaultFromAddress(
  brand: string,
  mailbox = RESEND_TEST_FROM_MAILBOX
): string {
  const name = brand.trim() || "Buy n Try";
  return `${name} <${mailbox}>`;
}

/** Prefer FROM_EMAIL; accept RESEND_FROM_EMAIL if that name was used in Vercel. */
export function envFromAddress(input?: {
  fromEmail?: string | null;
  resendFromEmail?: string | null;
}): string {
  const from = (input?.fromEmail ?? process.env.FROM_EMAIL ?? "").trim();
  const alias = (input?.resendFromEmail ?? process.env.RESEND_FROM_EMAIL ?? "").trim();
  return from || alias;
}

export function resolveFromAddress(input: {
  envFrom?: string | null;
  brand?: string;
}): string {
  const env = (input.envFrom ?? "").trim();
  if (env) return env;
  return defaultFromAddress(input.brand || "Buy n Try");
}

export type ResendSendInput = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
  headers?: Record<string, string>;
};

export function resendSendInput(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  bcc?: string[];
  replyTo?: string;
  headers?: Record<string, string>;
}): ResendSendInput {
  const payload: ResendSendInput = {
    from: input.from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
  };
  if (input.bcc?.length) payload.bcc = input.bcc;
  if (input.headers) payload.headers = input.headers;
  const replyTo = input.replyTo?.trim();
  if (replyTo) payload.replyTo = replyTo;
  return payload;
}

export function resolveNotifyAddress(input: {
  envNotify?: string | null;
  settingsEmail?: string | null;
  customerEmail?: string | null;
}): string {
  const env = (input.envNotify ?? "").trim();
  const settings = (input.settingsEmail ?? "").trim();
  const pick = env || settings;
  if (!pick) return "";
  const customer = (input.customerEmail ?? "").trim().toLowerCase();
  if (customer && pick.toLowerCase() === customer) return "";
  return pick;
}

export type NewOrderEmailResult = {
  customerSent: boolean;
  adminSent: boolean;
  adminTo: string;
};

export const EMAIL_SEND_ISSUE_PREFIX = "Email send issue:";

export function orderEmailFailureNote(result: NewOrderEmailResult): string | null {
  const parts: string[] = [];
  if (!result.customerSent) parts.push("customer confirmation failed");
  if (result.adminTo && !result.adminSent) parts.push("owner alert failed");
  if (!parts.length) return null;
  return `${EMAIL_SEND_ISSUE_PREFIX} ${parts.join("; ")}.`;
}

export function bccList(to: string, notifyEmail?: string | null): string[] {
  const notify = (notifyEmail ?? "").trim();
  if (!notify) return [];
  if (notify.toLowerCase() === to.trim().toLowerCase()) return [];
  return [notify];
}

function orderBillBox(p: OrderEmailPayload): string {
  const bill: OrderBillTotals = {
    orderId: p.orderId,
    items: p.items,
    subtotal: resolveOrderSubtotal(p),
    shipping: p.shipping ?? 0,
    discount: p.discount,
    promoCode: p.promoCode,
    giftWrapFee: p.giftWrapFee,
    total: p.total,
  };
  const itemRows = p.items
    .map((i) => {
      const label = `${escapeHtml(i.name ?? "")}${
        i.variantName ? ` — ${escapeHtml(i.variantName)}` : ""
      }`;
      return `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${EMAIL_PALETTE.line};font-size:14px;color:${EMAIL_PALETTE.ink}">${label}<br><span style="font-size:12px;color:${EMAIL_PALETTE.muted}">Qty ${i.quantity}</span></td>
<td style="padding:12px 0;border-bottom:1px solid ${EMAIL_PALETTE.line};text-align:right;white-space:nowrap;font-size:14px;font-weight:600;color:${EMAIL_PALETTE.forest};vertical-align:top">${pkr(
        (i.price ?? 0) * (i.quantity ?? 1)
      )}</td>
</tr>`;
    })
    .join("");

  const summaryRows = buildOrderBillLines(bill)
    .map((line) => {
      const amountLabel =
        line.free && line.amount === 0
          ? "Free"
          : line.amount < 0
            ? `− ${pkr(Math.abs(line.amount))}`
            : pkr(line.amount);
      const color =
        line.tone === "deal"
          ? EMAIL_PALETTE.forestMid
          : line.tone === "strong"
            ? EMAIL_PALETTE.forest
            : EMAIL_PALETTE.ink;
      const weight = line.tone === "strong" ? "700" : line.tone === "deal" ? "600" : "500";
      const size = line.tone === "strong" ? "16px" : "13px";
      const pad = line.key === "total" ? "14px 0 0" : "8px 0";
      const border =
        line.key === "total"
          ? `border-top:1px solid ${EMAIL_PALETTE.line};`
          : "";
      return `<tr>
<td style="padding:${pad};${border}font-size:${size};font-weight:${weight};color:${color}">${escapeHtml(
        line.label
      )}</td>
<td style="padding:${pad};${border}text-align:right;white-space:nowrap;font-size:${size};font-weight:${weight};color:${color}">${amountLabel}</td>
</tr>`;
    })
    .join("");

  return `${emailSectionLabel("Order bill")}
<p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:${EMAIL_PALETTE.forest}">${escapeHtml(
    p.orderId
  )}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 8px">${itemRows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 0;background:${EMAIL_PALETTE.sand};border:1px solid ${EMAIL_PALETTE.line};border-radius:12px">
<tr><td style="padding:14px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${summaryRows}</table>
</td></tr></table>`;
}

export function buildAdminNewOrderEmail(
  p: OrderEmailPayload,
  config?: OrderEmailConfig
): BuiltEmail {
  const displayName = resolveCustomerDisplayName(p.name);
  const name = escapeHtml(displayName);
  const vars = emailVars({ name: displayName, orderId: p.orderId });
  const custom = letterCopy(config, "owner").body?.trim();
  const origin = publicSiteUrl();
  const emailHref = p.email ? `mailto:${escapeHtml(p.email)}` : "";
  const phoneHref = p.phone ? `tel:${escapeHtml(p.phone.replace(/[^\d+]/g, ""))}` : "";
  const addressLine = [p.address, p.city, p.postal].filter(Boolean).join(", ");
  const contact = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${EMAIL_PALETTE.sand};border:1px solid ${EMAIL_PALETTE.line};border-radius:14px"><tr><td style="padding:18px 20px">
${emailSectionLabel("Customer")}
<p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:${EMAIL_PALETTE.forest}">${name}</p>
${
  p.email
    ? `<p style="margin:0 0 6px;font-size:14px"><a href="${emailHref}" style="color:${EMAIL_PALETTE.forest};text-decoration:none">${escapeHtml(
        p.email
      )}</a></p>`
    : ""
}
${
  p.phone
    ? `<p style="margin:0 0 6px;font-size:14px"><a href="${phoneHref}" style="color:${EMAIL_PALETTE.forest};text-decoration:none">${escapeHtml(
        p.phone
      )}</a></p>`
    : ""
}
${
  addressLine
    ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${EMAIL_PALETTE.muted}">${escapeHtml(
        addressLine
      )}</p>`
    : ""
}
</td></tr></table>`;
  const intro = custom
    ? `${emailBodyToHtml(custom, vars)}${contact}`
    : `${emailSectionLabel("Payment")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td style="background:${EMAIL_PALETTE.forest};border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:${EMAIL_PALETTE.white}">CASH ON DELIVERY</td></tr></table>
<p style="margin:0 0 20px">A customer just placed a cash-on-delivery order. Confirm the details below, then pack and dispatch.</p>
${contact}`;

  const shipUrl = signActionUrl(p.orderId, "shipped");
  const cancelUrl = signActionUrl(p.orderId, "cancelled");

  const body = `${intro}${orderBillBox(p)}
<div style="margin:24px 0;padding:20px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:12px;text-align:left">
  <p style="margin:0 0 16px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;color:#991b1b;letter-spacing:1px">🚨 EXPRESS ACTIONS</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-bottom:12px;">
        ${emailButtonHtml({ href: shipUrl, label: "MARK AS SHIPPED" })}
      </td>
    </tr>
    <tr>
      <td>
        ${emailButtonHtml({ href: cancelUrl, label: "CANCEL ORDER", color: "#64748b" })}
      </td>
    </tr>
  </table>
</div>
<div style="margin-top:24px;text-align:center">
  ${emailButtonHtml({
    href: `${origin}/admin/orders/${encodeURIComponent(p.orderId)}`,
    label: "Open Dashboard",
    color: EMAIL_PALETTE.ink,
  })}
</div>`;
  const title = letterCopy(config, "owner").title?.trim() || "New customer order";

  return {
    subject: resolveSubject(
      config,
      "owner",
      `${BRAND_NAME} — New order ${p.orderId}`,
      vars
    ),
    text: `New COD order ${p.orderId} from ${displayName} (${p.email || ""}). Total ${pkr(p.total)}.`,
    html: orderShell({
      title,
      body,
      footer: `You received this email from ${BRAND_NAME} because a customer placed an order.`,
      config,
      audience: "owner",
    }),
  };
}

export function buildOrderConfirmationEmail(
  p: OrderEmailPayload,
  config?: OrderEmailConfig
): BuiltEmail {
  const name = escapeHtml(greetingName(p.name));
  const vars = emailVars({ name: greetingName(p.name), orderId: p.orderId });
  const custom = letterCopy(config, "confirmed").body?.trim();
  const intro = custom
    ? emailBodyToHtml(custom, vars)
    : `<p style="margin:0 0 14px">Hi ${name}, thank you — ${BRAND_NAME} has your order.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td style="background:${EMAIL_PALETTE.forest};border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:${EMAIL_PALETTE.white}">PAY CASH ON DELIVERY</td></tr></table>
<p style="margin:0 0 20px">Please check the items and the address. If anything looks wrong, reply to this email before we dispatch.</p>`;

  const addressBits = [p.address, [p.city, p.postal].filter(Boolean).join(" "), p.phone].filter(
    (part) => Boolean(part && String(part).trim())
  ) as string[];
  const addressHtml = addressBits.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background:${EMAIL_PALETTE.sand};border:1px solid ${EMAIL_PALETTE.line};border-radius:14px"><tr><td style="padding:18px 20px">
${emailSectionLabel("Deliver to")}
<p style="margin:0;font-size:15px;line-height:1.55;color:${EMAIL_PALETTE.ink}">${addressBits
        .map((b) => escapeHtml(b))
        .join("<br>")}</p>
</td></tr></table>`
    : "";

  const body = `${intro}${orderBillBox(p)}
${addressHtml}
${p.email ? trackButton(p.orderId, p.email, config?.theme?.button) : ""}
<p style="margin:20px 0 0;font-size:13px;color:${EMAIL_PALETTE.muted}">A real person at ${BRAND_NAME} packed this catalogue. WhatsApp or email us if you want to change the address before it ships.</p>`;

  return {
    subject: resolveSubject(
      config,
      "confirmed",
      `${BRAND_NAME} — Order ${p.orderId} confirmed`,
      vars
    ),
    text: `Hi ${greetingName(p.name)}, we have your order ${p.orderId}. Total ${pkr(
      p.total
    )}. Pay cash on delivery. Track: ${p.email ? trackUrl(p.orderId, p.email) : ""}`,
    html: orderShell({
      title: letterCopy(config, "confirmed").title?.trim() || "Order confirmed",
      body,
      config,
    }),
  };
}

const STATUS_COPY: Record<
  OrderStatus,
  { title: string; subject: string; body: string }
> = {
  new: {
    title: "Order received",
    subject: "Your order is confirmed",
    body: `<p style="margin:0 0 12px">Hi {name}, your order <strong>{orderId}</strong> is confirmed.</p>`,
  },
  processing: {
    title: "We're packing your order",
    subject: "We're packing your order",
    body: `<p style="margin:0 0 12px">Hi {name}, your order <strong>{orderId}</strong> is being packed.</p>
<p style="margin:0">We'll email you again when it ships.</p>`,
  },
  shipped: {
    title: "Your order is on the way",
    subject: "Your order is on the way",
    body: `<p style="margin:0 0 12px">Hi {name}, your order <strong>{orderId}</strong> has shipped.</p>
<p style="margin:0">It's on its way to the address you gave at checkout.</p>`,
  },
  delivered: {
    title: "Your order has arrived",
    subject: "Your order has been delivered",
    body: `<p style="margin:0 0 12px">Hi {name}, your order <strong>{orderId}</strong> has been delivered.</p>
<p style="margin:0">If anything isn't right, reply to this email and we'll help.</p>`,
  },
  cancelled: {
    title: "Your order was cancelled",
    subject: "Your order was cancelled",
    body: `<p style="margin:0 0 12px">Hi {name}, your order <strong>{orderId}</strong> has been cancelled.</p>
<p style="margin:0">This was cash on delivery, so nothing was charged. If this was a mistake, reply to this email.</p>`,
  },
};

function statusKind(status: OrderStatus): OrderEmailKind {
  if (status === "processing" || status === "shipped" || status === "delivered" || status === "cancelled") {
    return status;
  }
  return "confirmed";
}

export function buildOrderStatusEmail(
  p: OrderStatusEmailPayload,
  config?: OrderEmailConfig
): BuiltEmail {
  const copy = STATUS_COPY[p.status];
  const kind = statusKind(p.status);
  const vars = emailVars({ name: greetingName(p.name), orderId: p.orderId, note: p.note });
  const custom = letterCopy(config, kind).body?.trim();
  const note = p.note?.trim();
  let body = custom
    ? emailBodyToHtml(custom, vars)
    : copy.body
        .replaceAll("{name}", escapeHtml(greetingName(p.name)))
        .replaceAll("{orderId}", escapeHtml(p.orderId));
  if (note) {
    body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:${EMAIL_PALETTE.sand};border-left:4px solid ${EMAIL_PALETTE.gold};border-radius:0 12px 12px 0"><tr><td style="padding:14px 16px;font-size:14px;color:${EMAIL_PALETTE.ink}">${escapeHtml(
      note
    )}</td></tr></table>`;
  }
  if (p.email) body += trackButton(p.orderId, p.email, config?.theme?.button);

  return {
    subject: resolveSubject(config, kind, `${copy.subject} · ${p.orderId}`, vars),
    text: `Hi ${greetingName(p.name)}, your order ${p.orderId} is now: ${p.status}.${
      note ? ` Note: ${note}` : ""
    }${p.email ? ` Track: ${trackUrl(p.orderId, p.email)}` : ""}`,
    html: orderShell({
      title: letterCopy(config, kind).title?.trim() || copy.title,
      body,
      config,
    }),
  };
}
