import { isIP } from "node:net";

function cleanIp(raw: string): string | undefined {
  let value = raw.trim();
  if (!value) return undefined;
  const bracket = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) value = bracket[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.slice(0, value.lastIndexOf(":"));
  value = value.replace(/%.+$/, "");
  return isIP(value) ? value : undefined;
}

/**
 * The visitor's real IP for Meta. Reads the forwarded-for list, keeps valid
 * addresses only, prefers an IPv6 address when one is present (Meta matches
 * better on IPv6), otherwise the first valid entry. Sent as-is, never hashed.
 */
export function metaClientIp(headers: Headers): string | undefined {
  const entries = [
    ...(headers.get("x-vercel-forwarded-for") ?? "").split(","),
    ...(headers.get("x-forwarded-for") ?? "").split(","),
    headers.get("x-real-ip") ?? "",
  ].map(cleanIp).filter((ip): ip is string => Boolean(ip));
  return entries.find((ip) => isIP(ip) === 6) ?? entries[0];
}
