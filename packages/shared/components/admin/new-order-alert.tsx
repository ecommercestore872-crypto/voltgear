"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Play, X } from "lucide-react";

import { adminFetch } from "@/components/admin/admin-fetch";
import { ORDER_SOUNDS, DEFAULT_ORDER_SOUND, orderSoundById } from "@/lib/admin-order-sounds";
import { formatPrice } from "@/lib/utils";

const SEEN_KEY = "admin.orders.lastSeen";
const SOUND_KEY = "admin.orders.sound";
const SOUND_ID_KEY = "admin.orders.soundId";
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

export function NewOrderAlert() {
  const router = useRouter();
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(true);
  const [soundId, setSoundId] = useState(DEFAULT_ORDER_SOUND);
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<Latest | null>(null);
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

  useEffect(() => {
    setOn(store(SOUND_KEY) !== "0");
    setSoundId(orderSoundById(store(SOUND_ID_KEY)).id);
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
      {open ? (
        <>
          <button type="button" aria-label="Close sound settings" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="New order sound" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-white p-3 shadow-xl">
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
            <p className="mt-2 text-xs text-muted-foreground">Plays while the app is open. If you hear nothing on iPhone, turn the silent switch off.</p>
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
      </button>
    </>
  );
}
