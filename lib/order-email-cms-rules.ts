export type OrderEmailKind =
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "owner";

export type OrderEmailCopy = {
  subject?: string;
  body?: string;
  title?: string;
};

export type OrderEmailTheme = {
  logo?: string;
  background?: string;
  card?: string;
  text?: string;
  button?: string;
  header?: string;
  footer?: string;
  wrapperHtml?: string;
};

export type OrderEmailConfig = {
  theme?: OrderEmailTheme;
  letters?: Partial<Record<OrderEmailKind, OrderEmailCopy>>;
};

export const ORDER_EMAIL_KINDS: { kind: OrderEmailKind; label: string }[] = [
  { kind: "confirmed", label: "Order confirmed" },
  { kind: "processing", label: "Processing" },
  { kind: "shipped", label: "Shipped" },
  { kind: "delivered", label: "Delivered" },
  { kind: "cancelled", label: "Cancelled" },
  { kind: "owner", label: "Owner — new order" },
];

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function interpolateEmailText(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function emailBodyToHtml(text: string, vars: Record<string, string>): string {
  const filled = interpolateEmailText(text, vars).trim();
  if (!filled) return "";
  return filled
    .split(/\n{2,}/)
    .map((block) => {
      const html = escapeEmailHtml(block).replaceAll("\n", "<br>");
      return `<p style="margin:0 0 12px">${html}</p>`;
    })
    .join("");
}

export function wrapperHtmlIsUsable(html: string): boolean {
  return html.includes("{{title}}") && html.includes("{{body}}");
}

export function parseOrderEmailConfig(raw: unknown): OrderEmailConfig {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const themeRaw = rec.theme && typeof rec.theme === "object" ? (rec.theme as Record<string, unknown>) : {};
  const theme: OrderEmailTheme = {};
  for (const key of [
    "logo",
    "background",
    "card",
    "text",
    "button",
    "header",
    "footer",
    "wrapperHtml",
  ] as const) {
    if (typeof themeRaw[key] === "string" && themeRaw[key].trim()) {
      theme[key] = themeRaw[key].trim();
    }
  }
  const letters: OrderEmailConfig["letters"] = {};
  const lettersRaw = rec.letters && typeof rec.letters === "object" ? (rec.letters as Record<string, unknown>) : {};
  for (const { kind } of ORDER_EMAIL_KINDS) {
    const row = lettersRaw[kind];
    if (!row || typeof row !== "object") continue;
    const copy = row as Record<string, unknown>;
    const next: OrderEmailCopy = {};
    if (typeof copy.subject === "string") next.subject = copy.subject;
    if (typeof copy.body === "string") next.body = copy.body;
    if (typeof copy.title === "string") next.title = copy.title;
    if (next.subject != null || next.body != null || next.title != null) letters[kind] = next;
  }
  return {
    ...(Object.keys(theme).length ? { theme } : {}),
    ...(Object.keys(letters).length ? { letters } : {}),
  };
}

export function letterCopy(
  config: OrderEmailConfig | undefined,
  kind: OrderEmailKind
): OrderEmailCopy {
  return config?.letters?.[kind] ?? {};
}

export function applyEmailWrapper(input: {
  theme?: OrderEmailTheme;
  title: string;
  body: string;
  footer: string;
  brand: string;
}): string {
  const wrapper = input.theme?.wrapperHtml?.trim() ?? "";
  const title = escapeEmailHtml(input.title);
  if (wrapperHtmlIsUsable(wrapper)) {
    const logo = input.theme?.logo
      ? `<img src="${escapeEmailHtml(input.theme.logo)}" alt="${escapeEmailHtml(input.brand)}" style="max-height:40px;max-width:180px" />`
      : "";
    return wrapper
      .replaceAll("{{title}}", title)
      .replaceAll("{{body}}", input.body)
      .replaceAll("{{brand}}", escapeEmailHtml(input.brand))
      .replaceAll("{{footer}}", escapeEmailHtml(input.footer))
      .replaceAll("{{logo}}", logo);
  }
  const bg = input.theme?.background || "#f4f4f5";
  const card = input.theme?.card || "#ffffff";
  const text = input.theme?.text || "#27272a";
  const header = input.theme?.header || input.brand;
  const logo = input.theme?.logo
    ? `<p style="margin:0 0 12px"><img src="${escapeEmailHtml(input.theme.logo)}" alt="${escapeEmailHtml(input.brand)}" style="max-height:40px;max-width:180px" /></p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:16px;background:${escapeEmailHtml(bg)};color:#18181b;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:${escapeEmailHtml(card)};border:1px solid #e4e4e7;border-radius:12px;padding:24px">
${logo}
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#71717a">${escapeEmailHtml(
    header
  )}</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${title}</h1>
<div style="font-size:15px;line-height:1.6;color:${escapeEmailHtml(text)}">${input.body}</div>
<p style="margin:28px 0 0;font-size:12px;color:#71717a">${escapeEmailHtml(input.footer)}</p>
</div></body></html>`;
}
