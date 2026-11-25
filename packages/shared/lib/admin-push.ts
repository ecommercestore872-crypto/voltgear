import { generateVAPIDKeys, sendNotification } from "web-push";

import { getServiceClient } from "@/lib/supabase/server";

import type { PushSubscriptionInput } from "./admin-push-rules";

function adminDb() {
  return getServiceClient({ admin: true });
}

type Keys = { publicKey: string; privateKey: string };
let cachedKeys: Keys | null = null;

async function readKeys(): Promise<Keys | null> {
  const { data, error } = await adminDb()
    .from("admin_vapid_keys")
    .select("public_key, private_key")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? { publicKey: data.public_key, privateKey: data.private_key } : null;
}

/** Generated once and stored in the DB. The private key never leaves the server. */
export async function getVapidKeys(): Promise<Keys> {
  if (cachedKeys) return cachedKeys;
  let keys = await readKeys();
  if (!keys) {
    const fresh = generateVAPIDKeys();
    const { error } = await adminDb()
      .from("admin_vapid_keys")
      .upsert(
        { id: 1, public_key: fresh.publicKey, private_key: fresh.privateKey },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw error;
    keys = await readKeys(); // a concurrent request may have won the insert
    if (!keys) throw new Error("VAPID keys missing after insert");
  }
  cachedKeys = keys;
  return keys;
}

export async function saveSubscription(sub: PushSubscriptionInput, userAgent: string) {
  const { error } = await adminDb()
    .from("admin_push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent.slice(0, 300) },
      { onConflict: "endpoint" },
    );
  if (error) throw error;
}

export async function removeSubscription(endpoint: string) {
  const { error } = await adminDb().from("admin_push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}

/** Notifies every subscribed admin device. Never throws: a failed push must not break order creation. */
export async function sendAdminPush(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; removed: number }> {
  try {
    const keys = await getVapidKeys();
    const { data, error } = await adminDb()
      .from("admin_push_subscriptions")
      .select("endpoint, p256dh, auth");
    if (error) throw error;
    const subject = process.env.NEXT_PUBLIC_SITE_URL || "https://buyntryy.com";
    const message = JSON.stringify(payload);
    const results = await Promise.allSettled(
      (data ?? []).map((s) =>
        sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message, {
          vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey },
          urgency: "high",
          TTL: 3600,
        }),
      ),
    );
    let sent = 0;
    let removed = 0;
    for (const [i, r] of results.entries()) {
      if (r.status === "fulfilled") {
        sent++;
        continue;
      }
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await removeSubscription(data![i].endpoint).catch((e) => console.error("push remove failed", e));
        removed++;
      } else {
        console.error("push send failed", code ?? r.reason);
      }
    }
    return { sent, removed };
  } catch (e) {
    console.error("sendAdminPush failed", e);
    return { sent: 0, removed: 0 };
  }
}
