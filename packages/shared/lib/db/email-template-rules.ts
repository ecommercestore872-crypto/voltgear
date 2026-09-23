export type EmailTemplateInput = {
  name: string;
  subject: string;
  bodyText: string;
};

export function validateEmailTemplate(input: {
  name?: unknown;
  subject?: unknown;
  bodyText?: unknown;
  text?: unknown;
}): { ok: true; data: EmailTemplateInput } | { ok: false; error: string } {
  const name = String(input.name ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const bodyText = String(input.bodyText ?? input.text ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 80) return { ok: false, error: "Name is too long." };
  if (subject.length > 200) return { ok: false, error: "Subject is too long." };
  if (bodyText.length > 20_000) return { ok: false, error: "Body is too long." };
  return { ok: true, data: { name, subject, bodyText } };
}
