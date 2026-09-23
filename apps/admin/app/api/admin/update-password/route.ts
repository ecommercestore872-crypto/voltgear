import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { adminAuthEmailAllowlist } from "@/lib/admin-auth-email";
import { findAuthUserByEmail } from "@/lib/admin-auth-supabase";
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

  const supabase = getServiceClient({ admin: true });
  let userId: string | null = null;
  for (const email of adminAuthEmailAllowlist()) {
    const user = await findAuthUserByEmail(supabase, email);
    if (user) {
      userId = user.id;
      break;
    }
  }
  if (!userId) {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    if (listError || !users?.[0]) {
      return NextResponse.json(
        {
          error:
            "No Supabase admin user found. Use forgot password or ask your developer to run ensure:admin-auth.",
        },
        { status: 400 },
      );
    }
    userId = users[0].id;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
