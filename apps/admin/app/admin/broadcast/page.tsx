import type { Metadata } from "next";

import { MessagingHub } from "@/components/admin/messaging-hub";

export const metadata: Metadata = {
  title: "Customer Messaging",
  robots: { index: false, follow: false },
};

export default function AdminBroadcastPage() {
  return (
    <div className="max-w-5xl">
      <MessagingHub />
    </div>
  );
}
