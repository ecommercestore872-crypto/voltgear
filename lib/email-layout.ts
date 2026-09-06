import { SHOPPER_BRAND } from "./brand";
import { publicSiteUrl } from "./deploy-rules";

/** Forest / gold / cream — matches the BNT seal on the live shop. */
export const EMAIL_PALETTE = {
  forest: "#1b3624",
  forestMid: "#234a32",
  gold: "#c9a227",
  cream: "#f6efe3",
  sand: "#fffaf3",
  card: "#ffffff",
  ink: "#1a1a1a",
  muted: "#5c564c",
  line: "#e6d9c4",
  white: "#f7efe2",
} as const;

export type EmailAudience = "shopper" | "owner";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resolveEmailLogoUrl(
  themeLogo?: string | null,
  origin = publicSiteUrl()
): string {
  const base = origin.replace(/\/+$/, "");
  const custom = (themeLogo ?? "").trim();
  if (/^https?:\/\//i.test(custom)) return custom;
  if (custom.startsWith("//")) return `https:${custom}`;
  if (custom.startsWith("/")) return `${base}${custom}`;
  if (custom) return `${base}/${custom}`;
  return `${base}${SHOPPER_BRAND.sealSrc}`;
}

export function emailButtonHtml(input: {
  href: string;
  label: string;
  color?: string;
}): string {
  const bg = (input.color || EMAIL_PALETTE.forest).trim() || EMAIL_PALETTE.forest;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0"><tr><td style="border-radius:999px;background:${escapeHtml(
    bg
  )}"><a href="${escapeHtml(
    input.href
  )}" style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:700;letter-spacing:0.02em;color:${
    EMAIL_PALETTE.white
  };text-decoration:none;border-radius:999px">${escapeHtml(input.label)}</a></td></tr></table>`;
}

export function emailSectionLabel(label: string): string {
  return `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${EMAIL_PALETTE.gold}">${escapeHtml(
    label
  )}</p>`;
}

export function applyPremiumEmailChrome(input: {
  title: string;
  body: string;
  footer: string;
  brand: string;
  origin?: string;
  logo?: string | null;
  background?: string;
  card?: string;
  text?: string;
  header?: string;
  audience?: EmailAudience;
}): string {
  const origin = (input.origin || publicSiteUrl()).replace(/\/+$/, "");
  const brand = input.brand.trim() || SHOPPER_BRAND.spokenName;
  const logo = resolveEmailLogoUrl(input.logo, origin);
  const bg = input.background || EMAIL_PALETTE.cream;
  const card = input.card || EMAIL_PALETTE.card;
  const text = input.text || EMAIL_PALETTE.ink;
  const kicker = input.header?.trim() || brand;
  const owner = input.audience === "owner";
  const trust = owner
    ? "Internal order alert · Cash on delivery · Pakistan"
    : "Cash on delivery · Try it at home · Easy returns";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${escapeHtml(
    input.title
  )}</title></head>
<body style="margin:0;padding:0;background:${escapeHtml(bg)};color:${escapeHtml(
    text
  )};font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${escapeHtml(
    bg
  )}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate">
<tr><td style="background:${EMAIL_PALETTE.forest};padding:28px 32px 24px;border-radius:18px 18px 0 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding:0 14px 0 0">
<img src="${escapeHtml(logo)}" width="56" height="56" alt="${escapeHtml(
    brand
  )}" style="display:block;width:56px;height:56px;border-radius:50%;border:2px solid ${EMAIL_PALETTE.gold};background:${EMAIL_PALETTE.forest}" />
</td>
<td style="vertical-align:middle">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:${EMAIL_PALETTE.white};letter-spacing:0.01em">${escapeHtml(
    brand
  )}</p>
<p style="margin:4px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_PALETTE.gold}">${escapeHtml(
    SHOPPER_BRAND.tagline
  )} · Cash on delivery</p>
</td>
</tr></table>
</td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${EMAIL_PALETTE.gold}">&nbsp;</td></tr>
<tr><td style="background:${escapeHtml(card)};padding:32px 32px 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${EMAIL_PALETTE.gold}">${escapeHtml(
    owner ? "Staff alert" : kicker
  )}</p>
<h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:700;color:${EMAIL_PALETTE.forest}">${escapeHtml(
    input.title
  )}</h1>
<div style="font-size:15px;line-height:1.65;color:${escapeHtml(text)}">${input.body}</div>
</td></tr>
<tr><td style="background:${EMAIL_PALETTE.sand};padding:16px 32px;border-top:1px solid ${EMAIL_PALETTE.line};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:0.04em;color:${EMAIL_PALETTE.muted};text-align:center">${escapeHtml(
    trust
  )}</td></tr>
<tr><td style="background:${EMAIL_PALETTE.forest};padding:22px 32px 26px;border-radius:0 0 18px 18px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:${EMAIL_PALETTE.white}">${escapeHtml(
    input.footer
  )}</p>
<p style="margin:0;font-size:12px;line-height:1.8">
<a href="${escapeHtml(origin)}" style="color:${EMAIL_PALETTE.gold};text-decoration:none">Shop ${escapeHtml(
    brand
  )}</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(origin)}/track" style="color:${EMAIL_PALETTE.gold};text-decoration:none">Track an order</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(origin)}/contact" style="color:${EMAIL_PALETTE.gold};text-decoration:none">WhatsApp &amp; email support</a>
&nbsp;·&nbsp;
<a href="${escapeHtml(origin)}/warranty" style="color:${EMAIL_PALETTE.gold};text-decoration:none">Warranty</a>
</p>
<p style="margin:14px 0 0;font-size:11px;color:#b7c4b6">${escapeHtml(origin.replace(/^https?:\/\//, ""))} · Pakistan · Pay when it arrives</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
