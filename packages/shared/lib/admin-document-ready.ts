type ParsingDocument = Pick<Document, "readyState"> & Pick<EventTarget, "addEventListener">;

const pendingDocuments = new WeakMap<ParsingDocument, Promise<void>>();

/** A stable Suspense promise until parsed HTML and queued server reveals agree. */
export function adminDocumentReady(
  document: ParsingDocument | undefined,
  hasPendingReveals: () => boolean = () => false,
  nextFrame: (callback: () => void) => void = (callback) => { requestAnimationFrame(callback); },
): Promise<void> | null {
  // SSR stays enabled. Interactive/complete documents do not wait for images,
  // styles, load events or an arbitrary timer.
  if (!document) return null;
  const existing = pendingDocuments.get(document);
  if (existing) return existing;
  if (document.readyState !== "loading" && !hasPendingReveals()) return null;
  let resolveReady!: () => void;
  const pending = new Promise<void>((resolve) => { resolveReady = resolve; });
  pendingDocuments.set(document, pending);
  let started = false;
  const waitForReveals = () => {
    if (hasPendingReveals()) { nextFrame(waitForReveals); return; }
    pendingDocuments.delete(document);
    resolveReady();
  };
  const parsed = () => { if (!started) { started = true; waitForReveals(); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", parsed, { once: true });
  // Parsing may finish between the initial check and listener registration.
  if (document.readyState !== "loading") parsed();
  return pending;
}
