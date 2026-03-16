-- 0009_add_alert_subscriptions.sql — RF-POST-002: alert subscriptions with double opt-in
-- email stored encrypted (AES-256-GCM) in alert_subscriptions; plaintext only in pending (24h TTL)
-- Note: No GRANT statements here — those are in supabase/migrations/0010_add_alert_subscriptions.sql

CREATE TABLE IF NOT EXISTS public.pending_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id        UUID NOT NULL REFERENCES public.politicians(id),
  email                VARCHAR(254) NOT NULL,
  confirm_token_hash   VARCHAR(64) NOT NULL UNIQUE,
  expires_at           TIMESTAMP NOT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id        UUID NOT NULL REFERENCES public.politicians(id),
  email_encrypted      TEXT NOT NULL,
  email_hash           VARCHAR(64) NOT NULL,
  unsubscribe_token    VARCHAR(64) NOT NULL UNIQUE,
  confirmed_at         TIMESTAMP NOT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_subscriptions_politician
  ON public.pending_subscriptions(politician_id);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_politician
  ON public.alert_subscriptions(politician_id);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_email_hash
  ON public.alert_subscriptions(email_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_subscriptions_politician_email
  ON public.alert_subscriptions(politician_id, email_hash);
