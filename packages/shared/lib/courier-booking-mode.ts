/**
 * Explicit side-effect boundary for courier booking.
 * Preview/tests must not create live PostEx shipments unless mode is "live".
 */
export type CourierBookingMode = "live" | "mock" | "disabled";

export function resolveCourierBookingMode(
  env: NodeJS.ProcessEnv = process.env,
): CourierBookingMode {
  const raw = (
    env.COURIER_BOOKING_MODE ||
    env.POSTEX_BOOKING_MODE ||
    ""
  )
    .trim()
    .toLowerCase();
  if (raw === "live" || raw === "mock" || raw === "disabled") return raw;
  // Fail closed outside explicit production: Vercel Preview / local default to mock.
  if (env.VERCEL_ENV === "production") return "live";
  return "mock";
}

export function courierBookingAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveCourierBookingMode(env) === "live";
}
