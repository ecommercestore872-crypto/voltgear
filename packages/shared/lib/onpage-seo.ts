import { SHOPPER_BRAND } from "./brand";

export type FaqItem = { question: string; answer: string };

/** Trim and drop empty values so empty admin fields are treated as missing. */
export function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Keep only FAQ entries that have both a question and an answer. */
export function cleanFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  const out: FaqItem[] = [];
  for (const raw of value) {
    const row = raw as { question?: unknown; answer?: unknown } | null;
    const question = cleanText(row?.question);
    const answer = cleanText(row?.answer);
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

/** Split admin guide text into paragraphs on blank lines. */
export function guideParagraphs(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Spec labels that make a useful title qualifier, in priority order. */
const KEY_SPEC_LABELS = [
  /capacity/i,
  /wattage|power output|output power|\bpower\b/i,
  /battery/i,
  /display|screen/i,
  /driver/i,
  /length|height|size/i,
];

/**
 * One real spec value for the title (e.g. "20000mAh"). Only reads the product's own
 * specifications; returns undefined when none fits or the name already contains it.
 */
export function productKeySpec(
  name: string,
  specs: { label: string; value: string }[] | undefined,
): string | undefined {
  const usable = (specs ?? []).filter((s) => cleanText(s?.label) && cleanText(s?.value));
  for (const pattern of KEY_SPEC_LABELS) {
    const hit = usable.find((s) => pattern.test(s.label));
    if (!hit) continue;
    const value = hit.value.trim();
    if (value.length > 24) continue;
    if (name.toLowerCase().replace(/\s+/g, "").includes(value.toLowerCase().replace(/\s+/g, ""))) {
      return undefined;
    }
    return value;
  }
  return undefined;
}

/** `<name> <key spec> Price in Pakistan | Buy n Try`, unless the admin set an override. */
export function productSeoTitle(input: {
  name: string;
  specifications?: { label: string; value: string }[];
  seoTitle?: string | null;
}): string {
  const override = cleanText(input.seoTitle);
  if (override) return override;
  const spec = productKeySpec(input.name, input.specifications);
  return `${input.name}${spec ? ` ${spec}` : ""} Price in Pakistan | ${SHOPPER_BRAND.spokenName}`;
}

export type CategorySeoFields = {
  seoTitle?: string;
  metaDescription?: string;
  seoH1?: string;
  seoIntro?: string;
  guideText?: string;
  faq?: FaqItem[];
};

/** Admin fields win; every empty field returns undefined so the caller falls back or hides it. */
export function resolveCategorySeo(fields: CategorySeoFields | null | undefined, fallback: {
  title: string;
  description: string;
  intro: string;
  faq: FaqItem[];
}) {
  const faq = cleanFaq(fields?.faq);
  return {
    title: cleanText(fields?.seoTitle) ?? fallback.title,
    description: cleanText(fields?.metaDescription) ?? fallback.description,
    h1: cleanText(fields?.seoH1),
    intro: cleanText(fields?.seoIntro) ?? fallback.intro,
    guide: guideParagraphs(cleanText(fields?.guideText)),
    faq: faq.length ? faq : fallback.faq,
  };
}

/** Meta description for a city page: the admin's unique intro, trimmed to 160 chars. */
export function cityMetaDescription(intro: string | undefined, fallback: string): string {
  const text = cleanText(intro);
  if (!text) return fallback;
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

/** Spec labels shown as table rows: those present on at least one product, in first-seen order. */
export function comparisonSpecLabels(
  products: { specifications?: { label: string; value: string }[] }[],
  max = 8,
): string[] {
  const seen = new Map<string, string>();
  for (const p of products) {
    for (const s of p.specifications ?? []) {
      const label = cleanText(s?.label);
      if (label && cleanText(s?.value) && !seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label);
    }
  }
  return [...seen.values()].slice(0, max);
}

export function comparisonSpecValue(
  product: { specifications?: { label: string; value: string }[] },
  label: string,
): string | undefined {
  const hit = (product.specifications ?? []).find((s) => s.label?.trim().toLowerCase() === label.toLowerCase());
  return cleanText(hit?.value);
}
