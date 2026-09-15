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
    <div className="flex min-h-[70vh] items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Confirm your order
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the email you used at checkout to view order {orderId}.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="order-access-email" className="font-medium">
              Email Address
            </Label>
            <Input
              id="order-access-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11"
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-semibold">
            View Order Invoice
          </Button>
        </form>
      </div>
    </div>
  );
}
