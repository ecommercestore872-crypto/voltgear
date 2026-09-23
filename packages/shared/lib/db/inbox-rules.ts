export type InboxKind = "contact" | "complaint";
export type InboxStatus = "new" | "read" | "closed";

export function parseInboxKind(raw: unknown): InboxKind {
  return raw === "complaint" ? "complaint" : "contact";
}

export function parseInboxStatus(raw: unknown): InboxStatus | null {
  if (raw === "new" || raw === "read" || raw === "closed") return raw;
  return null;
}

export function validateContactSubmission(input: {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  kind?: unknown;
}):
  | {
      ok: true;
      data: {
        name: string;
        email: string;
        subject: string;
        message: string;
        kind: InboxKind;
      };
    }
  | { ok: false; error: string } {
  const name = String(input.name ?? "").trim();
  const email = String(input.email ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const message = String(input.message ?? "").trim();
  const kind = parseInboxKind(input.kind);

  if (!name) return { ok: false, error: "Name is required." };
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!message) return { ok: false, error: "Message is required." };
  if (name.length > 200 || email.length > 320 || subject.length > 300 || message.length > 5000) {
    return { ok: false, error: "One or more fields are too long." };
  }

  return { ok: true, data: { name, email, subject, message, kind } };
}
