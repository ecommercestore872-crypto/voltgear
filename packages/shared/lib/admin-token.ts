const KEY = "vg_admin_token";

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string) {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // ignore
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function adminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
