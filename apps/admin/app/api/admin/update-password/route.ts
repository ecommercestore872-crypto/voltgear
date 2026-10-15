import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { adminAuthEmailAllowlist } from "@/lib/admin-auth-email";
import { findAuthUserByEmail } from "@/lib/admin-auth-supabase";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const password = body?.password?.trim();
  
  if (!password || password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
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
    return NextResponse.json(
      {
        error:
          "No allowlisted Supabase admin user found. Use forgot password or run ensure:admin-auth.",
      },
      { status: 400 },
    );
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

export const POST = withAdminApiObservability("POST /api/admin/update-password", POSTHandler);
