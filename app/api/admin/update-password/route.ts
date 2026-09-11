import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const password = body?.password?.trim();
  
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError || !users || users.length === 0) {
    // If no admin user exists, they might be using the legacy token. We cannot change a .env variable.
    return NextResponse.json({ 
      error: "No database admin user found to update. (Legacy tokens cannot be changed via the dashboard)" 
    }, { status: 400 });
  }

  // Update the first admin user
  const { error: updateError } = await supabase.auth.admin.updateUserById(users[0].id, { password });
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
