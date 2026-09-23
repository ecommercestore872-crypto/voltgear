import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/messaging/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="admin-login-page flex items-center justify-center px-4 py-10 lg:px-8">
      <AdminLoginForm />
    </div>
  );
}
