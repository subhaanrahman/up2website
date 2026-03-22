-- Seed events not hosted by the current user (for testing RSVP flow).
-- Run via: supabase db reset (local) or paste into SQL Editor (hosted).
-- Seed hosts: seed-host-1@example.com, seed-host-2@example.com (password: seedhost123)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_seed_1 uuid := 'a1111111-1111-1111-1111-111111111111';
  v_seed_2 uuid := 'a2222222-2222-2222-2222-222222222222';
  v_pw text := extensions.crypt('seedhost123', extensions.gen_salt('bf'));
BEGIN
  -- Seed host 1
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_seed_1, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'seed-host-1@example.com',
    v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Seed Host One"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_seed_1, v_seed_1,
    format('{"sub":"%s","email":"seed-host-1@example.com"}', v_seed_1)::jsonb,
    'email', 'seed-host-1@example.com', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Seed host 2
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_seed_2, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'seed-host-2@example.com',
    v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Seed Host Two"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_seed_2, v_seed_2,
    format('{"sub":"%s","email":"seed-host-2@example.com"}', v_seed_2)::jsonb,
    'email', 'seed-host-2@example.com', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Ensure profiles exist (trigger may have created them; upsert if needed)
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES
    (v_seed_1, 'Seed Host One', 'seedhost1'),
    (v_seed_2, 'Seed Host Two', 'seedhost2')
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    username = COALESCE(profiles.username, EXCLUDED.username);

  -- 6 events hosted by seed users (not by you)
  INSERT INTO public.events (
    host_id, title, description, location, event_date, end_date,
    category, is_public, status, ticket_price_cents
  ) VALUES
    (v_seed_1, 'Summer Rooftop Party', 'Sunset vibes and good music', 'The Rooftop Bar, Downtown', now() + interval '3 days', now() + interval '3 days' + interval '5 hours', 'party', true, 'published', 0),
    (v_seed_1, 'Jazz Night', 'Live jazz and cocktails', 'Blue Note Lounge', now() + interval '7 days', now() + interval '7 days' + interval '4 hours', 'music', true, 'published', 0),
    (v_seed_1, 'Tech Meetup', 'Networking and lightning talks', 'WeWork Innovation Hub', now() + interval '14 days', now() + interval '14 days' + interval '3 hours', 'networking', true, 'published', 0),
    (v_seed_2, 'Beach Bonfire', 'Beach, fire, and friends', 'Santa Monica Beach', now() + interval '5 days', now() + interval '5 days' + interval '6 hours', 'party', true, 'published', 0),
    (v_seed_2, 'Yoga in the Park', 'Morning flow session', 'Central Park', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 'wellness', true, 'published', 0),
    (v_seed_2, 'Comedy Night', 'Stand-up comedy show', 'The Comedy Cellar', now() + interval '10 days', now() + interval '10 days' + interval '3 hours', 'comedy', true, 'published', 0)
  ;
END $$;
