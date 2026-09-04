export function newsletterCsv(
  rows: { email: string; source: string; createdAt: string }[]
): string {
  const escape = (value: string) => {
    const text = String(value ?? "");
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
  if (!email || !email.includes("@") || email.length > 320) {
    return { ok: false, error: "Valid email required" };
  }
  const [local, domain] = email.split("@");
  if (!local || !domain || !domain.includes(".")) {
    return { ok: false, error: "Valid email required" };
  }
  return { ok: true, email };
}
