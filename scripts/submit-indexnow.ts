import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FALLBACK_BLOG_POSTS } from "../lib/blog-data";
import { FALLBACK_SHOP_TYPES } from "../lib/categories";
import {
  priorityIndexNowPaths,
  submitIndexNow,
} from "../lib/indexnow-rules";
import { CANONICAL_PUBLIC_ORIGIN } from "../lib/seo-rules";

function loadEnv(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv(".env.local");
loadEnv(".env");

async function main() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_PUBLIC_ORIGIN).replace(
    /\/+$/,
    ""
  );
  const live =
    /localhost|127\.0\.0\.1/i.test(siteUrl) ? CANONICAL_PUBLIC_ORIGIN : siteUrl;

  const paths = priorityIndexNowPaths({
    categorySlugs: FALLBACK_SHOP_TYPES.map((t) => t.slug),
    blogSlugs: FALLBACK_BLOG_POSTS.map((p) => p.slug),
  });

  console.log(`Submitting ${paths.length} URLs to IndexNow for ${live}…`);
  const result = await submitIndexNow({ siteUrl: live, urls: paths });
  console.log(result);
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
