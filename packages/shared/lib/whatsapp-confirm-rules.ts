/** Classifies a customer's WhatsApp reply to an order confirmation request. */
export type ConfirmReply = "confirm" | "decline" | "review";

const CONFIRM = new Set([
  "confirm", "confirmed", "confirmd", "yes", "yep", "yeah", "y", "ok", "okay", "haan", "han", "haa", "ji", "jee", "g",
  "theek", "thik", "sahi", "done", "kardo", "karo", "bilkul", "correct", "1", "👍", "✅",
  "جی", "ہاں", "کنفرم", "ٹھیک",
]);
// Words that cancel on their own.
const DECLINE = new Set(["cancel", "cancelled", "canceled", "reject", "2", "❌", "👎", "نہیں", "کینسل", "منسوخ"]);
// Flip meaning next to a confirm word ("not confirm", "confirm nahi"); decline when they stand alone.
const NEGATORS = new Set(["not", "no", "nope", "na", "dont", "don't", "mat", "never", "nahi", "nahin", "nhi", "nai"]);
const HEDGES = new Set(["but", "lekin", "magar", "however"]);
const DONT_WANT = /\b(nahi|nahin|nhi|dont|don't|do not|not)\s+(chahiye|chahie|chahta|chahti|want|need)\b|\b(chahiye|chahie)\s+(nahi|nahin|nhi)\b/;

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.,!;:()"\[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * shortcut: keyword matching on short replies only, no language model. Anything long,
 * a question, hedged or mixed goes to "review" so the owner decides. Upgrade if misroutes appear.
 */
export function classifyConfirmReply(text: string): ConfirmReply {
  if (/[?؟]/.test(text)) return "review";
  const words = tokens(text);
  if (words.length === 0 || words.length > 6 || words.some((w) => HEDGES.has(w))) return "review";
  if (DONT_WANT.test(words.join(" "))) return "decline";

  const hasConfirm = words.some((w) => CONFIRM.has(w));
  const hasDecline = words.some((w) => DECLINE.has(w));
  const hasNegator = words.some((w) => NEGATORS.has(w));
  const negatedConfirm = words.some(
    (w, i) => NEGATORS.has(w) && (CONFIRM.has(words[i - 1] ?? "") || CONFIRM.has(words[i + 1] ?? "")),
  );

  if (hasDecline) return hasConfirm ? "review" : "decline";
  if (negatedConfirm) return "decline";
  if (hasConfirm) return hasNegator || words.length > 4 ? "review" : "confirm";
  return hasNegator && words.length <= 2 ? "decline" : "review";
}
