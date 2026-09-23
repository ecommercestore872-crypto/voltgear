"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HomepageSection } from "@/lib/types";

export function HomepageSectionsList({
  initialSections,
}: {
  initialSections: HomepageSection[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(section: HomepageSection) {
    setBusyId(section.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/homepage-sections/${section.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: section.title,
          subtitle: section.subtitle,
          slug: section.slug,
          sourceType: section.sourceType,
          categoryId: section.categoryId,
          productLimit: section.productLimit,
          layout: section.layout,
          showViewAll: section.showViewAll,
          viewAllHref: section.viewAllHref,
          isActive: !section.isActive,
          sortOrder: section.sortOrder,
          manualProductIds: section.manualProductIds,
        }),
      });

      setSections((prev) =>
        prev.map((s) =>
          s.id === section.id ? { ...s, isActive: !s.isActive } : s,
        ),
      );
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else
        setError(
          err instanceof Error ? err.message : "Failed to update status",
        );
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;

    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);

    try {
      await adminFetch("/api/admin/homepage-sections", {
        method: "PATCH",
        body: JSON.stringify({
          action: "reorder",
          orderedIds: next.map((s) => s.id),
        }),
      });
      router.refresh();
    } catch (err) {
      setSections(sections); // rollback
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  async function remove(id: string) {
    if (!confirm("Are you sure you want to delete this homepage section?"))
      return;
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(`/api/admin/homepage-sections/${id}`, {
        method: "DELETE",
      });
      setSections((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Homepage Sections
          </h1>
          <p className="text-sm text-muted-foreground">
            Curate dynamic collections, featured products, and category grids on
            the homepage.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/homepage-sections/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Section
          </Link>
        </Button>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-base font-semibold">
            No custom homepage sections yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first dynamic collection or curated product group.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/admin/homepage-sections/new">Create Section</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="divide-y">
            {sections.map((section, i) => (
              <div
                key={section.id}
                className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                  !section.isActive ? "bg-muted/30 opacity-75" : ""
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-base">
                      {section.title}
                    </span>
                    <Badge variant={section.isActive ? "default" : "secondary"}>
                      {section.isActive ? "Active" : "Hidden"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {section.layout}
                    </Badge>
                  </div>
                  {section.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {section.subtitle}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
                    <span>Limit: {section.productLimit}</span>
                    {section.sourceType === "category" &&
                      section.categoryId && (
                        <span>Category: {section.categoryId}</span>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busyId === section.id || i === 0}
                    onClick={() => move(i, -1)}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={
                      busyId === section.id || i === sections.length - 1
                    }
                    onClick={() => move(i, 1)}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busyId === section.id}
                    onClick={() => toggleActive(section)}
                    title={section.isActive ? "Hide section" : "Show section"}
                  >
                    {section.isActive ? (
                      <EyeOff className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    title="Edit section"
                  >
                    <Link href={`/admin/homepage-sections/${section.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busyId === section.id}
                    onClick={() => remove(section.id)}
                    title="Delete section"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
