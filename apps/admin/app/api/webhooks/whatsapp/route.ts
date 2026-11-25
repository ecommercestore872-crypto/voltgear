import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { handleInboundWhatsApp } from "@/lib/whatsapp-confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta webhook verification handshake. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (token && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const given = header.slice("sha256=".length);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type WaMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
};

function textOf(m: WaMessage): string {
  return m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? "";
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { entry?: Array<{ changes?: Array<{ value?: { messages?: WaMessage[] } }> }> };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const messages = (payload.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.messages ?? []));
  for (const m of messages) {
    const text = textOf(m).trim();
    if (!m.id || !m.from || !text) continue;
    try {
      await handleInboundWhatsApp({ id: m.id, from: m.from, text });
    } catch (error) {
      // Still answer 200: a 5xx makes Meta retry the whole batch and re-run the messages that worked.
      console.error("[whatsapp] inbound handling failed:", error);
    }
  }
  return NextResponse.json({ ok: true });
}
