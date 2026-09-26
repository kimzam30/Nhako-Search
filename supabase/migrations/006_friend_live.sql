-- 006: live friend updates.
--
-- Friend requests used to appear only after a refresh. Now every change to
-- `friendships` is pushed to the two players involved over a PRIVATE Realtime
-- broadcast topic, `user:<uid>`. RLS on realtime.messages lets each signed-in
-- player join only their own topic, so nobody can listen in on anyone else's
-- requests. (postgres_changes was not used: DELETE events bypass RLS and would
-- leak who unfriended whom to any subscriber.)
--
-- Events (payload always carries `other`, the other player's id):
--   friend_request   to the addressee, with the requester's name + avatar
--   friend_accepted  to the requester, with the accepter's name + avatar
--   friends_changed  to everyone else involved (sent, declined, removed…)

CREATE OR REPLACE FUNCTION public.notify_friendship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO who FROM public.player_identity(NEW.requester);
    PERFORM realtime.send(
      jsonb_build_object('other', NEW.requester, 'name', who.display_name, 'avatar', who.avatar_url),
      'friend_request', 'user:' || NEW.addressee, true);
    PERFORM realtime.send(jsonb_build_object('other', NEW.addressee), 'friends_changed', 'user:' || NEW.requester, true);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
      SELECT * INTO who FROM public.player_identity(NEW.addressee);
      PERFORM realtime.send(
        jsonb_build_object('other', NEW.addressee, 'name', who.display_name, 'avatar', who.avatar_url),
        'friend_accepted', 'user:' || NEW.requester, true);
    ELSE
      PERFORM realtime.send(jsonb_build_object('other', NEW.addressee), 'friends_changed', 'user:' || NEW.requester, true);
    END IF;
    PERFORM realtime.send(jsonb_build_object('other', NEW.requester), 'friends_changed', 'user:' || NEW.addressee, true);
  ELSE
    PERFORM realtime.send(jsonb_build_object('other', OLD.addressee), 'friends_changed', 'user:' || OLD.requester, true);
    PERFORM realtime.send(jsonb_build_object('other', OLD.requester), 'friends_changed', 'user:' || OLD.addressee, true);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_friendship() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS friendships_notify ON public.friendships;
CREATE TRIGGER friendships_notify
  AFTER INSERT OR UPDATE OR DELETE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_friendship();

-- Each player may receive broadcasts on their own topic only. Public channels
-- (race rooms) are unaffected: RLS here applies to private channels.
DROP POLICY IF EXISTS "Players receive their own notifications" ON realtime.messages;
CREATE POLICY "Players receive their own notifications"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'user:' || (select auth.uid())::text
  );
