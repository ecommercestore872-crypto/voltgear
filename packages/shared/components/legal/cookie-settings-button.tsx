import Link from "next/link";

/** Footer link to the cookie notice. There are no switches: measurement is always on. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <Link href="/cookies" className={className}>
      Cookie notice
    </Link>
  );
}
