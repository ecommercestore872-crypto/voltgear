-- Admin web push + WhatsApp order confirmation. Additive only.

-- Phones/browsers that receive "new order" push notifications.
CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
    endpoint text PRIMARY KEY,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- One row: the VAPID key pair the server generates on first use.
CREATE TABLE IF NOT EXISTS public.admin_vapid_keys (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    public_key text NOT NULL,
    private_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- WhatsApp message log; the message id makes inbound webhook retries idempotent.
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    wa_message_id text PRIMARY KEY,
    direction text NOT NULL CHECK (direction IN ('in', 'out')),
    phone text NOT NULL,
    order_id text,
    body text,
    action text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_vapid_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_push_subscriptions, public.admin_vapid_keys, public.whatsapp_messages
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_subscriptions, public.admin_vapid_keys, public.whatsapp_messages
TO service_role;

-- Confirmation state lives on the order so the admin list can show it without a join.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS wa_confirmation_state text
        CHECK (wa_confirmation_state IN ('awaiting_reply', 'confirmed', 'declined', 'needs_attention')),
    ADD COLUMN IF NOT EXISTS wa_phone text,
    ADD COLUMN IF NOT EXISTS wa_last_reply text,
    ADD COLUMN IF NOT EXISTS wa_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_wa_awaiting_idx
    ON public.orders (wa_phone) WHERE wa_confirmation_state = 'awaiting_reply';
CREATE INDEX IF NOT EXISTS orders_wa_attention_idx
    ON public.orders (created_at DESC) WHERE wa_confirmation_state = 'needs_attention';
