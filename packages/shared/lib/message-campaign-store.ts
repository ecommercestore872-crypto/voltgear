import { getServiceClient } from "@/lib/supabase/server";
import type { MessageCampaign, MessageRecipient } from "@/lib/types";

function db() {
  return getServiceClient();
}

function recipientRows(campaignId: string, recipients: MessageRecipient[]) {
  return recipients.map((recipient) => ({
    campaign_id: campaignId,
    phone: recipient.phone,
    name: recipient.name || null,
    status: recipient.status,
    message_id: recipient.messageId || null,
    error: recipient.error || null,
    sent_at: recipient.sentAt || (recipient.status === "sent" ? new Date().toISOString() : null),
  }));
}

export async function createCampaign(
  name: string | undefined,
  text: string,
  results: MessageRecipient[],
): Promise<string | null> {
  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const { data, error } = await db()
    .from("message_campaigns")
    .insert({
      name: name?.trim() || null,
      text,
      sent,
      failed,
      queued: results.length - sent - failed,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[messaging] campaign create failed:", error);
    return null;
  }

  const campaignId = String(data.id);
  if (results.length) {
    const { error: recipientError } = await db()
      .from("message_recipients")
      .insert(recipientRows(campaignId, results));
    if (recipientError) {
      console.error("[messaging] campaign recipients create failed:", recipientError);
      await db().from("message_campaigns").delete().eq("id", campaignId);
      return null;
    }
  }
  return campaignId;
}

function mapCampaign(
  row: Record<string, unknown>,
  recipients: MessageRecipient[],
): MessageCampaign {
  return {
    _id: String(row.id),
    name: row.name ? String(row.name) : undefined,
    text: String(row.text ?? ""),
    recipients,
    sent: Number(row.sent ?? 0),
    failed: Number(row.failed ?? 0),
    queued: Number(row.queued ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

async function recipientsFor(campaignId: string): Promise<MessageRecipient[]> {
  const { data, error } = await db()
    .from("message_recipients")
    .select("*")
    .eq("campaign_id", campaignId);
  if (error) {
    console.error("[messaging] campaign recipients read failed:", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    phone: String(row.phone ?? ""),
    name: row.name ? String(row.name) : undefined,
    status: row.status as MessageRecipient["status"],
    messageId: row.message_id ? String(row.message_id) : undefined,
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    error: row.error ? String(row.error) : undefined,
  }));
}

export async function listCampaigns(): Promise<MessageCampaign[]> {
  const { data, error } = await db()
    .from("message_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return Promise.all(
    (data ?? []).map(async (row) =>
      mapCampaign(row as Record<string, unknown>, await recipientsFor(String(row.id))),
    ),
  );
}

export async function getCampaign(id: string): Promise<MessageCampaign | null> {
  const { data, error } = await db()
    .from("message_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapCampaign(data as Record<string, unknown>, await recipientsFor(id));
}

export async function updateCampaignResults(
  id: string,
  recipients: MessageRecipient[],
): Promise<boolean> {
  const { error } = await db()
    .from("message_campaigns")
    .update({
      sent: recipients.filter((recipient) => recipient.status === "sent").length,
      failed: recipients.filter((recipient) => recipient.status === "failed").length,
      queued: recipients.filter((recipient) => recipient.status === "queued").length,
    })
    .eq("id", id);
  if (error) {
    console.error("[messaging] updateCampaignResults failed:", error);
    return false;
  }

  const { error: deleteError } = await db()
    .from("message_recipients")
    .delete()
    .eq("campaign_id", id);
  if (deleteError) {
    console.error("[messaging] campaign recipients delete failed:", deleteError);
    return false;
  }
  if (recipients.length) {
    const { error: insertError } = await db()
      .from("message_recipients")
      .insert(recipientRows(id, recipients));
    if (insertError) {
      console.error("[messaging] campaign recipients update failed:", insertError);
      return false;
    }
  }
  return true;
}
