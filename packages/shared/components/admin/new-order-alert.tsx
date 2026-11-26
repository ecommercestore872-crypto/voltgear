"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Play, X } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { urlBase64ToUint8Array } from "@/lib/admin-push-rules";
import { ORDER_SOUNDS, DEFAULT_ORDER_SOUND, orderSoundById } from "@/lib/admin-order-sounds";
import { formatPrice } from "@/lib/utils";

const SEEN_KEY = "admin.orders.lastSeen";
const SOUND_KEY = "admin.orders.sound";
const SOUND_ID_KEY = "admin.orders.soundId";
const PUSH_ASKED_KEY = "admin.orders.pushAsked";
const POLL_MS = 15_000;

type Latest = { orderId: string; createdAt: string; total: number; customerName: string };
type PushState = "checking" | "unsupported" | "needs-install" | "denied" | "off" | "on";

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

/** iPhone only delivers web push to apps opened from the home screen. */
function iosNeedsInstall(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

async function currentPushState(): Promise<PushState> {
  try {
    if (!pushSupported()) return iosNeedsInstall() ? "needs-install" : "unsupported";
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission !== "granted") return "off";
    const sub = await (await navigator.serviceWorker.getRegistration("/admin/"))?.pushManager.getSubscription();
    return sub ? "on" : "off";
  } catch {
    return "unsupported";
  }
}

/** Subscribes this device to order push alerts. Pass ask=true only from a tap (permission prompt). */
async function enablePush(ask: boolean): Promise<void> {
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
  // Always re-send, so a subscription the server lost is restored.
  await adminFetch("/api/admin/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
}

export function NewOrderAlert() {
  const router = useRouter();
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(true);
  const [soundId, setSoundId] = useState(DEFAULT_ORDER_SOUND);
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [pushState, setPushState] = useState<PushState>("checking");
  const [pushNote, setPushNote] = useState("");
  const [askPush, setAskPush] = useState(false);
  const onRef = useRef(true);
  const soundRef = useRef(DEFAULT_ORDER_SOUND);
  onRef.current = on;
  soundRef.current = soundId;

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

  function preview(id: string) {
    const ctx = audio();
    if (ctx) orderSoundById(id).play(ctx);
  }

  function setEnabled(next: boolean) {
    setOn(next);
    store(SOUND_KEY, next ? "1" : "0");
    if (next) preview(soundRef.current);
  }

  function pick(id: string) {
    setSoundId(id);
    store(SOUND_ID_KEY, id);
    preview(id);
  }

  async function turnOnLockScreenAlerts() {
    setAskPush(false);
    setPushNote("");
    try {
      await enablePush(true);
    } catch (error) {
      setPushNote(error instanceof Error ? error.message : "Could not turn on alerts.");
    }
    setPushState(await currentPushState());
  }

  async function sendTest() {
    setPushNote("Lock your phone now. The test alert arrives in about 5 seconds.");
    try {
      const res = (await adminFetch("/api/admin/push/test", { method: "POST" })) as { devices: number };
      if (res.devices === 0) setPushNote("No phone is subscribed yet. Turn on lock-screen alerts first.");
    } catch (error) {
      setPushNote(error instanceof Error ? error.message : "Could not send the test alert.");
    }
  }

  useEffect(() => {
    setOn(store(SOUND_KEY) !== "0");
    setSoundId(orderSoundById(store(SOUND_ID_KEY)).id);
    const unlock = () => audio();
    window.addEventListener("pointerdown", unlock, { once: true });
    void (async () => {
      // Permission already given: quietly refresh the subscription on every app open.
      if (pushSupported() && Notification.permission === "granted") await enablePush(false).catch(() => undefined);
      const state = await currentPushState();
      setPushState(state);
      if (state === "off" && store(PUSH_ASKED_KEY) !== "1") setAskPush(true);
    })();
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // The owner has seen the orders by opening the app, so the icon badge resets.
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState === "visible") {
        void (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.()?.catch(() => undefined);
      }
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
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
          if (ctx) orderSoundById(soundRef.current).play(ctx);
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

  // The in-app sound needs the page awake; lock-screen alerts do not.
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

  const lockScreen: Record<PushState, string> = {
    checking: "Checking...",
    unsupported: "This browser cannot send lock-screen alerts.",
    "needs-install": "On iPhone: tap Share, then Add to Home Screen, open the app from the home screen, and come back here.",
    denied: "Blocked. Allow notifications for this app in your phone's Settings, then reopen the app.",
    off: "Off. Turn on to get an alert even when your phone is locked.",
    on: "On for this phone. New orders appear on the lock screen.",
  };

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
      {askPush && !open ? (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-20 z-40 flex items-center gap-2 rounded-lg border bg-white p-2 text-xs shadow-lg md:left-auto md:w-80">
          <p className="flex-1">Get an alert for new orders even when your phone is locked.</p>
          <button type="button" className="min-h-10 rounded-md bg-amber-500 px-3 text-xs font-semibold text-white" onClick={() => void turnOnLockScreenAlerts()}>
            Turn on
          </button>
          <button type="button" aria-label="Not now" onClick={() => { store(PUSH_ASKED_KEY, "1"); setAskPush(false); }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {open ? (
        <>
          <button type="button" aria-label="Close sound settings" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="New order alerts" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 max-h-[80dvh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-white p-3 shadow-xl">
            <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
              Sound for new orders
              <input type="checkbox" className="h-5 w-5 accent-amber-600" checked={on} onChange={(e) => setEnabled(e.target.checked)} />
            </label>
            <ul className="mt-1 divide-y">
              {ORDER_SOUNDS.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="order-sound" className="h-4 w-4 accent-amber-600" checked={soundId === s.id} onChange={() => pick(s.id)} />
                    {s.label}
                  </label>
                  <button type="button" aria-label={`Play ${s.label}`} className="grid h-11 w-11 place-items-center rounded-md border" onClick={() => preview(s.id)}>
                    <Play className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">This sound plays while the app is open.</p>
            <div className="mt-3 border-t pt-3">
              <p className="text-sm font-semibold">Alerts when your phone is locked</p>
              <p className="mt-1 text-xs text-muted-foreground">{lockScreen[pushState]}</p>
              {pushState === "off" ? (
                <button type="button" className="mt-2 min-h-11 w-full rounded-md bg-amber-500 text-sm font-semibold text-white" onClick={() => void turnOnLockScreenAlerts()}>
                  Turn on lock-screen alerts
                </button>
              ) : null}
              {pushState === "on" ? (
                <button type="button" className="mt-2 min-h-11 w-full rounded-md border text-sm font-semibold" onClick={() => void sendTest()}>
                  Send a test alert
                </button>
              ) : null}
              {pushNote ? <p role="status" className="mt-2 text-xs text-amber-800">{pushNote}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">A locked phone plays its own alert sound. Phones do not allow a custom sound there.</p>
            </div>
          </div>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="New order sound settings"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-12 w-12 place-items-center rounded-full border bg-white shadow-lg"
      >
        {on ? <Bell className="h-5 w-5 text-amber-600" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
        {pushState === "off" ? <span aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 rounded-full bg-rose-500" /> : null}
      </button>
    </>
  );
}
