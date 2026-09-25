-- 004: RLS performance + race_history foreign-key indexes.
--
-- Every policy called auth.uid() bare, which Postgres re-evaluates for every
-- row scanned (Supabase advisor `auth_rls_initplan`, 19 warnings). Wrapping it
-- in a scalar sub-select makes it an init-plan evaluated once per statement.
-- Semantics are unchanged: each policy keeps exactly the same predicate.
--
-- race_history.player_a / player_b are foreign keys with no covering index
-- (advisor `unindexed_foreign_keys`), and both columns are filtered on by the
-- profile page and by "Delete My Data".
--
-- Safe to re-run.

-- profiles
ALTER POLICY "Users can view their own profile"   ON public.profiles USING ((select auth.uid()) = id);
ALTER POLICY "Users can update their own profile" ON public.profiles USING ((select auth.uid()) = id);
ALTER POLICY "Users can insert their own profile" ON public.profiles WITH CHECK ((select auth.uid()) = id);
ALTER POLICY "Users can delete their own profile" ON public.profiles USING ((select auth.uid()) = id);

-- level_progress
ALTER POLICY "Users can view their own level progress"   ON public.level_progress USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own level progress" ON public.level_progress WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own level progress" ON public.level_progress USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete their own level progress" ON public.level_progress USING ((select auth.uid()) = user_id);

-- daily_challenge_log
ALTER POLICY "Users can view their own daily challenge log"   ON public.daily_challenge_log USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own daily challenge log" ON public.daily_challenge_log WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own daily challenge log" ON public.daily_challenge_log USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete their own daily challenge log" ON public.daily_challenge_log USING ((select auth.uid()) = user_id);

-- butterfly_collection
ALTER POLICY "Users can view their own butterfly collection"   ON public.butterfly_collection USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own butterfly collection" ON public.butterfly_collection WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own butterfly collection" ON public.butterfly_collection USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete their own butterfly collection" ON public.butterfly_collection USING ((select auth.uid()) = user_id);

-- race_history
ALTER POLICY "Users can view race history they are part of"   ON public.race_history USING ((select auth.uid()) = player_a OR (select auth.uid()) = player_b);
ALTER POLICY "Only the leader records a race"                 ON public.race_history WITH CHECK ((select auth.uid()) = player_a);
ALTER POLICY "Users can delete race history they are part of" ON public.race_history USING ((select auth.uid()) = player_a OR (select auth.uid()) = player_b);

CREATE INDEX IF NOT EXISTS race_history_player_a_idx ON public.race_history (player_a);
CREATE INDEX IF NOT EXISTS race_history_player_b_idx ON public.race_history (player_b);
