import type { Metadata } from "next";

import { DemoLoginForm } from "@/components/demo/demo-login-form";

export const metadata: Metadata = {
  title: "Demo sign in",
  robots: { index: false, follow: false },
};

export default function DemoLoginPage() {
  return (
    <div className="container mx-auto px-4 py-10 lg:px-8">
      <DemoLoginForm />
    </div>
  );
}
