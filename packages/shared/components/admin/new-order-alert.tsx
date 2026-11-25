"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { urlBase64ToUint8Array } from "@/lib/admin-push-rules";
import { formatPrice } from "@/lib/utils";

const SEEN_KEY = "admin.orders.lastSeen";
const SOUND_KEY = "admin.orders.sound";
const HINT_KEY = "admin.orders.pushHint";
const POLL_MS = 15_000;

type Latest = { orderId: string; createdAt: string; total: number; customerName: string };

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null; // private mode: alerts still work for this session
  }
}

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Subscribes this device to order push alerts. Pass ask=true only from a tap (permission prompt). */
async function enablePush(ask: boolean) {
  try {
    if (!pushSupported()) return;
    if (ask && Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = (await adminFetch("/api/admin/push/key")) as { publicKey: string };
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }
    await adminFetch("/api/admin/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
  } catch {
    // push is a bonus: the in-app chime keeps working
  }
}

async function disablePush() {
  try {
    if (!pushSupported()) return;
    const sub = await (await navigator.serviceWorker.getRegistration("/admin/"))?.pushManager.getSubscription();
    if (!sub) return;
    await adminFetch("/api/admin/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  } catch {
    // already gone or offline
  }
}

/** Cash-register "ka-ching": two struck-bell notes, synthesised so there is no audio file to host or license. */
function chime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.7;
  out.connect(ctx.destination);
  for (const [delay, freq] of [[0, 1318.5], [0.12, 1975.5]]) {
    [1, 2.76, 5.4].forEach((partial, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t0 + delay;
      osc.frequency.value = freq * partial;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5 / (i + 1), start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6 / (i + 1));
      osc.connect(gain).connect(out);
      osc.start(start);
      osc.stop(start + 1.7);
    });
  }
}

export function NewOrderAlert() {
  const router = useRouter();
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [hint, setHint] = useState("");
  const onRef = useRef(false);
  onRef.current = on;

  // Browsers only allow sound after a tap, so the context is created or resumed inside a gesture.
  function audio(): AudioContext | null {
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback"; // iOS: ignore the silent switch
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current ??= new Ctx();
      void ctxRef.current.resume();
      return ctxRef.current;
    } catch {
      return null;
    }
  }

  function toggle() {
    const next = !on;
    setOn(next);
    store(SOUND_KEY, next ? "1" : "0");
    if (next) {
      const ctx = audio();
      if (ctx) chime(ctx); // doubles as a test
      void enablePush(true);
    } else {
      void disablePush();
    }
  }

  useEffect(() => {
    const saved = store(SOUND_KEY) !== "0";
    setOn(saved);
    if (!saved) return;
    if (pushSupported()) void enablePush(false);
    else if (store(HINT_KEY) !== "1") {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      setHint(
        ios
          ? "For alerts when the screen is off: Share, Add to Home Screen, then open the app from the home screen and tap the bell."
          : "This browser cannot send alerts when the screen is off.",
      );
    }
    const unlock = () => audio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let live = true;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      try {
        const data = (await adminFetch("/api/admin/orders/latest")) as { latest: Latest | null };
        if (!live || !data.latest) return;
        const seen = store(SEEN_KEY);
        store(SEEN_KEY, data.latest.createdAt);
        // First run only sets the baseline, so nothing rings for old orders.
        if (seen && Date.parse(data.latest.createdAt) > Date.parse(seen)) {
          setLatest(data.latest);
          const ctx = onRef.current ? audio() : null;
          if (ctx) chime(ctx);
          router.refresh();
        }
      } catch {
        // offline or signed out: try again on the next tick
      }
    }
    void poll();
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [router]);

  // A locked phone stops polling, so keep the screen awake while alerts are on.
  useEffect(() => {
    if (!on) return;
    let lock: WakeLockSentinel | null = null;
    const take = () => {
      if (document.visibilityState === "visible") {
        navigator.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
      }
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      document.removeEventListener("visibilitychange", take);
      void lock?.release();
    };
  }, [on]);

  return (
    <>
      {latest ? (
        <div role="status" className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex items-center gap-3 rounded-xl border border-amber-500 bg-amber-50 p-3 shadow-lg md:left-auto md:w-96">
          <Link href="/admin/orders?tab=new" onClick={() => setLatest(null)} className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900">New order {latest.orderId}</p>
            <p className="truncate text-xs text-amber-900">
              {latest.customerName || "Customer"} · {formatPrice(latest.total)} · tap to confirm
            </p>
          </Link>
          <button type="button" aria-label="Dismiss" className="grid h-9 w-9 place-items-center rounded-md" onClick={() => setLatest(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {hint ? (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-20 z-40 flex items-start gap-2 rounded-lg border bg-white p-2 text-xs shadow-lg md:left-auto md:w-80">
          <p className="flex-1">{hint}</p>
          <button type="button" aria-label="Dismiss hint" onClick={() => { store(HINT_KEY, "1"); setHint(""); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? "Order sound on. Tap to turn off" : "Order sound off. Tap to turn on"}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-12 w-12 place-items-center rounded-full border bg-white shadow-lg"
      >
        {on ? <Bell className="h-5 w-5 text-amber-600" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
      </button>
    </>
  );
}
