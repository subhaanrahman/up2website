import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * True if the user may manage guestlist / host actions for this event:
 * host, organiser owner or accepted member, or cohost (user or organiser owner).
 */
export async function userCanManageEvent(
  serviceClient: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<boolean> {
  const { data: event } = await serviceClient
    .from("events")
    .select("id, host_id, organiser_profile_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return false;

  if (event.host_id === userId) return true;

  if (event.organiser_profile_id) {
    const [orgResult, memberResult] = await Promise.all([
      serviceClient.from("organiser_profiles").select("owner_id").eq("id", event.organiser_profile_id).maybeSingle(),
      serviceClient
        .from("organiser_members")
        .select("id")
        .eq("organiser_profile_id", event.organiser_profile_id)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .maybeSingle(),
    ]);
    if (orgResult.data?.owner_id === userId || memberResult.data) return true;
  }

  const { data: cohostUser } = await serviceClient
    .from("event_cohosts")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cohostUser) return true;

  const { data: cohostOrgRows } = await serviceClient
    .from("event_cohosts")
    .select("organiser_profile_id")
    .eq("event_id", eventId)
    .not("organiser_profile_id", "is", null);

  if (cohostOrgRows && cohostOrgRows.length > 0) {
    const orgIds = cohostOrgRows.map((r: { organiser_profile_id: string }) => r.organiser_profile_id);
    const { data: orgOwners } = await serviceClient
      .from("organiser_profiles")
      .select("owner_id")
      .in("id", orgIds);
    if (orgOwners?.some((o: { owner_id: string }) => o.owner_id === userId)) return true;
  }

  return false;
}
