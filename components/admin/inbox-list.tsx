"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InboxItem } from "@/lib/db/inbox-store";
import { adminFetch } from "@/components/admin/admin-fetch";

export function InboxList({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | "contact" | "complaint" | "new">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "new") return items.filter((i) => i.status === "new");
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  async function patch(
    id: string,
    body: { status?: string; adminNote?: string },
  ) {
    setBusy(true);
    setError(null);
    try {
      const data = (await adminFetch(`/api/admin/inbox/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })) as { item?: InboxItem };
      if (!data.item) throw new Error("Update failed");
      setItems((prev) => prev.map((i) => (i.id === id ? data.item! : i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: InboxItem) {
    setSelectedId(item.id);
    setNote(item.adminNote ?? "");
    if (item.status === "new") {
      await patch(item.id, { status: "read" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Contact and complaint messages from the storefront
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter inbox"
      >
        {(
          [
            ["all", "All"],
            ["new", "New"],
            ["contact", "Contact"],
            ["complaint", "Complaints"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? "default" : "outline"}
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition hover:border-[var(--g-forest)] ${
                  selectedId === item.id
                    ? "border-[var(--g-forest)] bg-white"
                    : "bg-white/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.kind} · {item.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {item.subject || item.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.email}
                  {item.createdAt
                    ? ` · ${new Date(item.createdAt).toLocaleString()}`
                    : ""}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a message to read it.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {selected.kind} · {selected.status}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {selected.subject || "No subject"}
                </h2>
                <p className="mt-1 text-sm">
                  {selected.name} ·{" "}
                  <a className="underline" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {selected.message}
              </p>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Admin note</span>
                <textarea
                  className="min-h-[80px] w-full rounded-md border px-3 py-2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => patch(selected.id, { adminNote: note })}
                >
                  Save note
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || selected.status === "closed"}
                  onClick={() =>
                    patch(selected.id, { status: "closed", adminNote: note })
                  }
                >
                  Mark closed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || selected.status === "new"}
                  onClick={() => patch(selected.id, { status: "new" })}
                >
                  Mark new
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
