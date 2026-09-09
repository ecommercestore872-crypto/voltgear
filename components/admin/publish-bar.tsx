"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PublishStatus } from "@/lib/db/publish";

export function PublishBar({
  status,
  dirty,
  saving,
  onSave,
  onPublish,
  onUnpublish,
  onDiscard,
  hideUnpublish,
}: {
  status: PublishStatus;
  dirty?: boolean;
  saving?: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish?: () => void;
  onDiscard?: () => void;
  hideUnpublish?: boolean;
}) {
  const label =
    dirty || status === "draft"
      ? "Unsaved draft"
      : status === "unpublished"
        ? "Unpublished"
        : "Live";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{label}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {onDiscard && status !== "draft" && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            disabled={saving}
          >
            Discard draft
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        {!hideUnpublish && status === "published" && onUnpublish && (
          <Button
            type="button"
            variant="secondary"
            onClick={onUnpublish}
            disabled={saving}
          >
            Unpublish
          </Button>
        )}
        <Button type="button" onClick={onPublish} disabled={saving}>
          Publish
        </Button>
      </div>
    </div>
  );
}
