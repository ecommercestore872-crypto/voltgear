import type { Metadata } from "next";

import { AnalyticsConsole } from "@/components/admin/analytics-console";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return <AnalyticsConsole />;
}
