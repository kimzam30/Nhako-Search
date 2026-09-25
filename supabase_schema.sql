-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Required by the "Delete My Data" flow.
CREATE POLICY "Users can delete their own profile" 
ON public.profiles FOR DELETE USING ((select auth.uid()) = id);


-- Table: level_progress
CREATE TABLE IF NOT EXISTS public.level_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  level_id text not null,
  stars integer not null default 0 check (stars >= 0 and stars <= 3),
  best_time_seconds integer,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, level_id)
);

ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own level progress" 
ON public.level_progress FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own level progress" 
ON public.level_progress FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own level progress" 
ON public.level_progress FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own level progress" 
ON public.level_progress FOR DELETE USING ((select auth.uid()) = user_id);


-- Table: daily_challenge_log
CREATE TABLE IF NOT EXISTS public.daily_challenge_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  challenge_date date not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_count integer not null default 1,
  UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily challenge log" 
ON public.daily_challenge_log FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own daily challenge log" 
ON public.daily_challenge_log FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own daily challenge log" 
ON public.daily_challenge_log FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own daily challenge log" 
ON public.daily_challenge_log FOR DELETE USING ((select auth.uid()) = user_id);


-- Table: butterfly_collection
CREATE TABLE IF NOT EXISTS public.butterfly_collection (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  butterfly_style_id text not null,
  earned_from text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- A butterfly is earned once per style, per player. Without this the award
-- paths (which used to check-then-insert) could race and grant the same
-- butterfly twice, inflating the collection count.
CREATE UNIQUE INDEX IF NOT EXISTS butterfly_collection_user_style_key
  ON public.butterfly_collection (user_id, butterfly_style_id);

ALTER TABLE public.butterfly_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own butterfly collection" 
ON public.butterfly_collection FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own butterfly collection" 
ON public.butterfly_collection FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own butterfly collection" 
ON public.butterfly_collection FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own butterfly collection" 
ON public.butterfly_collection FOR DELETE USING ((select auth.uid()) = user_id);


-- Table: race_history
CREATE TABLE IF NOT EXISTS public.race_history (
  id uuid default uuid_generate_v4() primary key,
  player_a uuid references auth.users on delete cascade not null,
  player_b uuid references auth.users on delete cascade,
  winner uuid references auth.users on delete cascade,
  difficulty_a text,
  difficulty_b text,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.race_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view race history they are part of" 
ON public.race_history FOR SELECT USING ((select auth.uid()) = player_a OR (select auth.uid()) = player_b);

-- Only the room leader records a match. Allowing any participant to insert
-- meant one race wrote two rows, because both clients believed they were player_a.
CREATE POLICY "Only the leader records a race" 
ON public.race_history FOR INSERT WITH CHECK ((select auth.uid()) = player_a);

-- No UPDATE policy: results are immutable once written. Nothing in the app
-- updates this table, and an update policy let a player rewrite their losses.

CREATE POLICY "Users can delete race history they are part of" 
ON public.race_history FOR DELETE USING ((select auth.uid()) = player_a OR (select auth.uid()) = player_b);


-- Integrity constraints: a winner must have played, and a player cannot race
-- themselves.
ALTER TABLE public.race_history
  ADD CONSTRAINT race_history_winner_is_participant
  CHECK (winner IS NULL OR winner = player_a OR winner = player_b);

ALTER TABLE public.race_history
  ADD CONSTRAINT race_history_distinct_players
  CHECK (player_b IS NULL OR player_a <> player_b);


-- Indexes backing the home and profile stat queries.
CREATE INDEX IF NOT EXISTS level_progress_user_idx
  ON public.level_progress (user_id);
CREATE INDEX IF NOT EXISTS daily_challenge_log_user_date_idx
  ON public.daily_challenge_log (user_id, challenge_date DESC);
-- butterfly_collection lookups by user_id are already served by the leading
-- column of butterfly_collection_user_style_key above.
CREATE INDEX IF NOT EXISTS race_history_winner_idx
  ON public.race_history (winner);
-- Foreign keys filtered on by the profile page and Delete My Data (004).
CREATE INDEX IF NOT EXISTS race_history_player_a_idx ON public.race_history (player_a);
CREATE INDEX IF NOT EXISTS race_history_player_b_idx ON public.race_history (player_b);
