"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getBrowserSupabase } from "@/lib/supabase/browser-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initRecovery() {
      try {
        const supabase = getBrowserSupabase();
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (!cancelled) setReady(true);
          return;
        }

        const { data: initial } = await supabase.auth.getSession();
        if (initial.session) {
          if (!cancelled) setReady(true);
          return;
        }

        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => resolve(), 3000);
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
              window.clearTimeout(timeout);
              subscription.unsubscribe();
              if (!cancelled) setReady(true);
              resolve();
            }
          });
        });

        const { data: afterWait } = await supabase.auth.getSession();
        if (!cancelled) {
          if (afterWait.session) setReady(true);
          else {
            setBootError(
              "This reset link is invalid or expired. Request a new link from the forgot password page.",
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : "Could not verify your reset link.",
          );
        }
      }
    }

    void initRecovery();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess(true);
      window.setTimeout(() => {
        router.replace("/admin/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready && !bootError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--g-line)] bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-destructive">{bootError}</p>
          <Button asChild className="w-full" variant="outline">
            <Link href="/admin/forgot-password">Request new reset link</Link>
          </Button>
          <Link href="/admin/login" className="block text-sm text-muted-foreground hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-[var(--g-line)] bg-white p-6 shadow-sm">
        {success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Password reset!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed. Redirecting you to sign in…
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/admin/login">Sign in now</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-bold">Set new password</h1>
              <p className="text-sm text-muted-foreground">
                Enter a new password for your admin account.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting || password.length < 6} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
