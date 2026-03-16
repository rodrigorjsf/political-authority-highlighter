-- 0010_add_alert_subscriptions.sql — RF-POST-002: alert subscriptions with double opt-in
-- email stored encrypted (AES-256-GCM) in alert_subscriptions; plaintext only in pending (24h TTL)

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

-- Grant SELECT to api_reader (existing pattern)
GRANT SELECT ON TABLE public.pending_subscriptions TO api_reader;
GRANT SELECT ON TABLE public.alert_subscriptions TO api_reader;

-- Grant INSERT/UPDATE/DELETE on subscription tables to api_reader
-- Rationale: subscription tables are user-facing public data managed by the API layer
-- NOT internal_data; api_reader remains read-only on all other public tables
GRANT INSERT, DELETE ON TABLE public.pending_subscriptions TO api_reader;
GRANT INSERT, UPDATE, DELETE ON TABLE public.alert_subscriptions TO api_reader;

-- Grant full access to pipeline_admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_subscriptions TO pipeline_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_subscriptions TO pipeline_admin;
