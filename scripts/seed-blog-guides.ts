import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FALLBACK_BLOG_POSTS } from "../lib/blog-data";
import { sanitizeBlogSections } from "../lib/blog-safety-rules";
import { getServiceClient } from "../lib/supabase/server";

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
  const db = getServiceClient();
  for (const post of FALLBACK_BLOG_POSTS) {
    const row = {
      title: post.title,
      slug: post.slug,
      page_type: "blog",
      excerpt: post.excerpt ?? null,
      cover_image_url: post.coverImage ?? null,
      published_at: post.publishedAt ?? new Date().toISOString(),
      author: post.author ?? "Buy n Try editors",
      sections: sanitizeBlogSections(post.sections),
      keywords: post.keywords ?? [],
      seo: post.seo ?? null,
      status: "published",
      draft: null,
      is_demo: false,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db.from("pages").select("id").eq("slug", post.slug).maybeSingle();
    if (existing?.id) {
      const { error } = await db.from("pages").update(row).eq("id", existing.id);
      if (error) throw new Error(`${post.slug}: ${error.message}`);
      console.log("updated", post.slug);
    } else {
      const { error } = await db.from("pages").insert(row);
      if (error) throw new Error(`${post.slug}: ${error.message}`);
      console.log("inserted", post.slug);
    }
  }
  const keep = new Set(FALLBACK_BLOG_POSTS.map((post) => post.slug));
  const { data: extras } = await db
    .from("pages")
    .select("slug")
    .eq("page_type", "blog")
    .eq("status", "published");
  const leftover = (extras ?? []).filter((row) => !keep.has(String(row.slug)));
  const thinOverlaps = new Set([
    "how-to-choose-a-power-bank-2026",
    "smartwatch-features-worth-paying-for",
    "true-wireless-earbuds-buying-guide",
    "gan-chargers-explained",
  ]);
  const toUnpublish = leftover.filter((row) => thinOverlaps.has(String(row.slug)));
  if (toUnpublish.length) {
    const { error } = await db
      .from("pages")
      .update({ status: "unpublished", updated_at: new Date().toISOString() })
      .in(
        "slug",
        toUnpublish.map((row) => String(row.slug))
      );
    if (error) throw new Error(`unpublish old guides: ${error.message}`);
    console.log("unpublished overlapping short guides:", toUnpublish.map((row) => row.slug).join(", "));
  }
  const kept = leftover.filter((row) => !thinOverlaps.has(String(row.slug)));
  if (kept.length) {
    console.log("other published blogs left in place:", kept.map((row) => row.slug).join(", "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
