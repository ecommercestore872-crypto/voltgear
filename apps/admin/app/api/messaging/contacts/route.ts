import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  addManualContact,
  getContacts,
  removeContact,
} from "@/lib/message-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Broadcast contacts.
 *   GET    /api/messaging/contacts  → order-derived + manual − suppressed
 *   POST   /api/messaging/contacts  → add a manual number
 *   DELETE /api/messaging/contacts?phone=… → delete manual / suppress order number
 *
 * All endpoints require: Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getContacts();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.phone) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }
  const result = await addManualContact({
    phone: String(body.phone),
    name: body.name ? String(body.name) : undefined,
    city: body.city ? String(body.city) : undefined,
    note: body.note ? String(body.note) : undefined,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not add." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, updated: Boolean(result.updated) });
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const phone = new URL(request.url).searchParams.get("phone");
  if (!phone) {
    return NextResponse.json(
      { error: "Phone parameter is required." },
      { status: 400 },
    );
  }
  const result = await removeContact(phone);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Could not remove that number." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
