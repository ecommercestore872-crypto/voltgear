"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { adminHeaders, getAdminToken } from "@/lib/admin-token";
import type {
  BroadcastContact,
  MessageCampaign,
  MessageRecipient,
} from "@/lib/types";

async function adminFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) throw new AuthError();
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json;
}

class AuthError extends Error {}

interface ContactsPayload {
  contacts: BroadcastContact[];
  manualCount: number;
  suppressed: string[];
}

export function BroadcastManager() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Customer Messaging
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send WhatsApp / SMS to your customers, single or bulk, and track
            delivery per number.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <Tabs defaultValue="recipients">
        <TabsList>
          <TabsTrigger value="recipients" className="gap-1.5">
            <Users className="h-4 w-4" /> Recipients
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-1.5">
            <Send className="h-4 w-4" /> Send
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipients">
          <RecipientsTab />
        </TabsContent>
        <TabsContent value="send">
          <SendTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─────────────────────────── Recipients ─────────────────────────── */

function RecipientsTab() {
  const [data, setData] = useState<ContactsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch("/api/messaging/contacts"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await adminFetch("/api/messaging/contacts", {
        method: "POST",
        body: JSON.stringify({ phone, name, city }),
      });
      setPhone("");
      setName("");
      setCity("");
      setMessage(result?.updated ? "Contact updated." : "Number added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add number");
    } finally {
      setSaving(false);
    }
  }

  async function remove(contact: BroadcastContact) {
    if (!confirm(`Remove ${contact.phone}${contact.name ? ` (${contact.name})` : ""}?`)) return;
    try {
      await adminFetch(`/api/messaging/contacts?phone=${encodeURIComponent(contact.phone)}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove number");
    }
  }

  async function unSuppress(phoneRaw: string) {
    try {
      await adminFetch("/api/messaging/contacts", {
        method: "POST",
        body: JSON.stringify({ phone: phoneRaw }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore number");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading contacts…
      </div>
    );
  }

  const contacts = data?.contacts ?? [];

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-primary">{message}</p>}

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Add a number manually</h2>
        <form onSubmit={addContact} className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="m-phone">Phone *</Label>
            <Input
              id="m-phone"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-name">Name</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-city">City</Label>
            <Input
              id="m-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground">
            From orders + manual, minus suppressed
          </p>
        </div>
        {contacts.length ? (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">City</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{c.name || "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-2">{c.city || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                        {c.source === "manual" ? "Manual" : "Order"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        aria-label={`Remove ${c.phone}`}
                        onClick={() => remove(c)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            No contacts yet. They appear automatically from orders, or add a
            number above.
          </p>
        )}
      </div>

      {(data?.suppressed ?? []).length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Suppressed ({data!.suppressed.length}) — these won&rsquo;t receive
            broadcasts
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data!.suppressed.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs"
              >
                {p}
                <button
                  type="button"
                  onClick={() => unSuppress(p)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Send ───────────────────────────── */

function SendTab() {
  const [contacts, setContacts] = useState<BroadcastContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totals: { total: number; sent: number; failed: number };
    campaignId: string | null;
  } | null>(null);

  useEffect(() => {
    adminFetch("/api/messaging/contacts")
      .then((d) => {
        setContacts(d.contacts);
        setSelected(new Set(d.contacts.map((c: BroadcastContact) => c.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const target =
    manualPhone.trim().length > 0
      ? { type: "manual" as const, value: manualPhone.trim() }
      : { type: "contacts" as const, value: selected };

  const count = target.type === "manual" ? 1 : target.value.size;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    setError(null);
    setResult(null);
    if (!text.trim()) {
      setError("Write a message first.");
      return;
    }
    if (count === 0) {
      setError("Select at least one recipient, or type a single number.");
      return;
    }
    setSending(true);
    try {
      const recipients =
        target.type === "manual"
          ? [{ phone: target.value }]
          : contacts
              .filter((c) => target.value.has(c.id))
              .map((c) => ({ phone: c.phone, name: c.name }));
      const json = await adminFetch("/api/messaging/send", {
        method: "POST",
        body: JSON.stringify({
          text,
          name: campaignName || undefined,
          recipients,
        }),
      });
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-name">Campaign name (for reports)</Label>
          <Input
            id="campaign-name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Ramadan offer blast"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="msg-text">Message *</Label>
          <Textarea
            id="msg-text"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Asalam o Alaikum {name}! Use code VOLT10 for 10% off at VoltGear — visit our store now!"
          />
          <p className="text-right text-xs text-muted-foreground">
            {text.length}/4096 · use {"{name}"} to personalize
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-phone">
            Or send to a single number (overrides selection)
          </Label>
          <Input
            id="manual-phone"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="+92 300 1234567"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={send} disabled={sending || count === 0} className="w-full">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending to {count} recipient{count === 1 ? "" : "s"}…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send to {count} recipient{count === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Recipients</p>
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.size === contacts.length
                  ? new Set()
                  : new Set(contacts.map((c) => c.id))
              )
            }
            className="text-xs text-primary"
          >
            {selected.size === contacts.length && contacts.length > 0
              ? "Clear all"
              : "Select all"}
          </button>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : contacts.length ? (
          <div className="mt-3 max-h-[380px] space-y-1 overflow-auto">
            {contacts.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4"
                />
                <span className="flex-1 truncate">{c.name || "Unknown"}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {c.phone}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No contacts yet — add some in the Recipients tab.
          </p>
        )}
      </div>

      {result && (
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Done — {result.totals.sent} sent, {result.totals.failed} failed
            <span className="text-muted-foreground">
              ({result.totals.total} total)
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            View the full per-number report in the Reports tab.
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Reports ──────────────────────────── */

function statusBadge(status: MessageRecipient["status"]) {
  if (status === "sent")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Sent
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      Queued
    </span>
  );
}

function ReportsTab() {
  const [campaigns, setCampaigns] = useState<MessageCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const json = await adminFetch("/api/messaging/campaigns");
      setCampaigns(json.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function retryFailed(campaignId: string) {
    setRetrying(true);
    try {
      await adminFetch("/api/messaging/retry", {
        method: "POST",
        body: JSON.stringify({ campaignId }),
      });
      setDetailId(campaignId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!campaigns) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
      </div>
    );
  }
  if (!campaigns.length) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No campaigns sent yet. Head to the Send tab to start.
      </div>
    );
  }

  const detail = detailId
    ? campaigns.find((c) => c._id === detailId)
    : null;

  return (
    <div className="space-y-4">
      {campaigns.map((c) => (
        <div key={c._id} className="overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setDetailId(detailId === c._id ? null : c._id)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {c.name || new Date(c.createdAt).toLocaleString("en-PK")}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {c.text}
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{new Date(c.createdAt).toLocaleString("en-PK")}</p>
              <p className="mt-1">
                <span className="font-semibold text-emerald-600">{c.sent} sent</span>
                {" · "}
                <span className="font-semibold text-destructive">{c.failed} failed</span>
              </p>
            </div>
          </button>

          {detail && (
            <div className="border-t">
              <div className="flex items-center justify-between px-4 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Delivery report
                </p>
                {c.failed > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryFailed(c._id)}
                    disabled={retrying}
                  >
                    {retrying ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Retry failed
                  </Button>
                )}
              </div>
              <div className="max-h-72 overflow-auto border-t">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Phone</th>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Error / Message ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.recipients.map((r, i) => (
                      <tr key={`${r.phone}-${i}`} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{r.phone}</td>
                        <td className="px-4 py-2">{r.name || "—"}</td>
                        <td className="px-4 py-2">{statusBadge(r.status)}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {r.error
                            ? r.error
                            : r.messageId
                              ? `ID: ${r.messageId}`
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
