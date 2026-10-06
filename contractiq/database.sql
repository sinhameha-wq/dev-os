-- ============================================================
-- ContractIQ — Production Database Schema
-- ============================================================
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste → Run
--
-- IDEMPOTENT: safe to re-run on an existing database.
--   Tables    — CREATE TABLE IF NOT EXISTS
--   Indexes   — CREATE INDEX IF NOT EXISTS
--   Triggers  — DROP IF EXISTS → CREATE
--   Policies  — DROP IF EXISTS → CREATE
--   Bucket    — INSERT ... ON CONFLICT DO UPDATE
--
-- TABLES (dependency order):
--   1. contracts       — one row per uploaded PDF
--   2. key_terms       — extracted terms per contract
--   3. chat_sessions   — one chat session per contract
--   4. chat_messages   — all messages in a session
--   5. user_feedback   — thumbs up/down + comment per contract
--
-- VERSION: 1.0  |  matches engineering-doc.md v1.0
-- ============================================================


-- ============================================================
-- 0. PREREQUISITES
-- ============================================================

-- gen_random_uuid() is available natively in PostgreSQL 13+
-- (Supabase uses PostgreSQL 15 — no extension required)

-- Ensure we operate in the public schema
SET search_path TO public;


-- ============================================================
-- 1. TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 1.1  contracts
-- Purpose: Central record per uploaded contract.
--          contract_text is the single source of truth for all
--          AI processing — the raw PDF file is optional (viewer only).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id            UUID         NOT NULL DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL,
  name          TEXT         NOT NULL,
  type          TEXT         NOT NULL,
  file_path     TEXT,
  contract_text TEXT         NOT NULL,
  status        TEXT         NOT NULL DEFAULT 'pending',
  page_count    INTEGER      NOT NULL,
  word_count    INTEGER      NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Primary key
  CONSTRAINT contracts_pkey PRIMARY KEY (id),

  -- Foreign keys
  CONSTRAINT contracts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Value constraints
  CONSTRAINT contracts_name_not_empty
    CHECK (length(trim(name)) > 0),
  CONSTRAINT contracts_type_valid
    CHECK (type IN ('NDA', 'MSA')),
  CONSTRAINT contracts_text_not_empty
    CHECK (length(contract_text) > 0),
  CONSTRAINT contracts_status_valid
    CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  CONSTRAINT contracts_page_count_positive
    CHECK (page_count > 0),
  CONSTRAINT contracts_word_count_non_negative
    CHECK (word_count >= 0)
);

COMMENT ON TABLE  contracts               IS 'One row per uploaded contract. Drives the full extraction and chat workflow.';
COMMENT ON COLUMN contracts.contract_text IS 'Full PDF text with [PAGE N] markers. Extracted once at upload; reused by extraction and chat routes without touching Storage.';
COMMENT ON COLUMN contracts.file_path     IS 'Path inside the contracts Storage bucket. NULL when Storage upload failed (non-blocking) — only the PDF viewer depends on this.';
COMMENT ON COLUMN contracts.status        IS 'pending → processing → complete | error. The results page polls this when status is pending or processing.';

-- ------------------------------------------------------------
-- 1.2  key_terms
-- Purpose: One row per term extracted from (or manually added to)
--          a contract. Stores the AI output plus any user edits.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_terms (
  id               UUID         NOT NULL DEFAULT gen_random_uuid(),
  contract_id      UUID         NOT NULL,
  user_id          UUID         NOT NULL,
  term_name        TEXT         NOT NULL,
  value            TEXT         NOT NULL,
  page_number      INTEGER      NOT NULL,
  confidence_score FLOAT        NOT NULL,
  source_sentence  TEXT         NOT NULL,
  is_custom        BOOLEAN      NOT NULL DEFAULT false,
  is_edited        BOOLEAN      NOT NULL DEFAULT false,
  original_value   TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT key_terms_pkey PRIMARY KEY (id),

  CONSTRAINT key_terms_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT key_terms_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  CONSTRAINT key_terms_name_not_empty
    CHECK (length(trim(term_name)) > 0),
  CONSTRAINT key_terms_value_not_empty
    CHECK (length(trim(value)) > 0),
  CONSTRAINT key_terms_page_positive
    CHECK (page_number > 0),
  CONSTRAINT key_terms_confidence_range
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  CONSTRAINT key_terms_source_not_empty
    CHECK (length(trim(source_sentence)) > 0)
);

