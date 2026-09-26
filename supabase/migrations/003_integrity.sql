-- 003_integrity.sql
--
-- Run this once in the Supabase SQL editor, AFTER 002_security.sql.
-- Idempotent: safe to re-run.
--
-- Fixes duplicate butterflies. Three code paths awarded one by doing
--
--     SELECT ... WHERE butterfly_style_id = $1   -- nothing there
--     INSERT ...                                 -- so insert it
--
-- which is check-then-act: two calls close together both read zero rows and
-- both insert. Nothing in the schema stopped them. This was not theoretical:
-- the live database had three duplicated awards (level-c1-l1, level-c1-l2 and
-- daily-2026-07-11), which inflated the collection count on the profile screen.
--
-- The durable fix is a unique index, so the database refuses the second row no
-- matter how the callers race. The callers then switch from check-then-act to
-- `upsert(..., { onConflict: 'user_id,butterfly_style_id' })`.
--
-- ORDER MATTERS: that client change REQUIRES the index below. Without it,
-- PostgREST rejects the upsert with "no unique or exclusion constraint matching
-- the ON CONFLICT specification". Apply this migration before deploying the
-- matching application code.

-- ------------------------------------------------------- de-duplicate first
-- A unique index cannot be created while duplicates exist. Keep the earliest
-- award in each group (that is when the butterfly was genuinely earned) and
-- drop the later copies. Both rows are otherwise identical, so nothing is lost.
DELETE FROM public.butterfly_collection a
USING public.butterfly_collection b
WHERE a.user_id = b.user_id
  AND a.butterfly_style_id = b.butterfly_style_id
  AND (a.earned_at, a.id) > (b.earned_at, b.id);

-- --------------------------------------------------------------- constraint
-- A butterfly is earned once per style, per player.
CREATE UNIQUE INDEX IF NOT EXISTS butterfly_collection_user_style_key
  ON public.butterfly_collection (user_id, butterfly_style_id);

-- butterfly_collection_user_idx from 002 is now redundant: this index has
-- user_id as its leading column, so it serves the same lookups.
DROP INDEX IF EXISTS public.butterfly_collection_user_idx;
