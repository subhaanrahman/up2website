// One-time backfill: generate initials avatars for all profiles and organiser_profiles
// that currently have avatar_url IS NULL.
// Call via: POST /functions/v1/backfill-avatars (with service role or admin auth)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { generateAndUploadInitialsAvatar } from "../_shared/avatar.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let updatedProfiles = 0;
  let updatedOrgs = 0;

  // ── Personal profiles ──
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("user_id, display_name, first_name, last_name")
    .is("avatar_url", null);

  if (profiles) {
    for (const p of profiles) {
      const name =
        p.display_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        "User";
      try {
        const url = await generateAndUploadInitialsAvatar(
          adminClient,
          p.user_id,
          name,
        );
        await adminClient
          .from("profiles")
          .update({ avatar_url: url })
          .eq("user_id", p.user_id);
        updatedProfiles++;
      } catch (err) {
        console.error(`Failed for profile ${p.user_id}:`, err);
      }
    }
  }

  // ── Organiser profiles ──
  const { data: orgs } = await adminClient
    .from("organiser_profiles")
    .select("id, username, display_name")
    .is("avatar_url", null);

  if (orgs) {
    for (const o of orgs) {
      try {
        const url = await generateAndUploadInitialsAvatar(
          adminClient,
          `org-${o.username}`,
          o.display_name,
        );
        await adminClient
          .from("organiser_profiles")
          .update({ avatar_url: url })
          .eq("id", o.id);
        updatedOrgs++;
      } catch (err) {
        console.error(`Failed for org ${o.id}:`, err);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      updated_profiles: updatedProfiles,
      updated_organiser_profiles: updatedOrgs,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
