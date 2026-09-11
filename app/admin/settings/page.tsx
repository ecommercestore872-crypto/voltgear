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
    <div className="space-y-8 pb-10">
      <div className="mx-auto max-w-3xl">
        <ChangePassword />
      </div>
      <SettingsForm settings={settings as never} />
    </div>
  );
}
