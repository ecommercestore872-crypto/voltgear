import type { Metadata } from "next";
import dynamic from "next/dynamic";

const MessagingHub = dynamic(
  () =>
    import("@/components/admin/messaging-hub").then((m) => ({
      default: m.MessagingHub,
    })),
  { loading: () => <p className="text-sm text-muted-foreground p-6">Loading messaging…</p> },
);

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
