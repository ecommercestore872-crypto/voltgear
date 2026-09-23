import { SHOPPER_BRAND } from "@/lib/brand";
import type { Order, OrderItem, SiteSettings } from "@/lib/types";

export type InvoiceTemplate = {
  documentTitle: string;
  accent: string;
  footer: string;
  notes: string;
  logoUrl: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
};

/** Code-level invoice template. Backend fields overlay this when set. */
export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = {
  documentTitle: "Invoice",
  accent: "#1F3626",
  footer: "Thank you for your order.",
  notes: "",
  logoUrl: "",
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  companyWebsite: "",
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function str(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function color(raw: unknown, fallback: string): string {
  const value = str(raw);
  return HEX.test(value) ? value : fallback;
}

export function parseInvoiceTemplate(raw: unknown): Partial<InvoiceTemplate> {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const next: Partial<InvoiceTemplate> = {};
  const documentTitle = str(rec.documentTitle);
  const accent = str(rec.accent);
  const footer = str(rec.footer);
  const notes = str(rec.notes);
  const logoUrl = str(rec.logoUrl);
  const companyName = str(rec.companyName);
  const companyEmail = str(rec.companyEmail);
  const companyPhone = str(rec.companyPhone);
  const companyAddress = str(rec.companyAddress);
  const companyWebsite = str(rec.companyWebsite);
  if (documentTitle) next.documentTitle = documentTitle.slice(0, 40);
  if (accent && HEX.test(accent)) next.accent = accent;
  if (footer) next.footer = footer.slice(0, 180);
  if (notes) next.notes = notes.slice(0, 240);
  if (logoUrl) next.logoUrl = logoUrl.slice(0, 500);
  if (companyName) next.companyName = companyName.slice(0, 80);
  if (companyEmail) next.companyEmail = companyEmail.slice(0, 120);
  if (companyPhone) next.companyPhone = companyPhone.slice(0, 40);
  if (companyAddress) next.companyAddress = companyAddress.slice(0, 160);
  if (companyWebsite) next.companyWebsite = companyWebsite.slice(0, 120);
  return next;
}

export function mergeInvoiceTemplate(raw: unknown): InvoiceTemplate {
  const overlay = parseInvoiceTemplate(raw);
  return {
    ...DEFAULT_INVOICE_TEMPLATE,
    ...overlay,
    accent: color(overlay.accent, DEFAULT_INVOICE_TEMPLATE.accent),
  };
}

/** Backend should store only fields that differ from the code template. */
export function invoiceTemplateOverrides(raw: unknown): Partial<InvoiceTemplate> {
  const parsed = parseInvoiceTemplate(raw);
  const out: Partial<InvoiceTemplate> = {};
  (Object.keys(parsed) as (keyof InvoiceTemplate)[]).forEach((key) => {
    const value = parsed[key];
    if (value && value !== DEFAULT_INVOICE_TEMPLATE[key]) out[key] = value;
  });
  return out;
}

export type InvoiceIdentity = {
  name: string;
  logo: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
};

export function resolveInvoiceIdentity(
  template: InvoiceTemplate,
  settings?: Pick<SiteSettings, "brandName" | "logo" | "email" | "phone" | "address"> | null
): InvoiceIdentity {
  return {
    name: template.companyName || settings?.brandName?.trim() || SHOPPER_BRAND.spokenName,
    logo: template.logoUrl || settings?.logo?.trim() || null,
    email: template.companyEmail || settings?.email?.trim() || null,
    phone: template.companyPhone || settings?.phone?.trim() || null,
    address: template.companyAddress || settings?.address?.trim() || null,
    website: template.companyWebsite || null,
  };
}

export type InvoiceLine = {
  name: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function invoiceLineTotal(item: OrderItem): number {
  if (typeof item.lineTotal === "number" && Number.isFinite(item.lineTotal)) {
    return Math.max(0, item.lineTotal);
  }
  const qty = Number.isFinite(item.quantity) ? Number(item.quantity) : 1;
  const price = Number.isFinite(item.price) ? Number(item.price) : 0;
  return Math.max(0, price * Math.max(1, qty));
}

export function invoiceLines(items: OrderItem[] | undefined): InvoiceLine[] {
  return (items ?? []).map((item) => {
    const quantity = Math.max(1, Number.isFinite(item.quantity) ? Number(item.quantity) : 1);
    const lineTotal = invoiceLineTotal(item);
    return {
      name: (item.name || "Item").trim(),
      variant: item.variantName?.trim() || null,
      quantity,
      unitPrice: quantity ? lineTotal / quantity : lineTotal,
      lineTotal,
    };
  });
}

export function invoiceTotals(order: Pick<Order, "items" | "subtotal" | "shipping" | "total">) {
  const lines = invoiceLines(order.items);
  const itemsSum = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping =
    typeof order.shipping === "number" && Number.isFinite(order.shipping)
      ? Math.max(0, order.shipping)
      : 0;
  const subtotal =
    typeof order.subtotal === "number" && Number.isFinite(order.subtotal)
      ? Math.max(0, order.subtotal)
      : itemsSum;
  const total =
    typeof order.total === "number" && Number.isFinite(order.total)
      ? Math.max(0, order.total)
      : subtotal + shipping;
  return {
    lines,
    subtotal,
    shipping,
    total,
    showSubtotal: shipping > 0 || Math.abs(total - subtotal) >= 1,
  };
}

export function isInvoicePath(pathname: string): boolean {
  return /\/order\/[^/]+\/invoice\/?$/.test(pathname);
}

export function invoiceFileTitle(orderId: string): string {
  const safe = orderId.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
  return `Invoice-${safe || "order"}`;
}
