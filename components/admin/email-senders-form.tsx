"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PublishBar } from "@/components/admin/publish-bar";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublishStatus } from "@/lib/db/publish";
import {
  EMAIL_SEND_PURPOSES,
  senderFieldError,
  type EmailSendPurpose,
  type EmailSenderConfig,
} from "@/lib/email-sender-rules";

function emptyForm(): Record<EmailSendPurpose, string> {
  return Object.fromEntries(EMAIL_SEND_PURPOSES.map((p) => [p.kind, ""])) as Record<
    EmailSendPurpose,
    string
  >;
}

function fromConfig(config?: EmailSenderConfig | null) {
  const form = emptyForm();
  for (const purpose of EMAIL_SEND_PURPOSES) {
    form[purpose.kind] = config?.[purpose.kind] ?? "";
  }
  return form;
}

export function EmailSendersForm({
  config,
  hasDraft,
  fallbackFrom,
}: {
  config?: EmailSenderConfig | null;
  hasDraft?: boolean;
  fallbackFrom?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => fromConfig(config));
  const [status, setStatus] = useState<PublishStatus>(hasDraft ? "draft" : "published");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(kind: EmailSendPurpose, value: string) {
    setForm((f) => ({ ...f, [kind]: value }));
  }

  async function run(action: "save" | "publish" | "discard") {
    const invalid = EMAIL_SEND_PURPOSES.map((p) => {
      const err = senderFieldError(form[p.kind]);
      return err ? `${p.label}: ${err}` : null;
    }).find(Boolean);
    if (action !== "discard" && invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/admin/email-senders", {
        method: "PATCH",
        body: JSON.stringify({ action, doc: form }),
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
        <h1 className="text-2xl font-semibold">Email sending</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For each job, set the From address on your verified Resend domain. Empty fields use{" "}
          <code className="text-xs">{fallbackFrom || "FROM_EMAIL"}</code>. The mailbox domain must
          show as Verified in{" "}
          <a
            href="https://resend.com/domains"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Resend → Domains
          </a>
          . Shoppers still receive order mail at the address they typed at checkout. Letter copy:{" "}
          <Link href="/admin/order-emails" className="underline underline-offset-2">
            Order emails
          </Link>
          .
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

      <section className="space-y-1 rounded-lg border">
        {EMAIL_SEND_PURPOSES.map((purpose, index) => (
          <div
            key={purpose.kind}
            className={`grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,16rem)_1fr] sm:items-center ${
              index > 0 ? "border-t" : ""
            }`}
          >
            <div>
              <Label htmlFor={`sender-${purpose.kind}`}>{purpose.label}</Label>
              <p className="text-xs text-muted-foreground">{purpose.hint}</p>
            </div>
            <Input
              id={`sender-${purpose.kind}`}
              type="text"
              inputMode="email"
              autoComplete="off"
              placeholder="noreply@mail.buyntryy.com"
              value={form[purpose.kind]}
              onChange={(e) => setField(purpose.kind, e.target.value)}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
