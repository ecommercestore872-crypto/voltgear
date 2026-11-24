import { readMetaExternalIdFromCookieHeader } from "./meta-identity";

export function readMetaCookieIds(cookieHeader: string): {
  fbp?: string;
  fbc?: string;
  externalId?: string;
} {
  const fbp = cookieHeader.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1];
  const fbc = cookieHeader.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1];
  const externalId = readMetaExternalIdFromCookieHeader(cookieHeader);
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(externalId ? { externalId } : {}),
  };
}
