"use client";

import { useMemo, useRef } from "react";

import { adminFormFingerprint } from "@/lib/admin-unsaved-rules";

import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

export function useAdminFormDirty<T>(state: T, enabled = true) {
  const fingerprint = useMemo(() => adminFormFingerprint(state), [state]);
  const saved = useRef(fingerprint);
  const dirty = enabled && fingerprint !== saved.current;
  useUnsavedChangesGuard(dirty);

  return {
    dirty,
    syncSaved: () => {
      saved.current = fingerprint;
    },
    resetSaved: (next: T) => {
      saved.current = adminFormFingerprint(next);
    },
  };
}