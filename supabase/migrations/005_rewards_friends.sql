-- 005: butterfly tokens, friends, friend leaderboard, one-call player summary.
--
-- Additive only: no existing table or policy changes. Safe to re-run.
--
--  wallets            token balance per player. No INSERT/UPDATE policy: the
--                     balance only moves through adjust_tokens(), which bounds
--                     each change and refuses to go negative.
--  friendships        requester -> addressee, 'pending' | 'accepted'. Written
--                     only through the RPCs below, so nobody can accept a
--                     request on someone else's behalf.
--  profiles.friend_code  short shareable code; generated on first request.
--  get_player_summary()  everything the home/daily/profile/map screens need,
--                     in ONE round trip (was 5-7 sequential requests per tab).
--  friend_leaderboard()  stats for you + accepted friends, computed from the
--                     real game tables rather than self-reported numbers.

-- ------------------------------------------------------------------ wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  tokens integer NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  lifetime integer NOT NULL DEFAULT 0 CHECK (lifetime >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own wallet" ON public.wallets;
CREATE POLICY "Users can delete their own wallet"
  ON public.wallets FOR DELETE USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.adjust_tokens(delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  balance integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  -- One puzzle pays at most a few dozen; a spend is a single hint.
  IF delta < -50 OR delta > 250 THEN RAISE EXCEPTION 'delta out of range'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
     SET tokens = tokens + delta,
         lifetime = lifetime + GREATEST(delta, 0),
         updated_at = now()
   WHERE user_id = uid AND tokens + delta >= 0
  RETURNING tokens INTO balance;

  IF balance IS NULL THEN RAISE EXCEPTION 'insufficient tokens'; END IF;
  RETURN balance;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_tokens(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.adjust_tokens(integer) TO authenticated;

-- ------------------------------------------------------------- friend codes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_key ON public.profiles (friend_code);

CREATE OR REPLACE FUNCTION public.my_friend_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  code text;
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT friend_code INTO code FROM public.profiles WHERE id = uid;
  IF code IS NOT NULL THEN RETURN code; END IF;

  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.profiles (id, friend_code) VALUES (uid, code)
      ON CONFLICT (id) DO UPDATE SET friend_code = EXCLUDED.friend_code
      WHERE public.profiles.friend_code IS NULL;
      SELECT friend_code INTO code FROM public.profiles WHERE id = uid;
      RETURN code;
    EXCEPTION WHEN unique_violation THEN
      -- Code collision with another player: roll again.
    END;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.my_friend_code() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_code() TO authenticated;

-- -------------------------------------------------------------- friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  requester uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  addressee uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (requester, addressee),
  CHECK (requester <> addressee)
);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their own friendships" ON public.friendships;
CREATE POLICY "Users see their own friendships"
  ON public.friendships FOR SELECT
  USING ((select auth.uid()) = requester OR (select auth.uid()) = addressee);
-- Either side can end a friendship or withdraw/decline a request.
DROP POLICY IF EXISTS "Users can remove their own friendships" ON public.friendships;
CREATE POLICY "Users can remove their own friendships"
  ON public.friendships FOR DELETE
  USING ((select auth.uid()) = requester OR (select auth.uid()) = addressee);

CREATE OR REPLACE FUNCTION public.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
     WHERE status = 'accepted'
       AND ((requester = a AND addressee = b) OR (requester = b AND addressee = a))
  );
$$;
-- Internal helper for the definer functions below; not part of the API.
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM public, anon, authenticated;

/*
 * Sends a request to `target`. If they already asked us, this accepts instead.
 * Returns: 'sent' | 'accepted' | 'already' | 'self' | 'not_found'.
 */
CREATE OR REPLACE FUNCTION public.request_friend(target uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF target IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target) THEN RETURN 'not_found'; END IF;
  IF target = uid THEN RETURN 'self'; END IF;

  SELECT status INTO existing FROM public.friendships WHERE requester = uid AND addressee = target;
  IF existing IS NOT NULL THEN RETURN 'already'; END IF;

  SELECT status INTO existing FROM public.friendships WHERE requester = target AND addressee = uid;
  IF existing = 'accepted' THEN RETURN 'already'; END IF;
  IF existing = 'pending' THEN
    UPDATE public.friendships SET status = 'accepted' WHERE requester = target AND addressee = uid;
    RETURN 'accepted';
  END IF;

  -- Keep the request list bounded against spam.
  IF (SELECT count(*) FROM public.friendships WHERE requester = uid AND status = 'pending') >= 50 THEN
    RAISE EXCEPTION 'too many pending requests';
  END IF;

  INSERT INTO public.friendships (requester, addressee) VALUES (uid, target);
  RETURN 'sent';
END;
$$;
REVOKE ALL ON FUNCTION public.request_friend(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_friend(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_friend_by_code(code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  SELECT id INTO target FROM public.profiles WHERE friend_code = upper(trim(code));
  IF target IS NULL THEN RETURN 'not_found'; END IF;
  RETURN public.request_friend(target);
END;
$$;
REVOKE ALL ON FUNCTION public.request_friend_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_friend_by_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_friend(requester_id uuid, accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF accept THEN
    UPDATE public.friendships SET status = 'accepted'
     WHERE requester = requester_id AND addressee = uid AND status = 'pending';
  ELSE
    DELETE FROM public.friendships
     WHERE requester = requester_id AND addressee = uid AND status = 'pending';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_friend(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_friend(uuid, boolean) TO authenticated;

-- ------------------------------------------------------ display identity
-- A player's public face: chosen display name, else their Google name.
CREATE OR REPLACE FUNCTION public.player_identity(pid uuid)
RETURNS TABLE (display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(p.display_name, ''), u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', 'Player'),
    COALESCE(NULLIF(p.avatar_url, ''), u.raw_user_meta_data->>'avatar_url', '')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = pid;
$$;
REVOKE ALL ON FUNCTION public.player_identity(uuid) FROM public, anon, authenticated;

/*
 * Friends list with both directions of pending requests, for the Friends
 * screen. Only returns rows that involve the caller.
 */
CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, status text, incoming boolean, since timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT other, i.display_name, i.avatar_url, f.status, f.addressee = auth.uid(), f.created_at
    FROM (
      SELECT CASE WHEN requester = auth.uid() THEN addressee ELSE requester END AS other, *
        FROM public.friendships
       WHERE auth.uid() IN (requester, addressee)
    ) f
    CROSS JOIN LATERAL public.player_identity(f.other) i
   ORDER BY f.status, f.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_friends() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_friends() TO authenticated;

-- -------------------------------------------------------------- leaderboard
-- The game day rolls over at UTC+8 (lib/daily/logic.ts).
CREATE OR REPLACE FUNCTION public.game_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'UTC' + interval '8 hours')::date; $$;

CREATE OR REPLACE FUNCTION public.player_stats_for(pid uuid)
RETURNS TABLE (
  stars integer, levels integer, daily_days integer, streak integer, best_streak integer,
  race_wins integer, races integer, butterflies integer, tokens_lifetime integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT sum(stars) FROM public.level_progress WHERE user_id = pid), 0)::int,
    (SELECT count(*) FROM public.level_progress WHERE user_id = pid AND stars > 0)::int,
    (SELECT count(*) FROM public.daily_challenge_log WHERE user_id = pid)::int,
    COALESCE((SELECT CASE WHEN challenge_date >= public.game_today() - 1 THEN streak_count ELSE 0 END
                FROM public.daily_challenge_log WHERE user_id = pid
               ORDER BY challenge_date DESC LIMIT 1), 0)::int,
    COALESCE((SELECT max(streak_count) FROM public.daily_challenge_log WHERE user_id = pid), 0)::int,
    (SELECT count(*) FROM public.race_history WHERE winner = pid)::int,
    (SELECT count(*) FROM public.race_history WHERE player_a = pid OR player_b = pid)::int,
    (SELECT count(*) FROM public.butterfly_collection WHERE user_id = pid AND butterfly_style_id LIKE 'ach-%')::int,
    COALESCE((SELECT lifetime FROM public.wallets WHERE user_id = pid), 0)::int;
$$;
REVOKE ALL ON FUNCTION public.player_stats_for(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.friend_leaderboard()
RETURNS TABLE (
  user_id uuid, display_name text, avatar_url text, is_me boolean,
  stars integer, levels integer, daily_days integer, streak integer, best_streak integer,
  race_wins integer, races integer, butterflies integer, tokens_lifetime integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH people AS (
    SELECT auth.uid() AS pid
    UNION
    SELECT CASE WHEN requester = auth.uid() THEN addressee ELSE requester END
      FROM public.friendships
     WHERE status = 'accepted' AND auth.uid() IN (requester, addressee)
  )
  SELECT p.pid, i.display_name, i.avatar_url, p.pid = auth.uid(), s.*
    FROM people p
    CROSS JOIN LATERAL public.player_identity(p.pid) i
    CROSS JOIN LATERAL public.player_stats_for(p.pid) s
   WHERE p.pid IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.friend_leaderboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.friend_leaderboard() TO authenticated;

-- A friend's butterfly album (achievements only), for their profile sheet.
CREATE OR REPLACE FUNCTION public.friend_album(friend uuid)
RETURNS TABLE (butterfly_style_id text, earned_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.butterfly_style_id, b.earned_at
    FROM public.butterfly_collection b
   WHERE b.user_id = friend
     AND b.butterfly_style_id LIKE 'ach-%'
     AND (friend = auth.uid() OR public.are_friends(auth.uid(), friend));
$$;
REVOKE ALL ON FUNCTION public.friend_album(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.friend_album(uuid) TO authenticated;

-- ------------------------------------------------------------ player summary
-- Security INVOKER: every sub-select still runs under the caller's RLS.
CREATE OR REPLACE FUNCTION public.get_player_summary()
RETURNS json
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT json_build_object(
    'levels', COALESCE((SELECT json_agg(json_build_object('level_id', level_id, 'stars', stars, 'best_time_seconds', best_time_seconds))
                          FROM public.level_progress WHERE user_id = auth.uid()), '[]'::json),
    'daily', COALESCE((SELECT json_agg(json_build_object('d', challenge_date, 's', streak_count) ORDER BY challenge_date)
                         FROM public.daily_challenge_log WHERE user_id = auth.uid()), '[]'::json),
    'collection', COALESCE((SELECT json_agg(json_build_object('butterfly_style_id', butterfly_style_id, 'earned_from', earned_from, 'earned_at', earned_at))
                              FROM public.butterfly_collection WHERE user_id = auth.uid()), '[]'::json),
    'race_wins', (SELECT count(*) FROM public.race_history WHERE winner = auth.uid()),
    'races', (SELECT count(*) FROM public.race_history WHERE player_a = auth.uid() OR player_b = auth.uid()),
    'profile', (SELECT json_build_object('display_name', display_name, 'avatar_url', avatar_url, 'friend_code', friend_code)
                  FROM public.profiles WHERE id = auth.uid()),
    'wallet', (SELECT json_build_object('tokens', tokens, 'lifetime', lifetime) FROM public.wallets WHERE user_id = auth.uid()),
    'pending_requests', (SELECT count(*) FROM public.friendships WHERE addressee = auth.uid() AND status = 'pending'),
    'friends', (SELECT count(*) FROM public.friendships WHERE status = 'accepted' AND auth.uid() IN (requester, addressee))
  );
$$;
REVOKE ALL ON FUNCTION public.get_player_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_player_summary() TO authenticated;
