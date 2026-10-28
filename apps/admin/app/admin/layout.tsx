import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHydrationBoundary } from "@/components/admin/admin-hydration-boundary";
import { adminFontClass } from "../../lib/admin-fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminHydrationBoundary>
      <div className={cn("admin-theme", adminFontClass)}>
        <AdminShell>{children}</AdminShell>
      </div>
    </AdminHydrationBoundary>
  );
}
