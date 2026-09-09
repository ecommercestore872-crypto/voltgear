"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BlogSectionEditor } from "@/components/admin/blog-section-editor";
import { MediaField } from "@/components/admin/media-field";
import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { blogSeoDefaults, validateBlogDoc } from "@/lib/blog-desk-rules";
import { sanitizeBlogSections } from "@/lib/blog-safety-rules";
import { slugify, type PublishStatus } from "@/lib/db/publish";
import type { ContentBlock } from "@/lib/types";

type PageRow = {
  id: string;
  title?: string;
  slug?: string;
  page_type?: string;
  excerpt?: string;
  cover_image_url?: string;
  author?: string;
  sections?: unknown;
  keywords?: string[];
  seo?: {
    title?: string;
    description?: string;
    featured?: boolean;
    homeOrder?: number;
  };
  status?: PublishStatus;
  draft?: Record<string, unknown> | null;
  is_demo?: boolean;
  published_at?: string;
};

function fromRow(row?: PageRow | null, desk?: "blog" | "page") {
  const draft = row?.draft as Record<string, unknown> | undefined;
  const seo = (draft?.seo as PageRow["seo"]) ?? row?.seo;
  const rawSections = draft?.sections ?? row?.sections ?? [];
  return {
    title: String(draft?.title ?? row?.title ?? ""),
    slug: String(draft?.slug ?? row?.slug ?? ""),
    pageType:
      desk === "blog"
        ? "blog"
        : String(draft?.pageType ?? row?.page_type ?? "static"),
    excerpt: String(draft?.excerpt ?? row?.excerpt ?? ""),
    coverImage: String(draft?.coverImage ?? row?.cover_image_url ?? ""),
    author: String(draft?.author ?? row?.author ?? "Buy n Try editors"),
    sections: (Array.isArray(rawSections) ? rawSections : []) as ContentBlock[],
    sectionsText: JSON.stringify(rawSections ?? [], null, 2),
    keywords: ((draft?.keywords as string[]) ?? row?.keywords ?? []).join(", "),
    seoTitle: String(seo?.title ?? ""),
    seoDescription: String(seo?.description ?? ""),
    featured: Boolean(seo?.featured),
    homeOrder: String(seo?.homeOrder ?? ""),
    publishedAt: String(draft?.publishedAt ?? row?.published_at ?? "").slice(
      0,
      16,
    ),
    isDemo: Boolean(draft?.isDemo ?? row?.is_demo),
  };
}

