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

  const [phone, setPhone] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    const p = phone.trim();
    const em = email.trim().toLowerCase();
    if (p) q.set("phone", p);
    if (em) q.set("email", em);
    if (!q.toString()) return;
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
            Enter the mobile number from checkout for order {orderId}. Email is
            only needed if you added one and prefer that instead.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="order-access-phone" className="font-medium">
              Mobile number
            </Label>
            <Input
              id="order-access-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03XX XXXXXXX"
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-access-email" className="font-medium">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="order-access-email"
              type="text"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Only if you entered one at checkout"
              className="h-11"
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-semibold">
            View order
          </Button>
        </form>
      </div>
    </div>
  );
}
