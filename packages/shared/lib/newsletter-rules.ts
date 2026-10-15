export function newsletterCsv(
  rows: { email: string; source: string; createdAt: string }[]
): string {
  const escape = (value: string) => {
    const raw = String(value ?? "");
    // Prevent spreadsheet formula execution when an exported CSV is opened.
    const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const lines = ["email,source,joined"];
  for (const row of rows) {
    lines.push([escape(row.email), escape(row.source), escape(row.createdAt)].join(","));
  }
  return `${lines.join("\n")}\n`;
}

export function normalizeNewsletterEmail(raw: unknown):
  | { ok: true; email: string }
  | { ok: false; error: string } {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email)) {
    return { ok: false, error: "Valid email required" };
  }
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > 64 || !domain || domain.startsWith(".") || domain.endsWith(".")) {
    return { ok: false, error: "Valid email required" };
  }
  return { ok: true, email };
}

export function normalizeNewsletterSource(raw: unknown): string {
  const source = String(raw ?? "footer").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,31}$/.test(source) ? source : "other";
}

export function safeWebhookText(raw: unknown, maxLength: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .trim()
    .slice(0, maxLength);
}
