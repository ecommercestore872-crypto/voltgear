export type CopyMark = "bold" | "italic";

export type CopySpan = {
  text: string;
  mark?: CopyMark;
};

export type ProductCopyBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "lead"; spans: CopySpan[] }
  | { type: "paragraph"; spans: CopySpan[] }
  | { type: "list"; ordered: boolean; items: CopySpan[][] }
  | { type: "callout"; spans: CopySpan[] };

const INLINE_RE = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;

export function parseInlineSpans(text: string): CopySpan[] {
  const spans: CopySpan[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > last) {
      spans.push({ text: text.slice(last, match.index) });
    }
    if (match[2]) spans.push({ text: match[2], mark: "bold" });
    else if (match[3]) spans.push({ text: match[3], mark: "italic" });
    else if (match[4]) spans.push({ text: match[4], mark: "italic" });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.filter((span) => span.text.length > 0);
}

function headingFromLine(line: string): { level: 2 | 3; text: string } | null {
  const markdown = line.match(/^(#{1,3})\s+(.+)$/);
  if (markdown) {
    return { level: markdown[1].length === 3 ? 3 : 2, text: markdown[2].trim() };
  }

  const boldWhole = line.match(/^\*\*(.+)\*\*$/);
  if (boldWhole && boldWhole[1].trim().length <= 60) {
    return { level: 2, text: boldWhole[1].trim() };
  }

  if (/^[A-Z0-9][A-Z0-9 \/'’&-]{1,48}$/.test(line) && /[A-Z]/.test(line)) {
    return { level: 2, text: line };
  }

  if (/^[A-Z][\w'’& /-]{1,40}:$/.test(line)) {
    return { level: 3, text: line.slice(0, -1).trim() };
  }

  return null;
}

function listFromLine(line: string): { ordered: boolean; text: string } | null {
  const bullet = line.match(/^[-*•]\s+(.+)$/);
  if (bullet) return { ordered: false, text: bullet[1].trim() };
  const numbered = line.match(/^\d+[.)]\s+(.+)$/);
  if (numbered) return { ordered: true, text: numbered[1].trim() };
  return null;
}

function calloutFromLine(line: string): string | null {
  const quoted = line.match(/^>\s+(.+)$/);
  return quoted ? quoted[1].trim() : null;
}

export function parseProductDetailCopy(text: string): ProductCopyBlock[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n").map((line) => line.trimEnd());
  const blocks: ProductCopyBlock[] = [];
  let pendingList: { ordered: boolean; items: CopySpan[][] } | null = null;
  let sawBody = false;

  function flushList() {
    if (!pendingList || pendingList.items.length === 0) {
      pendingList = null;
      return;
    }
    blocks.push({
      type: "list",
      ordered: pendingList.ordered,
      items: pendingList.items,
    });
    pendingList = null;
  }

  function pushParagraph(raw: string) {
    const spans = parseInlineSpans(raw.trim());
    if (spans.length === 0) return;
    if (!sawBody) {
      sawBody = true;
      blocks.push({ type: "lead", spans });
      return;
    }
    blocks.push({ type: "paragraph", spans });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const heading = headingFromLine(line);
    if (heading) {
      flushList();
      blocks.push({ type: "heading", level: heading.level, text: heading.text });
      continue;
    }

    const callout = calloutFromLine(line);
    if (callout) {
      flushList();
      sawBody = true;
      blocks.push({ type: "callout", spans: parseInlineSpans(callout) });
      continue;
    }

    const list = listFromLine(line);
    if (list) {
      if (!pendingList || pendingList.ordered !== list.ordered) {
        flushList();
        pendingList = { ordered: list.ordered, items: [] };
      }
      pendingList.items.push(parseInlineSpans(list.text));
      sawBody = true;
      continue;
    }

    flushList();
    pushParagraph(line);
  }

  flushList();
  return blocks;
}

function childText(child: unknown): string {
  if (typeof child === "string") return child;
  if (!child || typeof child !== "object") return "";
  const text = (child as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

function blockText(block: {
  text?: unknown;
  children?: unknown[];
}): string {
  if (Array.isArray(block.children) && block.children.length > 0) {
    return block.children.map(childText).join("");
  }
  return typeof block.text === "string" ? block.text : "";
}

export function portableTextToPlain(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  const parts: string[] = [];
  let listLines: string[] = [];

  const flushList = () => {
    if (listLines.length === 0) return;
    parts.push(listLines.join("\n"));
    listLines = [];
  };

  for (const raw of value) {
    if (typeof raw === "string") {
      if (raw.trim()) {
        flushList();
        parts.push(raw);
      }
      continue;
    }
    if (!raw || typeof raw !== "object") continue;
    const block = raw as {
      _type?: string;
      style?: string;
      listItem?: string;
      text?: unknown;
      children?: unknown[];
    };
    if (block._type === "image") continue;

    const text = blockText(block);
    if (!text) continue;

    if (block.listItem === "number") {
      listLines.push(`1. ${text}`);
      continue;
    }
    if (block.listItem) {
      listLines.push(`- ${text}`);
      continue;
    }

    flushList();
    if (block.style === "h2") parts.push(`# ${text}`);
    else if (block.style === "h3") parts.push(`## ${text}`);
    else parts.push(text);
  }

  flushList();
  return parts.join("\n\n");
}

export function portableTextToCopyBlocks(value: unknown): ProductCopyBlock[] {
  return parseProductDetailCopy(portableTextToPlain(value));
}

function spansToChildren(spans: CopySpan[], key: string) {
  return spans.map((span, index) => ({
    _type: "span" as const,
    _key: `${key}s${index}`,
    text: span.text,
    marks: span.mark === "bold" ? ["strong"] : span.mark === "italic" ? ["em"] : [],
  }));
}

export function textToPortableText(text: string) {
  const parsed = parseProductDetailCopy(text);
  if (parsed.length === 0) return [];

  const blocks: Record<string, unknown>[] = [];
  parsed.forEach((block, index) => {
    const key = `b${index + 1}`;
    if (block.type === "heading") {
      blocks.push({
        _type: "block",
        _key: key,
        style: block.level === 3 ? "h3" : "h2",
        markDefs: [],
        children: [{ _type: "span", _key: `${key}s`, text: block.text, marks: [] }],
      });
      return;
    }
    if (block.type === "list") {
      block.items.forEach((item, itemIndex) => {
        const itemKey = `${key}i${itemIndex}`;
        blocks.push({
          _type: "block",
          _key: itemKey,
          style: "normal",
          listItem: block.ordered ? "number" : "bullet",
          level: 1,
          markDefs: [],
          children: spansToChildren(item, itemKey),
        });
      });
      return;
    }
    const prefix = block.type === "callout" ? "> " : "";
    const spans =
      block.type === "callout" && prefix
        ? [{ text: prefix }, ...block.spans]
        : block.spans;
    blocks.push({
      _type: "block",
      _key: key,
      style: "normal",
      markDefs: [],
      children: spansToChildren(spans, key),
    });
  });

  return blocks;
}

export function displayHeading(text: string): string {
  if (text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return text
      .toLowerCase()
      .replace(/(^|[\s/'’-])([a-z])/g, (_, edge: string, letter: string) => `${edge}${letter.toUpperCase()}`);
  }
  return text;
}

const PREVIEW_CHARS = 90;

function spansLength(spans: CopySpan[]): number {
  return spans.reduce((total, span) => total + span.text.length, 0);
}

function truncateSpans(spans: CopySpan[], max: number): CopySpan[] {
  const out: CopySpan[] = [];
  let used = 0;
  for (const span of spans) {
    if (used >= max) break;
    const room = max - used;
    if (span.text.length <= room) {
      out.push(span);
      used += span.text.length;
      continue;
    }
    const cut = span.text.slice(0, room).replace(/\s+\S*$/, "").trimEnd();
    out.push({ ...span, text: `${cut || span.text.slice(0, room).trimEnd()}…` });
    break;
  }
  return out.length > 0 ? out : [{ text: "…" }];
}

export function previewProductCopy(blocks: ProductCopyBlock[]): {
  blocks: ProductCopyBlock[];
  hasMore: boolean;
} {
  if (blocks.length === 0) return { blocks: [], hasMore: false };

  const first = blocks[0];
  const hasLater = blocks.length > 1;

  if (first.type === "lead" || first.type === "paragraph" || first.type === "callout") {
    if (spansLength(first.spans) > PREVIEW_CHARS) {
      return {
        blocks: [{ ...first, spans: truncateSpans(first.spans, PREVIEW_CHARS) }],
        hasMore: true,
      };
    }
    return { blocks: [first], hasMore: hasLater };
  }

  if (first.type === "list" && first.items.length > 2) {
    return { blocks: [{ ...first, items: first.items.slice(0, 2) }], hasMore: true };
  }

  return { blocks: [first], hasMore: hasLater };
}