export function PageForm({
  page,
  desk = "page",
}: {
  page?: PageRow | null;
  desk?: "blog" | "page";
}) {
  const router = useRouter();
  const isNew = !page;
  const [form, setForm] = useState(() => fromRow(page, desk));
  const isBlog = desk === "blog" || form.pageType === "blog";
  const listHref = desk === "blog" ? "/admin/blog" : "/admin/pages";
  const [status, setStatus] = useState<PublishStatus>(page?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doc() {
    let sections: ContentBlock[] = isBlog ? form.sections : [];
    if (!isBlog) {
      try {
        sections = JSON.parse(form.sectionsText || "[]");
      } catch {
        throw new Error("Sections must be valid JSON.");
      }
    }
    const keywords = form.keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const seo = {
      ...blogSeoDefaults({
        title: form.seoTitle || form.title,
        excerpt: form.seoDescription || form.excerpt,
      }),
      title: (form.seoTitle || form.title).trim(),
      description: (form.seoDescription || form.excerpt).trim(),
      ...(form.featured ? { featured: true } : {}),
      ...(form.homeOrder ? { homeOrder: Number(form.homeOrder) } : {}),
    };
    const payload = {
      title: form.title,
      slug: form.slug,
      pageType: isBlog ? "blog" : form.pageType === "blog" ? "blog" : "static",
      excerpt: form.excerpt,
      coverImage: form.coverImage,
      author: form.author,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : undefined,
      sections: isBlog ? sanitizeBlogSections(sections) : sections,
      keywords,
      seo,
      isDemo: form.isDemo,
    };
    return payload;
  }

  async function run(
    action: "create" | "save" | "publish" | "unpublish" | "discard" | "delete",
  ) {
    setSaving(true);
    setError(null);
    try {
      const payload = doc();
      if (isBlog && (action === "publish" || action === "create")) {
        const check = validateBlogDoc(payload);
        if (!check.ok && action === "publish") throw new Error(check.error);
      }
      if (action === "create") {
        const json = await adminFetch("/api/admin/pages", {
          method: "POST",
          body: JSON.stringify({ doc: payload }),
        });
        router.replace(`${listHref}/${json.id}`);
        return;
      }
      if (!page?.id) return;
      if (action === "delete") {
        if (!confirm("Delete this page?")) return;
        await adminFetch(`/api/admin/pages/${page.id}`, { method: "DELETE" });
        router.replace(listHref);
        return;
      }
      await adminFetch(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, doc: payload }),
      });
      if (action === "publish") setStatus("published");
      if (action === "unpublish") setStatus("unpublished");
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {isNew
            ? desk === "blog"
              ? "New blog guide"
              : "New page"
            : form.title || "Edit"}
        </h1>
        {!isNew && (
          <Button variant="destructive" onClick={() => run("delete")}>
            Delete
          </Button>
        )}
      </div>
      {isNew ? (
        <Button onClick={() => run("create")} disabled={saving}>
          Save draft
        </Button>
      ) : (
        <PublishBar
          status={status}
          saving={saving}
          onSave={() => run("save")}
          onPublish={() => run("publish")}
          onUnpublish={() => run("unpublish")}
          onDiscard={() => run("discard")}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                title: e.target.value,
                slug:
                  f.slug && f.slug !== slugify(f.title)
                    ? f.slug
                    : slugify(e.target.value),
              }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </div>
        {desk === "page" ? (
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.pageType}
              onChange={(e) =>
                setForm((f) => ({ ...f, pageType: e.target.value }))
              }
            >
              <option value="static">Static</option>
              <option value="blog">Blog</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Publish date</Label>
            <Input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, publishedAt: e.target.value }))
              }
            />
          </div>
        )}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Excerpt</Label>
          <Textarea
            value={form.excerpt}
            onChange={(e) =>
              setForm((f) => ({ ...f, excerpt: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <MediaField
            label="Cover photo"
            hint="Upload a wide photo (16:9 works best on cards and Google)."
            urls={form.coverImage ? [form.coverImage] : []}
            onChange={(urls) =>
              setForm((f) => ({ ...f, coverImage: urls.at(-1) ?? "" }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Author</Label>
          <Input
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>SEO title</Label>
          <Input
            value={form.seoTitle}
            onChange={(e) =>
              setForm((f) => ({ ...f, seoTitle: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>SEO description</Label>
          <Input
            value={form.seoDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, seoDescription: e.target.value }))
            }
          />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Keywords (comma separated)</Label>
          <Input
            value={form.keywords}
            onChange={(e) =>
              setForm((f) => ({ ...f, keywords: e.target.value }))
            }
            placeholder="best earbuds in Pakistan, TWS under 5000, ENC vs ANC"
          />
        </div>
        {isBlog ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featured: e.target.checked }))
                }
              />
              Pin on homepage Popular
            </label>
            <div className="space-y-1.5">
              <Label>Homepage order (1 = first)</Label>
              <Input
                type="number"
                min={1}
                value={form.homeOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, homeOrder: e.target.value }))
                }
              />
            </div>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isDemo}
            onChange={(e) =>
              setForm((f) => ({ ...f, isDemo: e.target.checked }))
            }
          />
          Demo — guests never see this page
        </label>
        <div className="sm:col-span-2 space-y-1.5">
          {isBlog ? (
            <BlogSectionEditor
              sections={form.sections}
              onChange={(sections) => setForm((f) => ({ ...f, sections }))}
            />
          ) : (
            <>
              <Label>Body sections (JSON)</Label>
              <Textarea
                rows={12}
                className="font-mono text-xs"
                value={form.sectionsText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sectionsText: e.target.value }))
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
