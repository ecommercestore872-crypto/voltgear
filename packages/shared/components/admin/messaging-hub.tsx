"use client";

import { useState } from "react";

import { EmailCompose } from "@/components/admin/email-compose";
import { BroadcastManager } from "@/components/messaging/broadcast-manager";
import { Button } from "@/components/ui/button";

export function MessagingHub() {
  const [tab, setTab] = useState<"sms" | "email">("sms");

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Messaging channel"
      >
        <Button
          type="button"
          size="sm"
          variant={tab === "sms" ? "default" : "outline"}
          onClick={() => setTab("sms")}
        >
          SMS / WhatsApp
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "email" ? "default" : "outline"}
          onClick={() => setTab("email")}
        >
          Email
        </Button>
      </div>
      {tab === "sms" ? <BroadcastManager /> : <EmailCompose />}
    </div>
  );
}
