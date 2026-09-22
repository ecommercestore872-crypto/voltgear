import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normalizeAdminEmail } from "@/lib/admin-auth-email";

export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = normalizeAdminEmail(email);
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users ?? [];
    const hit = users.find((u) => normalizeAdminEmail(u.email ?? "") === target);
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
  }
}

export async function ensureAuthUserForEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User> {
  const normalized = normalizeAdminEmail(email);
  const existing = await findAuthUserByEmail(supabase, normalized);
  if (existing) return existing;

  const tempPassword = crypto.randomUUID() + crypto.randomUUID();
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalized,
    password: tempPassword,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Could not create admin auth user.");
  return data.user;
}