import { applyPremiumEmailChrome, resolveEmailLogoUrl } from "./email-layout";

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
  audience?: "shopper" | "owner";
}): string {
  const wrapper = input.theme?.wrapperHtml?.trim() ?? "";
  const title = escapeEmailHtml(input.title);
  const logoSrc = resolveEmailLogoUrl(input.theme?.logo);
  if (wrapperHtmlIsUsable(wrapper)) {
    const logo = `<img src="${escapeEmailHtml(logoSrc)}" alt="${escapeEmailHtml(
      input.brand
    )}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;border:2px solid #c9a227" />`;
    return wrapper
      .replaceAll("{{title}}", title)
      .replaceAll("{{body}}", input.body)
      .replaceAll("{{brand}}", escapeEmailHtml(input.brand))
      .replaceAll("{{footer}}", escapeEmailHtml(input.footer))
      .replaceAll("{{logo}}", logo);
  }
  return applyPremiumEmailChrome({
    title: input.title,
    body: input.body,
    footer: input.footer,
    brand: input.brand,
    logo: input.theme?.logo,
    background: input.theme?.background,
    card: input.theme?.card,
    text: input.theme?.text,
    header: input.theme?.header,
    audience: input.audience,
  });
}