COMMENT ON TABLE  key_terms                  IS 'Extracted terms per contract. is_custom=true for user-defined terms. original_value preserves pre-edit AI output for quality monitoring.';
COMMENT ON COLUMN key_terms.confidence_score IS '0.0–1.0. UI: green ≥ 0.8, amber ≥ 0.5, red + warning < 0.5.';
COMMENT ON COLUMN key_terms.original_value   IS 'Set on the first user edit. Never overwritten after that. Used by the feedback loop to measure correction rate.';

-- ------------------------------------------------------------
-- 1.3  chat_sessions
-- Purpose: One chat session per contract (UNIQUE on contract_id).
--          Created automatically on first POST /api/contracts/[id]/chat.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID         NOT NULL DEFAULT gen_random_uuid(),
  contract_id UUID         NOT NULL,
  user_id     UUID         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),

  -- One session per contract — enforced at DB level
  CONSTRAINT chat_sessions_contract_id_unique UNIQUE (contract_id),

  CONSTRAINT chat_sessions_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT chat_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE chat_sessions IS 'One session per contract. Created lazily on first chat message. UNIQUE on contract_id prevents duplicates even under concurrent inserts.';

-- ------------------------------------------------------------
-- 1.4  chat_messages
-- Purpose: Every message in a chat session (both roles).
--          Fetched in ascending order for context window construction.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID         NOT NULL DEFAULT gen_random_uuid(),
  session_id    UUID         NOT NULL,
  role          TEXT         NOT NULL,
  content       TEXT         NOT NULL,
  page_citation INTEGER,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),

  CONSTRAINT chat_messages_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,

  CONSTRAINT chat_messages_role_valid
    CHECK (role IN ('user', 'assistant')),
  CONSTRAINT chat_messages_content_not_empty
    CHECK (length(content) > 0),
  CONSTRAINT chat_messages_citation_positive
    CHECK (page_citation IS NULL OR page_citation > 0)
);

COMMENT ON TABLE  chat_messages               IS 'All messages in a session. Immutable once inserted. Fetched ASC up to 200 rows per GPT-4o call.';
COMMENT ON COLUMN chat_messages.page_citation IS 'Integer parsed from [Page X] in assistant responses. NULL when the model omits a citation.';

-- ------------------------------------------------------------
-- 1.5  user_feedback
-- Purpose: Post-review thumbs up/down + optional comment.
--          Aggregated to monitor extraction quality over time.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID         NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL,
  contract_id UUID         NOT NULL,
  rating      TEXT         NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT user_feedback_pkey PRIMARY KEY (id),

  CONSTRAINT user_feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_feedback_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,

  CONSTRAINT user_feedback_rating_valid
    CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  CONSTRAINT user_feedback_comment_length
    CHECK (comment IS NULL OR length(comment) <= 1000)
);

COMMENT ON TABLE user_feedback IS 'Extraction quality feedback. Alert threshold: correction_rate > 12% in any 7-day window triggers a prompt review.';


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- contracts ──────────────────────────────────────────────────
-- Primary query patterns: list by user (dashboard), filter by status
CREATE INDEX IF NOT EXISTS idx_contracts_user_id
  ON contracts (user_id);

CREATE INDEX IF NOT EXISTS idx_contracts_created_at_desc
  ON contracts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON contracts (status);

-- Composite: rate-limit check (count processing/complete/error by user in last hour)
CREATE INDEX IF NOT EXISTS idx_contracts_user_status_updated
  ON contracts (user_id, status, updated_at DESC);

-- key_terms ──────────────────────────────────────────────────
-- Primary: load all terms for a contract; secondary: user-scoped for RLS
CREATE INDEX IF NOT EXISTS idx_key_terms_contract_id
  ON key_terms (contract_id);

CREATE INDEX IF NOT EXISTS idx_key_terms_user_id
  ON key_terms (user_id);

-- Partial: analytics queries on edited terms (feedback loop)
CREATE INDEX IF NOT EXISTS idx_key_terms_edited
  ON key_terms (contract_id)
  WHERE is_edited = true;

