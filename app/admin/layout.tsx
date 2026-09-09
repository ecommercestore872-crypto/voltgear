import { AdminShell } from "@/components/admin/admin-shell";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={cn("admin-theme", gadgetFontClass)}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
