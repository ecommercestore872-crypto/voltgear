/** Only explicit provider rejections prove no new object was committed. */
export function isDefiniteStorageRejection(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  const raw = error.statusCode;
  const status = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{3}$/.test(raw) ? Number(raw) : undefined;
  return status !== undefined && [400, 401, 403, 404, 409, 413, 415, 422, 429].includes(status);
}

export class UncertainStorageUploadError extends Error {
  constructor() { super("Storage upload outcome is uncertain"); }
}
