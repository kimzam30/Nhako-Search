-- 002_security.sql
--
-- Run this once in the Supabase SQL editor against an existing project.
-- Idempotent: safe to re-run.
--
-- Addresses the RLS findings from the audit (newissue.md §3):
--   S2  race results were self-reported and forgeable
--   S3  both clients inserted a history row for one match
--   S8  "Delete My Data" could not remove the profile row

-- ---------------------------------------------------------------- profiles
-- Needed so a user can erase their own profile during a data wipe.
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ------------------------------------------------------------ race_history
-- Only the room leader records a match. Previously ANY participant could
-- insert, and because both clients believed they were "player_a", a single
-- race wrote two rows. The client now writes leader-side only; this enforces it.
DROP POLICY IF EXISTS "Users can insert race history they are part of" ON public.race_history;
CREATE POLICY "Only the leader records a race"
  ON public.race_history FOR INSERT
  WITH CHECK (auth.uid() = player_a);

-- Results are immutable once written. Nothing in the app updates this table,
-- and an UPDATE policy only allowed a player to rewrite their own losses.
DROP POLICY IF EXISTS "Users can update race history they are part of" ON public.race_history;

-- A winner must actually have been in the match. This does not make results
-- unforgeable (the client still reports them) but it removes the ability to
-- credit a win to an arbitrary account.
ALTER TABLE public.race_history
  DROP CONSTRAINT IF EXISTS race_history_winner_is_participant;
ALTER TABLE public.race_history
  ADD CONSTRAINT race_history_winner_is_participant
  CHECK (winner IS NULL OR winner = player_a OR winner = player_b);

-- Guard against a self-match inflating the record.
ALTER TABLE public.race_history
  DROP CONSTRAINT IF EXISTS race_history_distinct_players;
ALTER TABLE public.race_history
  ADD CONSTRAINT race_history_distinct_players
  CHECK (player_b IS NULL OR player_a <> player_b);

-- ----------------------------------------------------------------- indexes
-- These back the stat queries on the home and profile screens.
CREATE INDEX IF NOT EXISTS level_progress_user_idx
  ON public.level_progress (user_id);
CREATE INDEX IF NOT EXISTS daily_challenge_log_user_date_idx
  ON public.daily_challenge_log (user_id, challenge_date DESC);
CREATE INDEX IF NOT EXISTS butterfly_collection_user_idx
  ON public.butterfly_collection (user_id);
CREATE INDEX IF NOT EXISTS race_history_winner_idx
  ON public.race_history (winner);

-- NOTE ON PROFILE VISIBILITY
-- `profiles` SELECT remains self-only. Partner display names travel in the
-- realtime presence payload, so there is no need to expose other users' rows.
