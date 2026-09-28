import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
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
    <div className={cn("admin-theme", adminFontClass)}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
