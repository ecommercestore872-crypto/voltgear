/** Session-only persistence for admin list filters (refresh-safe, tab-local). */

export function readAdminUiState(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeAdminUiState(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}