-- chat_sessions ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract_id
  ON chat_sessions (contract_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions (user_id);

-- chat_messages ──────────────────────────────────────────────
-- Covering index: load all messages for a session ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages (session_id, created_at ASC);

-- user_feedback ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON user_feedback (user_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_contract_id
  ON user_feedback (contract_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at
  ON user_feedback (created_at DESC);


-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at on every row modification to contracts.
-- Other tables are append-only and do not need this trigger.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
-- Every table has RLS enabled.
-- The service_role key (used in API routes) bypasses RLS by design.
-- The anon/authenticated key (used client-side) is always subject to RLS.
-- All policies follow the same rule: user_id = auth.uid().

ALTER TABLE contracts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;


-- 4.1  contracts ─────────────────────────────────────────────
DROP POLICY IF EXISTS "contracts_select_own"  ON contracts;
DROP POLICY IF EXISTS "contracts_insert_own"  ON contracts;
DROP POLICY IF EXISTS "contracts_update_own"  ON contracts;
DROP POLICY IF EXISTS "contracts_delete_own"  ON contracts;

CREATE POLICY "contracts_select_own"
  ON contracts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "contracts_insert_own"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contracts_update_own"
  ON contracts FOR UPDATE
  TO authenticated
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contracts_delete_own"
  ON contracts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- 4.2  key_terms ─────────────────────────────────────────────
DROP POLICY IF EXISTS "key_terms_select_own"  ON key_terms;
DROP POLICY IF EXISTS "key_terms_insert_own"  ON key_terms;
DROP POLICY IF EXISTS "key_terms_update_own"  ON key_terms;
DROP POLICY IF EXISTS "key_terms_delete_own"  ON key_terms;

CREATE POLICY "key_terms_select_own"
  ON key_terms FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "key_terms_insert_own"
  ON key_terms FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Inline edit: user updates value, is_edited, original_value
CREATE POLICY "key_terms_update_own"
  ON key_terms FOR UPDATE
  TO authenticated
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "key_terms_delete_own"
  ON key_terms FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- 4.3  chat_sessions ─────────────────────────────────────────
-- Read + create only. Sessions are never updated or deleted directly.
DROP POLICY IF EXISTS "chat_sessions_select_own"  ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert_own"  ON chat_sessions;

CREATE POLICY "chat_sessions_select_own"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_sessions_insert_own"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- 4.4  chat_messages ─────────────────────────────────────────
-- Access is scoped through session ownership (join to chat_sessions).
-- Messages are immutable — no UPDATE or DELETE policies.
DROP POLICY IF EXISTS "chat_messages_select_own"  ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_own"  ON chat_messages;

CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );


-- 4.5  user_feedback ─────────────────────────────────────────
-- Read + create only. Feedback is never modified once submitted.
DROP POLICY IF EXISTS "user_feedback_select_own"  ON user_feedback;
DROP POLICY IF EXISTS "user_feedback_insert_own"  ON user_feedback;

CREATE POLICY "user_feedback_select_own"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_feedback_insert_own"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 5. SUPABASE STORAGE
-- ============================================================
-- Bucket: contracts (private)
-- Path pattern: {user_id}/{contract_id}/{filename}.pdf
-- The first folder segment is always the user_id.
-- (storage.foldername(name))[1] extracts this for policy checks.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,                       -- 10 MB — matches server-side validation
  ARRAY['application/pdf']        -- PDF only — belt-and-suspenders beyond server validation
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];


-- Storage object policies
DROP POLICY IF EXISTS "storage_contracts_insert_own"  ON storage.objects;
DROP POLICY IF EXISTS "storage_contracts_select_own"  ON storage.objects;
DROP POLICY IF EXISTS "storage_contracts_update_own"  ON storage.objects;
DROP POLICY IF EXISTS "storage_contracts_delete_own"  ON storage.objects;

-- Upload: authenticated users can upload only to their own folder
CREATE POLICY "storage_contracts_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Read: authenticated users can read only their own files (used for signed URLs)
CREATE POLICY "storage_contracts_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Update: needed for upsert operations during re-upload
CREATE POLICY "storage_contracts_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Delete: users can delete their own files (GDPR / manual deletion)
CREATE POLICY "storage_contracts_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- 6. VERIFICATION
-- ============================================================
-- Run these SELECT statements after the schema to confirm
-- everything was created correctly.

SELECT
  'Tables' AS check_type,
  string_agg(tablename, ', ' ORDER BY tablename) AS created
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contracts','key_terms','chat_sessions','chat_messages','user_feedback');

SELECT
  'Indexes' AS check_type,
  count(*) AS total
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('contracts','key_terms','chat_sessions','chat_messages','user_feedback');

SELECT
  'RLS policies' AS check_type,
  count(*) AS total
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contracts','key_terms','chat_sessions','chat_messages','user_feedback');

SELECT
  'Storage bucket' AS check_type,
  id AS name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'contracts';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
