"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      setMessage({ text: "Password updated successfully.", error: false });
      setPassword("");
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Update failed", error: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[var(--g-line)] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Change Admin Password</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Update the secure database authentication password for the admin account. (Requires Supabase Auth to be active).
      </p>
      
      <div className="flex gap-4 items-end">
        <div className="space-y-1.5 flex-1 max-w-sm">
          <Label htmlFor="new-password">New Password</Label>
          <Input 
            id="new-password"
            type="password"
            placeholder="At least 6 characters" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" disabled={submitting || !password}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Update Password
        </Button>
      </div>
      
      {message && (
        <p className={`mt-3 text-sm ${message.error ? "text-destructive" : "text-green-600 font-medium"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
