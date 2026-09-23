import { getServiceClient } from "@/lib/supabase/server";
import { validateEmailTemplate } from "@/lib/db/email-template-rules";

function db() {
  return getServiceClient();
}

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyText: string;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): EmailTemplate {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    subject: String(row.subject ?? ""),
    bodyText: String(row.body_text ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await db()
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function createEmailTemplate(input: {
  name?: unknown;
  subject?: unknown;
  bodyText?: unknown;
}): Promise<
  { ok: true; template: EmailTemplate } | { ok: false; error: string; status: number }
> {
  const parsed = validateEmailTemplate(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };
  const { data, error } = await db()
    .from("email_templates")
    .insert({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_text: parsed.data.bodyText,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("[email-templates] create", error.message);
    return { ok: false, error: "Failed to save template.", status: 500 };
  }
  return { ok: true, template: mapRow(data as Record<string, unknown>) };
}

export async function updateEmailTemplate(
  id: string,
  input: { name?: unknown; subject?: unknown; bodyText?: unknown }
): Promise<
  { ok: true; template: EmailTemplate } | { ok: false; error: string; status: number }
> {
  const parsed = validateEmailTemplate(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };
  const { data, error } = await db()
    .from("email_templates")
    .update({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body_text: parsed.data.bodyText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[email-templates] update", error.message);
    return { ok: false, error: "Failed to update template.", status: 500 };
  }
  if (!data) return { ok: false, error: "Not found.", status: 404 };
  return { ok: true, template: mapRow(data as Record<string, unknown>) };
}

export async function deleteEmailTemplate(
  id: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data, error } = await db()
    .from("email_templates")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[email-templates] delete", error.message);
    return { ok: false, error: "Failed to delete.", status: 500 };
  }
  if (!data) return { ok: false, error: "Not found.", status: 404 };
  return { ok: true };
}
