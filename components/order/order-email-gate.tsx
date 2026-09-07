"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Lets a shopper unlock order / invoice pages with the checkout email. */
export function OrderEmailGate({
  orderId,
  pathSuffix = "",
}: {
  orderId: string;
  pathSuffix?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const q = new URLSearchParams({ email: trimmed });
    router.replace(`/order/${encodeURIComponent(orderId)}${pathSuffix}?${q}`);
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="gadget-display text-2xl text-[var(--g-charcoal)]">Confirm your order</h1>
      <p className="mt-2 text-sm text-[var(--g-taupe)]">
        Enter the email you used at checkout to view order {orderId}.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="order-access-email">Email</Label>
          <Input
            id="order-access-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" className="w-full">
          View order
        </Button>
      </form>
    </div>
  );
}
