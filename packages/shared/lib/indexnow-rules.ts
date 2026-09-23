/**
 * IndexNow — notify Bing and other engines when pages change.
 *
 * @see https://www.indexnow.org/documentation.html
 * @see https://www.bing.com/indexnow
 */

import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { CANONICAL_PUBLIC_ORIGIN, indexSiteUrl } from "@/lib/seo-rules";

/** Public ownership key (hosted at /{key}.txt). Not a private API secret. */
export const BUY_N_TRY_INDEXNOW_KEY = "buyntryy-indexnow-a7c4e91f2b68d035";

const KEY_RE = /^[a-zA-Z0-9-]{8,128}$/;

export function isValidIndexNowKey(raw?: string | null): boolean {
  return KEY_RE.test((raw ?? "").trim());
}

export function resolveIndexNowKey(
  env: Record<string, string | undefined> = process.env
): string {
  const fromEnv = (env.INDEXNOW_KEY ?? "").trim();
  if (isValidIndexNowKey(fromEnv)) return fromEnv;
  return BUY_N_TRY_INDEXNOW_KEY;
}

export function indexNowEndpoint(): string {
  return "https://api.indexnow.org/indexnow";
}

export function indexNowHost(siteUrl = indexSiteUrl()): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return new URL(CANONICAL_PUBLIC_ORIGIN).host;
  }
}

export function indexNowKeyLocation(
  key = resolveIndexNowKey(),
  siteUrl = indexSiteUrl()
): string {
  return `${siteUrl.replace(/\/+$/, "")}/${key}.txt`;
}

export function normalizeIndexNowUrls(input: {
  host: string;
  urls: string[];
  siteUrl?: string;
}): string[] {
  const origin = (input.siteUrl ?? `https://${input.host}`).replace(/\/+$/, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.urls) {
    let absolute = (raw ?? "").trim();
    if (!absolute) continue;
    if (absolute.startsWith("/")) absolute = `${origin}${absolute}`;
    try {
      const url = new URL(absolute);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (url.host !== input.host && url.host !== `www.${input.host}`) continue;
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const final =
        path === "/"
          ? `${url.protocol}//${url.host}/`
          : `${url.protocol}//${url.host}${path}${url.search}`;
      if (seen.has(final)) continue;
      seen.add(final);
      out.push(final);
    } catch {
      /* skip */
    }
  }
  return out.slice(0, 10_000);
}

export function buildIndexNowPayload(input: {
  siteUrl?: string;
  urls: string[];
  key?: string;
}): {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
} {
  const siteUrl = (input.siteUrl ?? indexSiteUrl()).replace(/\/+$/, "");
  const host = indexNowHost(siteUrl);
  const key = input.key && isValidIndexNowKey(input.key) ? input.key : resolveIndexNowKey();
  const urlList = normalizeIndexNowUrls({ host, urls: input.urls, siteUrl });
  return {
    host,
    key,
    keyLocation: indexNowKeyLocation(key, siteUrl),
    urlList,
  };
}

export function priorityIndexNowPaths(input?: {
  categorySlugs?: string[];
  blogSlugs?: string[];
}): string[] {
  const categories =
    input?.categorySlugs?.length
      ? input.categorySlugs
      : FALLBACK_SHOP_TYPES.map((t) => t.slug);
  const blogs =
    input?.blogSlugs?.length
      ? input.blogSlugs
      : FALLBACK_BLOG_POSTS.map((p) => p.slug);

  return [
    "/",
    "/products",
    "/blog",
    "/about",
    "/faq",
    "/contact",
    ...categories.map((slug) => `/products/${slug}`),
    ...blogs.map((slug) => `/blog/${slug}`),
  ];
}

export async function submitIndexNow(input: {
  urls: string[];
  siteUrl?: string;
  key?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; status: number; submitted: number; error?: string }> {
  const payload = buildIndexNowPayload(input);
  if (payload.urlList.length === 0) {
    return { ok: false, status: 400, submitted: 0, error: "No valid URLs to submit." };
  }
  const fetchFn = input.fetchImpl ?? fetch;
  try {
    const res = await fetchFn(indexNowEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    // 200 = OK, 202 = accepted pending key validation — both success per docs
    const ok = res.status === 200 || res.status === 202;
    return {
      ok,
      status: res.status,
      submitted: payload.urlList.length,
      ...(ok ? {} : { error: `IndexNow responded ${res.status}` }),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      submitted: 0,
      error: err instanceof Error ? err.message : "IndexNow request failed",
    };
  }
}
