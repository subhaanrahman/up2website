-- Ensure connections + social count RPCs work on hosted DBs where ALL TABLES grant
-- was not applied or PostgREST cache is stale. EXECUTE covers RPCs if PUBLIC was revoked.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.connections TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_friend_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_and_following_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_personal_combined_event_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_organiser_follower_count(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_organiser_past_event_count(uuid) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
