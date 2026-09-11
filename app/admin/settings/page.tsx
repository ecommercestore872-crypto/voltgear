import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { ChangePassword } from "@/components/admin/change-password";
import { getAdminSettings } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  return (
    <div className="space-y-12">
      <SettingsForm settings={settings as never} />
      <div className="mx-auto max-w-5xl border-t pt-10">
        <ChangePassword />
      </div>
    </div>
  );
}
