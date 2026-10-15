const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isReviewSubmissionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function parseReviewModerationInput(input: unknown):
  | { ok: true; id: string; action: "approve" | "reject"; reply?: string }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid moderation request." };
  }
  const row = input as Record<string, unknown>;
  if (!isReviewSubmissionId(row.id)) {
    return { ok: false, error: "Invalid review id." };
  }
  if (row.action !== "approve" && row.action !== "reject") {
    return { ok: false, error: "Invalid moderation action." };
  }
  const reply = String(row.reply ?? "").trim();
  if (reply.length > 1000) return { ok: false, error: "Reply is too long." };
  return {
    ok: true,
    id: row.id.trim(),
    action: row.action,
    ...(reply ? { reply } : {}),
  };
}
