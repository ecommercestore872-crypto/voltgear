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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-10">
      {/* Command Center Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Support Inbox
            </h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/30">
              Operations
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage incoming contact requests and complaints. Read messages, leave internal notes, and track resolution states.
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter inbox"
      >
        {(
          [
            ["all", "All Messages"],
            ["new", "Unread"],
            ["contact", "Standard Inquiries"],
            ["complaint", "Complaints"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            className="rounded-full shadow-sm"
            variant={filter === id ? "default" : "outline"}
            onClick={() => setFilter(id)}
          >
            {label}
            {id === "new" && (
              <span className="ml-2 inline-flex items-center justify-center bg-white/20 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                {items.filter(i => i.status === "new").length}
              </span>
            )}
          </Button>
        ))}
      </div>
      
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[75vh] min-h-[600px]">
        {/* Left Pane: Inbox List */}
        <div className="lg:col-span-5 flex flex-col border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/10">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Message Queue</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {visible.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-10 text-center">
                 <p className="text-sm text-muted-foreground">Inbox zero! No messages match this filter.</p>
               </div>
            ) : (
              visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 border-2 ${
                    selectedId === item.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`font-semibold text-[15px] truncate ${item.status === 'new' ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                      {item.name}
                    </span>
                    
                    <div className="flex gap-1.5 shrink-0">
                      {item.kind === "complaint" ? (
                         <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                           Complaint
                         </span>
                      ) : (
                         <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">
                           Contact
                         </span>
                      )}

                      {item.status === "new" ? (
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 animate-pulse">
                          New
                        </span>
                      ) : item.status === "closed" ? (
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                          Closed
                        </span>
                      ) : null}
                    </div>
                  </div>
                  
                  <p className={`truncate text-sm pr-4 mb-2 ${item.status === 'new' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {item.subject || item.message}
                  </p>
                  
                  <p className="text-[11px] font-medium text-muted-foreground/70 flex items-center justify-between">
                    <span className="truncate">{item.email}</span>
                    <span className="shrink-0 pl-2">
                       {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                    </span>
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Reader Window */}
        <div className="lg:col-span-7 flex flex-col border rounded-2xl bg-card shadow-sm overflow-hidden relative">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-muted/5">
              <div className="w-16 h-16 rounded-3xl bg-muted mb-4 flex items-center justify-center shadow-inner">
                <span className="text-2xl opacity-20">📬</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No Message Selected</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Select a conversation from the queue on the left to read the full message and take action.
              </p>
            </div>
          ) : (
            <>
              {/* Reader Header */}
              <div className="p-6 border-b bg-white dark:bg-zinc-950 shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm ring-1 ${
                    selected.kind === "complaint" 
                      ? "bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/30"
                      : "bg-gradient-to-r from-slate-500/10 to-gray-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/30"
                  }`}>
                    {selected.kind}
                  </span>
                  
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm ring-1 ${
                    selected.status === 'closed'
                      ? "bg-gradient-to-r from-gray-500/10 to-stone-500/10 text-gray-600 dark:text-gray-400 ring-gray-500/30"
                      : selected.status === 'new' 
                      ? "bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/30"
                      : "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30"
                  }`}>
                    Status: {selected.status}
                  </span>
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 leading-tight">
                  {selected.subject || "No Subject Provided"}
                </h2>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground/90">{selected.name}</span>
                  <span className="text-muted-foreground/40">&lt;</span>
                  <a className="font-medium text-primary hover:underline hover:text-primary" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                  <span className="text-muted-foreground/40">&gt;</span>
                </div>
              </div>

              {/* Reader Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                <div className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-2xl shadow-sm border border-border/50">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
                    {selected.message}
                  </p>
                </div>
                
                {/* Admin Note Section */}
                <div className="mt-8 space-y-3">
                  <label className="block text-sm font-semibold tracking-wide text-foreground">
                    Internal Note (Not visible to customer)
                  </label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl border bg-card px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 shadow-sm transition-all focus:border-primary resize-y"
                    placeholder="Leave a note about how this was handled..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Reader Actions */}
              <div className="p-4 border-t bg-white dark:bg-zinc-950 flex flex-wrap gap-3 items-center justify-between shrink-0">
                <Button
                  type="button"
                  className="shadow-sm"
                  disabled={busy}
                  onClick={() => patch(selected.id, { adminNote: note })}
                >
                  Save Internal Note
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="hover:text-primary hover:bg-primary/5"
                    disabled={busy || selected.status === "new"}
                    onClick={() => patch(selected.id, { status: "new" })}
                  >
                    Mark Unread
                  </Button>
                  <Button
                    type="button"
                    variant={selected.status === "closed" ? "secondary" : "default"}
                    className={selected.status !== "closed" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    disabled={busy || selected.status === "closed"}
                    onClick={() => patch(selected.id, { status: "closed", adminNote: note })}
                  >
                    {selected.status === "closed" ? "Resolved" : "Mark as Resolved"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
