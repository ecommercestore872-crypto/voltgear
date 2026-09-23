export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo";
export const DEMO_COOKIE = "vg_demo";
export const DEMO_COOKIE_VALUE = "demo";

export function isValidDemoLogin(username: string, password: string): boolean {
  return username.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD;
}

export function guestCanSee(
  row: { isDemo?: boolean | null },
  demoSession: boolean
): boolean {
  if (demoSession) return true;
  return !row.isDemo;
}

export function orderIsDemo(demoSession: boolean, productIsDemo: boolean): boolean {
  void productIsDemo;
  return demoSession;
}

export type DemoKind =
  | "product"
  | "page"
  | "testimonial"
  | "order"
  | "review"
  | "review_submission"
  | "hero"
  | "settings";

export function isPurgeable(row: { kind: DemoKind; isDemo: boolean }): boolean {
  if (row.kind === "hero" || row.kind === "settings") return false;
  return row.isDemo;
}
