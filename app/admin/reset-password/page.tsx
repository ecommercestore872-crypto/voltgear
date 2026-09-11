"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The hash fragment from the email link usually contains the access token.
    // Supabase JS auto-parses it, but since we are doing this strictly securely via our API route, 
    // we can either use client supabase here, or grab the token. 
    // Best practice for Supabase PKCE is using client side initialization:
    async function initAuth() {
      const { createClient } = await import("@supabase/supabase-js");
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        // This call lets Supabase client automatically scrape the URL hash for recovery tokens
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
        } else {
          // Listen for recovery event
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || session) {
              setReady(true);
            }
          });
          // Timeout fallback - if hash existed but processed silently
          setTimeout(() => setReady(true), 1000); 
        }
      } else {
        setReady(true); // Failsafe
      }
    }
    initAuth();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) throw updateError;
      
      setSuccess(true);
      // Wait a moment then redirect to login
      setTimeout(() => {
        router.replace("/admin/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-[var(--g-line)] bg-white p-6 shadow-sm">
        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Password Reset!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed successfully. Redirecting you to sign in...
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/admin/login">Sign in now</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-bold">Set New Password</h1>
              <p className="text-sm text-muted-foreground">
                Please enter your new high-security password below.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting || password.length < 6} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
