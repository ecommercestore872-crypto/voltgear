"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublishStatus } from "@/lib/db/publish";
import {
  ORDER_EMAIL_KINDS,
  parseOrderEmailConfig,
  type OrderEmailConfig,
  type OrderEmailKind,
} from "@/lib/order-email-cms-rules";

type LetterFields = Record<OrderEmailKind, { subject: string; body: string }>;

function emptyLetters(): LetterFields {
  return Object.fromEntries(
    ORDER_EMAIL_KINDS.map(({ kind }) => [kind, { subject: "", body: "" }])
  ) as LetterFields;
}

function fromConfig(config?: OrderEmailConfig | null) {
  const letters = emptyLetters();
  for (const { kind } of ORDER_EMAIL_KINDS) {
    letters[kind] = {
      subject: config?.letters?.[kind]?.subject ?? "",
      body: config?.letters?.[kind]?.body ?? "",
    };
  }
  return {
    logo: config?.theme?.logo ?? "",
    background: config?.theme?.background ?? "",
    card: config?.theme?.card ?? "",
    text: config?.theme?.text ?? "",
    button: config?.theme?.button ?? "",
    header: config?.theme?.header ?? "",
    footer: config?.theme?.footer ?? "",
    wrapperHtml: config?.theme?.wrapperHtml ?? "",
    letters,
  };
}

export function OrderEmailsForm({
  config,
  hasDraft,
}: {
  config?: OrderEmailConfig | null;
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromConfig(config));
  const [status, setStatus] = useState<PublishStatus>(hasDraft ? "draft" : "published");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doc(): OrderEmailConfig {
    return parseOrderEmailConfig({
      theme: {
        logo: form.logo,
        background: form.background,
        card: form.card,
        text: form.text,
        button: form.button,
        header: form.header,
        footer: form.footer,
        wrapperHtml: form.wrapperHtml,
      },
      letters: form.letters,
    });
  }

  async function run(action: "save" | "publish" | "discard") {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/order-emails", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: doc() }),
      });
      if (action === "publish") setStatus("published");
      if (action === "save") setStatus("draft");
      if (action === "discard") setStatus("published");
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
      <div>
        <h1 className="text-2xl font-semibold">Order emails</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared look for the six order letters. Empty fields keep the current code defaults.
          Item tables, delivery address, Track button, and status notes are always added in
          code. Marketing templates stay under Messaging.
        </p>
      </div>
      <PublishBar
        status={status}
        saving={saving}
        onSave={() => run("save")}
        onPublish={() => run("publish")}
        onDiscard={() => run("discard")}
        hideUnpublish
      />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-base font-semibold">Theme and layout</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["logo", "Logo URL"],
              ["background", "Background color"],
              ["card", "Card color"],
              ["text", "Text color"],
              ["button", "Button color"],
              ["header", "Header line"],
              ["footer", "Footer line"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`order-email-${key}`}>{label}</Label>
              <Input
                id={`order-email-${key}`}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={key.includes("color") || key === "background" || key === "card" || key === "text" || key === "button" ? "#f4f4f5" : ""}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order-email-wrapper">Wrapper HTML</Label>
          <Textarea
            id="order-email-wrapper"
            className="min-h-[140px] font-mono text-sm"
            value={form.wrapperHtml}
            onChange={(e) => setForm((f) => ({ ...f, wrapperHtml: e.target.value }))}
            placeholder={"<div>{{title}}{{body}}</div>"}
          />
          <p className="text-xs text-muted-foreground">
            Used only if it contains both <code>{"{{title}}"}</code> and{" "}
            <code>{"{{body}}"}</code>. Optional: <code>{"{{logo}}"}</code>,{" "}
            <code>{"{{brand}}"}</code>, <code>{"{{footer}}"}</code>.
          </p>
        </div>
      </section>

      {ORDER_EMAIL_KINDS.map(({ kind, label }) => (
        <section key={kind} className="space-y-3 rounded-lg border p-4">
          <h2 className="text-base font-semibold">{label}</h2>
          <div className="space-y-1.5">
            <Label htmlFor={`order-email-${kind}-subject`}>Subject</Label>
            <Input
              id={`order-email-${kind}-subject`}
              value={form.letters[kind].subject}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  letters: {
                    ...f.letters,
                    [kind]: { ...f.letters[kind], subject: e.target.value },
                  },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`order-email-${kind}-body`}>Body</Label>
            <Textarea
              id={`order-email-${kind}-body`}
              className="min-h-[120px]"
              value={form.letters[kind].body}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  letters: {
                    ...f.letters,
                    [kind]: { ...f.letters[kind], body: e.target.value },
                  },
                }))
              }
            />
          </div>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Placeholders: <code>{"{{name}}"}</code>, <code>{"{{orderId}}"}</code>,{" "}
        <code>{"{{brand}}"}</code>, <code>{"{{note}}"}</code>.
      </p>
    </div>
  );
}
