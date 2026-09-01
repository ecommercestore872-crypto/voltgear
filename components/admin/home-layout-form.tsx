"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import {
  HOME_SECTION_LABELS,
  type HomeSectionEntry,
} from "@/lib/db/home-section-rules";

export function HomeLayoutForm({
  initialSections,
}: {
  initialSections: HomeSectionEntry[];
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialSections);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= sections.length) return;
    setSections((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
    setSaved(false);
  }

  function toggle(index: number) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const json = await adminFetch("/api/admin/home-sections", {
        method: "PUT",
        body: JSON.stringify({ sections }),
      });
      if (json?.sections) setSections(json.sections);
      setSaved(true);
      router.refresh();
    } catch (err) {
      if (err instanceof AdminAuthError) router.replace("/admin/login");
      else setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Home layout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hero stays on top. Toggle and reorder the sections below.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground">Saved. Live home will refresh shortly.</p>
      ) : null}

      <ul className="divide-y rounded-lg border bg-card">
        {sections.map((section, index) => (
          <li
            key={section.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
          >
            <label className="flex min-w-0 flex-1 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={section.enabled}
                onChange={() => toggle(index)}
              />
              <span className="truncate">{HOME_SECTION_LABELS[section.id]}</span>
            </label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Move ${HOME_SECTION_LABELS[section.id]} up`}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={busy || index === sections.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Move ${HOME_SECTION_LABELS[section.id]} down`}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Button type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Saving…" : "Save layout"}
      </Button>
    </div>
  );
}
