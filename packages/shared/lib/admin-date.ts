const orderDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  dateStyle: "medium",
  timeStyle: "short",
});

/** Stable staff timestamps across server/browser locales and host timezones. */
export function formatAdminOrderDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : orderDate.format(date);
}
