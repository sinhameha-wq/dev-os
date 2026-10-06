-- ============================================================
-- ContractIQ — Security Additions
-- Run this AFTER database.sql in the Supabase SQL Editor.
-- Idempotent — safe to re-run.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- rate_limit_events
-- Backing store for the sliding-window rate limiter.
-- Accessed exclusively via the service_role key — no user-facing
-- policies are needed (users must not see or manipulate their counts).
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         UUID         NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  action     TEXT         NOT NULL
                          CONSTRAINT rate_limit_events_action_valid
                          CHECK (action IN ('auth', 'upload', 'process', 'chat')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT rate_limit_events_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE rate_limit_events IS
  'Sliding-window rate limiter backing store. Read and written exclusively via the service_role key (RLS enabled, no user policies).';

-- Covering index for the sliding-window query
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON rate_limit_events (user_id, action, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no user-facing policies — service_role bypasses RLS.


-- ────────────────────────────────────────────────────────────
-- Re-apply RLS on all tables (idempotent)
-- ────────────────────────────────────────────────────────────

ALTER TABLE contracts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- Storage bucket hardening
-- Updates the existing contracts bucket to enforce file limits.
-- ────────────────────────────────────────────────────────────

UPDATE storage.buckets
SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'contracts';


-- ────────────────────────────────────────────────────────────
-- Verification
-- ────────────────────────────────────────────────────────────

SELECT 'rate_limit_events' AS table_name,
       count(*)             AS row_count
FROM rate_limit_events;
