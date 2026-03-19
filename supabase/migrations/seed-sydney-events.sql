-- Sydney Events March 2026 seed (from Sydney_Events_March2026.xlsx)
-- Run: supabase db reset (local) or paste into SQL Editor (hosted)
-- Organiser accounts: sydney-org-1@seed.sydney, sydney-org-2@seed.sydney, ... (password: seedhost123)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_pw text := crypt('seedhost123', gen_salt('bf'));
  v_uid_1 uuid := '90ac0dd5-60d3-43d1-ab25-0000bcc506cf'::uuid;
  v_uid_2 uuid := '52fa6aaf-eac9-4ae3-a59f-00002895eafd'::uuid;
  v_uid_3 uuid := '3bb1c696-6e1a-459e-aff6-00006e31bd22'::uuid;
  v_uid_4 uuid := 'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b'::uuid;
  v_uid_5 uuid := 'c39790ee-f682-4c16-afce-0000843fc1aa'::uuid;
  v_uid_6 uuid := '7fc06311-b577-47dd-a421-00007b475a43'::uuid;
  v_uid_7 uuid := '75a0320e-5e62-4ab6-a2ee-0000bae3b70a'::uuid;
  v_uid_8 uuid := '3af9c624-6afc-4fd4-a864-00006089b4ac'::uuid;
  v_uid_9 uuid := 'a22ee8f2-5e9e-444a-a812-0000097b49f6'::uuid;
  v_uid_10 uuid := '0a55c8c0-7d40-41c0-a4c0-0000c45de640'::uuid;
  v_uid_11 uuid := '31fb5b75-8033-44f1-a2c5-0000b5a7c9af'::uuid;
  v_uid_12 uuid := '49686b29-ee1f-4115-adb9-000072bff40b'::uuid;
  v_uid_13 uuid := '56c9f232-9f5e-4c8a-a552-000070fcf9b6'::uuid;
  v_uid_14 uuid := '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b'::uuid;
  v_uid_15 uuid := '416034a6-708a-4c6e-af06-0000da23e852'::uuid;
  v_uid_16 uuid := '14c3838e-98e2-4e36-ac6e-00008a82c38a'::uuid;
  v_uid_17 uuid := '4e4a697b-e25d-4b3f-a12b-0000cf85d421'::uuid;
  v_uid_18 uuid := 'bed4e003-2015-4027-a033-000029cca039'::uuid;
BEGIN

  -- Organiser: Amazing Silent Discos
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '90ac0dd5-60d3-43d1-ab25-0000bcc506cf', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-1@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Amazing Silent Discos"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '90ac0dd5-60d3-43d1-ab25-0000bcc506cf', '90ac0dd5-60d3-43d1-ab25-0000bcc506cf',
    format('{"sub":"%s","email":"sydney-org-1@seed.sydney"}', '90ac0dd5-60d3-43d1-ab25-0000bcc506cf')::jsonb,
    'email', 'sydney-org-1@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: BO & TESOLIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '52fa6aaf-eac9-4ae3-a59f-00002895eafd', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-2@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"BO & TESOLIN"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '52fa6aaf-eac9-4ae3-a59f-00002895eafd', '52fa6aaf-eac9-4ae3-a59f-00002895eafd',
    format('{"sub":"%s","email":"sydney-org-2@seed.sydney"}', '52fa6aaf-eac9-4ae3-a59f-00002895eafd')::jsonb,
    'email', 'sydney-org-2@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: The Island Sydney
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '3bb1c696-6e1a-459e-aff6-00006e31bd22', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-3@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"The Island Sydney"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '3bb1c696-6e1a-459e-aff6-00006e31bd22', '3bb1c696-6e1a-459e-aff6-00006e31bd22',
    format('{"sub":"%s","email":"sydney-org-3@seed.sydney"}', '3bb1c696-6e1a-459e-aff6-00006e31bd22')::jsonb,
    'email', 'sydney-org-3@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Home Sydney
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-4@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Home Sydney"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b', 'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b',
    format('{"sub":"%s","email":"sydney-org-4@seed.sydney"}', 'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b')::jsonb,
    'email', 'sydney-org-4@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Glass Island
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    'c39790ee-f682-4c16-afce-0000843fc1aa', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-5@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Glass Island"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'c39790ee-f682-4c16-afce-0000843fc1aa', 'c39790ee-f682-4c16-afce-0000843fc1aa',
    format('{"sub":"%s","email":"sydney-org-5@seed.sydney"}', 'c39790ee-f682-4c16-afce-0000843fc1aa')::jsonb,
    'email', 'sydney-org-5@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Penguin Random House Australia
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '7fc06311-b577-47dd-a421-00007b475a43', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-6@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Penguin Random House Australia"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '7fc06311-b577-47dd-a421-00007b475a43', '7fc06311-b577-47dd-a421-00007b475a43',
    format('{"sub":"%s","email":"sydney-org-6@seed.sydney"}', '7fc06311-b577-47dd-a421-00007b475a43')::jsonb,
    'email', 'sydney-org-6@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Marching Elephants Ent & The Laughter Factory
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '75a0320e-5e62-4ab6-a2ee-0000bae3b70a', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-7@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Marching Elephants Ent & The Laughter Factory"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '75a0320e-5e62-4ab6-a2ee-0000bae3b70a', '75a0320e-5e62-4ab6-a2ee-0000bae3b70a',
    format('{"sub":"%s","email":"sydney-org-7@seed.sydney"}', '75a0320e-5e62-4ab6-a2ee-0000bae3b70a')::jsonb,
    'email', 'sydney-org-7@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: WAO Superclub
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '3af9c624-6afc-4fd4-a864-00006089b4ac', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-8@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"WAO Superclub"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '3af9c624-6afc-4fd4-a864-00006089b4ac', '3af9c624-6afc-4fd4-a864-00006089b4ac',
    format('{"sub":"%s","email":"sydney-org-8@seed.sydney"}', '3af9c624-6afc-4fd4-a864-00006089b4ac')::jsonb,
    'email', 'sydney-org-8@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: MYST Nightclub
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    'a22ee8f2-5e9e-444a-a812-0000097b49f6', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-9@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"MYST Nightclub"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'a22ee8f2-5e9e-444a-a812-0000097b49f6', 'a22ee8f2-5e9e-444a-a812-0000097b49f6',
    format('{"sub":"%s","email":"sydney-org-9@seed.sydney"}', 'a22ee8f2-5e9e-444a-a812-0000097b49f6')::jsonb,
    'email', 'sydney-org-9@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: FEFA LAND
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '0a55c8c0-7d40-41c0-a4c0-0000c45de640', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-10@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"FEFA LAND"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '0a55c8c0-7d40-41c0-a4c0-0000c45de640', '0a55c8c0-7d40-41c0-a4c0-0000c45de640',
    format('{"sub":"%s","email":"sydney-org-10@seed.sydney"}', '0a55c8c0-7d40-41c0-a4c0-0000c45de640')::jsonb,
    'email', 'sydney-org-10@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Dianne Mayne
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '31fb5b75-8033-44f1-a2c5-0000b5a7c9af', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-11@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dianne Mayne"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '31fb5b75-8033-44f1-a2c5-0000b5a7c9af', '31fb5b75-8033-44f1-a2c5-0000b5a7c9af',
    format('{"sub":"%s","email":"sydney-org-11@seed.sydney"}', '31fb5b75-8033-44f1-a2c5-0000b5a7c9af')::jsonb,
    'email', 'sydney-org-11@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Uncharted Sydney
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '49686b29-ee1f-4115-adb9-000072bff40b', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-12@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Uncharted Sydney"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '49686b29-ee1f-4115-adb9-000072bff40b', '49686b29-ee1f-4115-adb9-000072bff40b',
    format('{"sub":"%s","email":"sydney-org-12@seed.sydney"}', '49686b29-ee1f-4115-adb9-000072bff40b')::jsonb,
    'email', 'sydney-org-12@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: LIMITED EDITION BAND
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '56c9f232-9f5e-4c8a-a552-000070fcf9b6', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-13@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"LIMITED EDITION BAND"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '56c9f232-9f5e-4c8a-a552-000070fcf9b6', '56c9f232-9f5e-4c8a-a552-000070fcf9b6',
    format('{"sub":"%s","email":"sydney-org-13@seed.sydney"}', '56c9f232-9f5e-4c8a-a552-000070fcf9b6')::jsonb,
    'email', 'sydney-org-13@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Australian Institute of Business
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-14@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Australian Institute of Business"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b', '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b',
    format('{"sub":"%s","email":"sydney-org-14@seed.sydney"}', '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b')::jsonb,
    'email', 'sydney-org-14@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Sydney Queer Irish
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '416034a6-708a-4c6e-af06-0000da23e852', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-15@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sydney Queer Irish"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '416034a6-708a-4c6e-af06-0000da23e852', '416034a6-708a-4c6e-af06-0000da23e852',
    format('{"sub":"%s","email":"sydney-org-15@seed.sydney"}', '416034a6-708a-4c6e-af06-0000da23e852')::jsonb,
    'email', 'sydney-org-15@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Woollahra Municipal Council
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '14c3838e-98e2-4e36-ac6e-00008a82c38a', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-16@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Woollahra Municipal Council"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '14c3838e-98e2-4e36-ac6e-00008a82c38a', '14c3838e-98e2-4e36-ac6e-00008a82c38a',
    format('{"sub":"%s","email":"sydney-org-16@seed.sydney"}', '14c3838e-98e2-4e36-ac6e-00008a82c38a')::jsonb,
    'email', 'sydney-org-16@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: Emo Night
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '4e4a697b-e25d-4b3f-a12b-0000cf85d421', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-17@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Emo Night"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    '4e4a697b-e25d-4b3f-a12b-0000cf85d421', '4e4a697b-e25d-4b3f-a12b-0000cf85d421',
    format('{"sub":"%s","email":"sydney-org-17@seed.sydney"}', '4e4a697b-e25d-4b3f-a12b-0000cf85d421')::jsonb,
    'email', 'sydney-org-17@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Organiser: VIVID Photography & Imaging
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    'bed4e003-2015-4027-a033-000029cca039', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'sydney-org-18@seed.sydney', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"VIVID Photography & Imaging"}',
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    'bed4e003-2015-4027-a033-000029cca039', 'bed4e003-2015-4027-a033-000029cca039',
    format('{"sub":"%s","email":"sydney-org-18@seed.sydney"}', 'bed4e003-2015-4027-a033-000029cca039')::jsonb,
    'email', 'sydney-org-18@seed.sydney', now(), now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Profiles for organisers
  INSERT INTO public.profiles (user_id, display_name, username) VALUES
    ('90ac0dd5-60d3-43d1-ab25-0000bcc506cf', 'Amazing Silent Discos', 'sydney-org-1'),
    ('52fa6aaf-eac9-4ae3-a59f-00002895eafd', 'BO & TESOLIN', 'sydney-org-2'),
    ('3bb1c696-6e1a-459e-aff6-00006e31bd22', 'The Island Sydney', 'sydney-org-3'),
    ('cfcbabe9-b35f-4ad5-aa79-00006c1dc24b', 'Home Sydney', 'sydney-org-4'),
    ('c39790ee-f682-4c16-afce-0000843fc1aa', 'Glass Island', 'sydney-org-5'),
    ('7fc06311-b577-47dd-a421-00007b475a43', 'Penguin Random House Australia', 'sydney-org-6'),
    ('75a0320e-5e62-4ab6-a2ee-0000bae3b70a', 'Marching Elephants Ent & The Laughter Factory', 'sydney-org-7'),
    ('3af9c624-6afc-4fd4-a864-00006089b4ac', 'WAO Superclub', 'sydney-org-8'),
    ('a22ee8f2-5e9e-444a-a812-0000097b49f6', 'MYST Nightclub', 'sydney-org-9'),
    ('0a55c8c0-7d40-41c0-a4c0-0000c45de640', 'FEFA LAND', 'sydney-org-10'),
    ('31fb5b75-8033-44f1-a2c5-0000b5a7c9af', 'Dianne Mayne', 'sydney-org-11'),
    ('49686b29-ee1f-4115-adb9-000072bff40b', 'Uncharted Sydney', 'sydney-org-12'),
    ('56c9f232-9f5e-4c8a-a552-000070fcf9b6', 'LIMITED EDITION BAND', 'sydney-org-13'),
    ('9829dd39-0c8f-4be5-a0c9-00004b1b6b3b', 'Australian Institute of Business', 'sydney-org-14'),
    ('416034a6-708a-4c6e-af06-0000da23e852', 'Sydney Queer Irish', 'sydney-org-15'),
    ('14c3838e-98e2-4e36-ac6e-00008a82c38a', 'Woollahra Municipal Council', 'sydney-org-16'),
    ('4e4a697b-e25d-4b3f-a12b-0000cf85d421', 'Emo Night', 'sydney-org-17'),
    ('bed4e003-2015-4027-a033-000029cca039', 'VIVID Photography & Imaging', 'sydney-org-18')
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, username = COALESCE(profiles.username, EXCLUDED.username);

  -- Organiser profiles
  INSERT INTO public.organiser_profiles (id, owner_id, display_name, username, category, city) VALUES
    ('2ebeec1c-74c4-4d6c-addc-0000782b8614', '90ac0dd5-60d3-43d1-ab25-0000bcc506cf', 'Amazing Silent Discos', 'sydney-org-1', 'Promoter', 'Sydney'),
    ('c823b2c8-e378-4428-af48-0000daa644d8', '52fa6aaf-eac9-4ae3-a59f-00002895eafd', 'BO & TESOLIN', 'sydney-org-2', 'Promoter', 'Sydney'),
    ('d004e05d-228b-44b9-a62d-0000705ca6e7', '3bb1c696-6e1a-459e-aff6-00006e31bd22', 'The Island Sydney', 'sydney-org-3', 'Promoter', 'Sydney'),
    ('ffcb66f0-d090-4a30-a5f0-0000fc18a3d0', 'cfcbabe9-b35f-4ad5-aa79-00006c1dc24b', 'Home Sydney', 'sydney-org-4', 'Promoter', 'Sydney'),
    ('938f36c7-7f71-481b-a337-0000f3a110c5', 'c39790ee-f682-4c16-afce-0000843fc1aa', 'Glass Island', 'sydney-org-5', 'Promoter', 'Sydney'),
    ('0665a4aa-80a6-4ca2-af4a-0000798b389e', '7fc06311-b577-47dd-a421-00007b475a43', 'Penguin Random House Australia', 'sydney-org-6', 'Promoter', 'Sydney'),
    ('f0da1115-7793-4e11-a265-0000e02f448f', '75a0320e-5e62-4ab6-a2ee-0000bae3b70a', 'Marching Elephants Ent & The Laughter Factory', 'sydney-org-7', 'Promoter', 'Sydney'),
    ('69f6db6b-ffed-446f-a21b-0000dd5248f1', '3af9c624-6afc-4fd4-a864-00006089b4ac', 'WAO Superclub', 'sydney-org-8', 'Promoter', 'Sydney'),
    ('52d47c8b-67cd-430f-a53b-000025c53e51', 'a22ee8f2-5e9e-444a-a812-0000097b49f6', 'MYST Nightclub', 'sydney-org-9', 'Promoter', 'Sydney'),
    ('7f7f10d9-75ef-4b05-ae69-0000766e401b', '0a55c8c0-7d40-41c0-a4c0-0000c45de640', 'FEFA LAND', 'sydney-org-10', 'Promoter', 'Sydney'),
    ('60f870bc-1524-498c-ac7c-000032705df4', '31fb5b75-8033-44f1-a2c5-0000b5a7c9af', 'Dianne Mayne', 'sydney-org-11', 'Promoter', 'Sydney'),
    ('ddbb84f0-a290-4030-a3f0-000074eaddd0', '49686b29-ee1f-4115-adb9-000072bff40b', 'Uncharted Sydney', 'sydney-org-12', 'Promoter', 'Sydney'),
    ('f4dcd079-b34f-4625-a809-00002c6378fb', '56c9f232-9f5e-4c8a-a552-000070fcf9b6', 'LIMITED EDITION BAND', 'sydney-org-13', 'Promoter', 'Sydney'),
    ('71368900-bf00-4500-a900-0000670c2b00', '9829dd39-0c8f-4be5-a0c9-00004b1b6b3b', 'Australian Institute of Business', 'sydney-org-14', 'Promoter', 'Sydney'),
    ('0d53f8ad-ccbb-40c9-a37d-0000fd3b74d7', '416034a6-708a-4c6e-af06-0000da23e852', 'Sydney Queer Irish', 'sydney-org-15', 'Promoter', 'Sydney'),
    ('f2ce5767-63d1-403b-add7-000005507ca5', '14c3838e-98e2-4e36-ac6e-00008a82c38a', 'Woollahra Municipal Council', 'sydney-org-16', 'Promoter', 'Sydney'),
    ('c373b194-db0c-4484-aad4-000081962dfc', '4e4a697b-e25d-4b3f-a12b-0000cf85d421', 'Emo Night', 'sydney-org-17', 'Promoter', 'Sydney'),
    ('6904d61c-dac4-4f6c-a7dc-0000cb5be414', 'bed4e003-2015-4027-a033-000029cca039', 'VIVID Photography & Imaging', 'sydney-org-18', 'Promoter', 'Sydney')
  ON CONFLICT (id) DO NOTHING;

  -- Events
  INSERT INTO public.events (
    host_id, organiser_profile_id, title, description, venue_name, address, location,
    event_date, end_date, category, is_public, status, ticket_price_cents
  ) VALUES
    ('90ac0dd5-60d3-43d1-ab25-0000bcc506cf', '2ebeec1c-74c4-4d6c-addc-0000782b8614', 'Retro Silent Disco - The Australian Museum', 'Cheapest ticket: $50.00 (Sold Out)', 'Australian Museum', 'Australian Museum, East Sydney, Sydney, NSW', 'Australian Museum, East Sydney', '2026-03-21T18:30:00.000Z'::timestamptz, '2026-03-21T18:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('52fa6aaf-eac9-4ae3-a59f-00002895eafd', 'c823b2c8-e378-4428-af48-0000daa644d8', 'BO + TESOLIN CONFERENCE', 'Cheapest ticket: $299.00', 'Shangri-La Sydney – Grand Ballroom 1 & 2', 'Shangri-La Sydney – Grand Ballroom 1 & 2, Millers Point, Sydney, NSW', 'Shangri-La Sydney – Grand Ballroom 1 & 2, Millers Point', '2026-03-24T09:30:00.000Z'::timestamptz, '2026-03-24T09:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('3bb1c696-6e1a-459e-aff6-00006e31bd22', 'd004e05d-228b-44b9-a62d-0000705ca6e7', 'The Island: Sunset Sessions ft e-lie', 'Cheapest ticket: $70.60', 'Man O''War Steps', 'Man O''War Steps, City Centre, Sydney, NSW', 'Man O''War Steps, City Centre', '2026-03-20T18:00:00.000Z'::timestamptz, '2026-03-20T18:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('cfcbabe9-b35f-4ad5-aa79-00006c1dc24b', 'ffcb66f0-d090-4a30-a5f0-0000fc18a3d0', 'HSU & Masif presents ROOLER "ALL NIGHT LONG"', 'Cheapest ticket: $115.40', 'Home Main Venue', 'Home Main Venue, Darling Harbour, Sydney, NSW', 'Home Main Venue, Darling Harbour', '2026-03-27T21:30:00.000Z'::timestamptz, '2026-03-27T21:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('c39790ee-f682-4c16-afce-0000843fc1aa', '938f36c7-7f71-481b-a337-0000f3a110c5', 'CRUISE LIKE THIS // CALLYY & FRIENDS', 'Cheapest ticket: $21.69', 'Glass Island', 'Glass Island, Darling Island, Sydney, NSW', 'Glass Island, Darling Island', '2026-03-21T13:00:00.000Z'::timestamptz, '2026-03-21T13:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('7fc06311-b577-47dd-a421-00007b475a43', '0665a4aa-80a6-4ca2-af4a-0000798b389e', 'Penguin Fantasy Fest 2026', 'Cheapest ticket: $17.19', 'Balmain Town Hall', 'Balmain Town Hall, Balmain, Sydney, NSW', 'Balmain Town Hall, Balmain', '2026-03-21T13:30:00.000Z'::timestamptz, '2026-03-21T13:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('c39790ee-f682-4c16-afce-0000843fc1aa', '938f36c7-7f71-481b-a337-0000f3a110c5', 'Glass Island - Red Room', 'Cheapest ticket: $49.73', 'Glass Island', 'Glass Island, Darling Island, Sydney, NSW', 'Glass Island, Darling Island', '2026-03-28T18:15:00.000Z'::timestamptz, '2026-03-28T18:15:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('75a0320e-5e62-4ab6-a2ee-0000bae3b70a', 'f0da1115-7793-4e11-a265-0000e02f448f', 'Abishek Wants To Enjoy Life – A Comedy Special', 'Cheapest ticket: $65.70', 'Science Theatre', 'Science Theatre, Kingsford, Sydney, NSW', 'Science Theatre, Kingsford', '2026-03-28T19:00:00.000Z'::timestamptz, '2026-03-28T19:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('3af9c624-6afc-4fd4-a864-00006089b4ac', '69f6db6b-ffed-446f-a21b-0000dd5248f1', 'WAO SUPERCLUB @ IVY', 'Cheapest ticket: $27.50', 'ivy precinct', 'ivy precinct, Wynyard, Sydney, NSW', 'ivy precinct, Wynyard', '2026-03-20T21:30:00.000Z'::timestamptz, '2026-03-20T21:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('a22ee8f2-5e9e-444a-a812-0000097b49f6', '52d47c8b-67cd-430f-a53b-000025c53e51', 'DJ JOVYNN | LIVE AT MYST NIGHTCLUB', 'Cheapest ticket: $25.00', 'Home The Venue', 'Home The Venue, Darling Harbour, Sydney, NSW', 'Home The Venue, Darling Harbour', '2026-03-20T22:00:00.000Z'::timestamptz, '2026-03-20T22:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('0a55c8c0-7d40-41c0-a4c0-0000c45de640', '7f7f10d9-75ef-4b05-ae69-0000766e401b', 'HAMCHOI #5 ft TWINTIGERZ, RYAL & more', 'Cheapest ticket: $33.06', 'Việt Phố Entertainment', 'Việt Phố Entertainment, Bankstown Plaza, Sydney, NSW', 'Việt Phố Entertainment, Bankstown Plaza', '2026-03-28T19:00:00.000Z'::timestamptz, '2026-03-28T19:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('31fb5b75-8033-44f1-a2c5-0000b5a7c9af', '60f870bc-1524-498c-ac7c-000032705df4', 'JIGSAW PUZZLE RELAY + SOCIAL LUCKY DIP PUZZLE', 'Cheapest ticket: $25.00', 'Wentworth Point Public School', 'Wentworth Point Public School, Rhodes, Sydney, NSW', 'Wentworth Point Public School, Rhodes', '2026-03-22T11:00:00.000Z'::timestamptz, '2026-03-22T11:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('3bb1c696-6e1a-459e-aff6-00006e31bd22', 'd004e05d-228b-44b9-a62d-0000705ca6e7', 'The Island: Beach Club', 'Cheapest ticket: $55.00', 'Man O''War Steps', 'Man O''War Steps, City Centre, Sydney, NSW', 'Man O''War Steps, City Centre', '2026-03-21T14:00:00.000Z'::timestamptz, '2026-03-21T14:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('49686b29-ee1f-4115-adb9-000072bff40b', 'ddbb84f0-a290-4030-a3f0-000074eaddd0', 'UNCHARTED PRESENTS: LOST AT SEA feat. PHILIP GEORGE, CALEB JACKSON + MORE', 'Cheapest ticket: $21.97', 'King Street Wharf 6', 'King Street Wharf 6, Darling Island, Sydney, NSW', 'King Street Wharf 6, Darling Island', '2026-03-21T15:00:00.000Z'::timestamptz, '2026-03-21T15:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('56c9f232-9f5e-4c8a-a552-000070fcf9b6', 'f4dcd079-b34f-4625-a809-00002c6378fb', 'Limited Edition Band Soda Party!', 'Cheapest ticket: $27.78', 'The Soda Factory', 'The Soda Factory, Surry Hills, Sydney, NSW', 'The Soda Factory, Surry Hills', '2026-03-20T19:30:00.000Z'::timestamptz, '2026-03-20T19:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('9829dd39-0c8f-4be5-a0c9-00004b1b6b3b', '71368900-bf00-4500-a900-0000670c2b00', 'AIBconnect', 'Cheapest ticket: $22.49', 'Pier One Sydney Harbour', 'Pier One Sydney Harbour, Dawes Point, Sydney, NSW', 'Pier One Sydney Harbour, Dawes Point', '2026-03-19T17:30:00.000Z'::timestamptz, '2026-03-19T17:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('416034a6-708a-4c6e-af06-0000da23e852', '0d53f8ad-ccbb-40c9-a37d-0000fd3b74d7', 'Paddy''s Gay 2026', 'Cheapest ticket: $22.49', 'Kinselas Hotel', 'Kinselas Hotel, Taylor Square, Sydney, NSW', 'Kinselas Hotel, Taylor Square', '2026-03-21T21:00:00.000Z'::timestamptz, '2026-03-21T21:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('14c3838e-98e2-4e36-ac6e-00008a82c38a', 'f2ce5767-63d1-403b-add7-000005507ca5', 'Author Talk: Natasha Lester and Cassie Hamer with The Chateau on Sunset', 'Cheapest ticket: $5.00', 'Woollahra Library at Double Bay', 'Woollahra Library at Double Bay, Double Bay, Sydney, NSW', 'Woollahra Library at Double Bay, Double Bay', '2026-03-30T18:00:00.000Z'::timestamptz, '2026-03-30T18:00:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('4e4a697b-e25d-4b3f-a12b-0000cf85d421', 'c373b194-db0c-4484-aad4-000081962dfc', 'EMO VS GAMERS', 'Cheapest ticket: Free', 'Mansions Potts Point', 'Mansions Potts Point, Kings Cross, Sydney, NSW', 'Mansions Potts Point, Kings Cross', '2026-03-28T20:30:00.000Z'::timestamptz, '2026-03-28T20:30:00.000Z'::timestamptz, 'party', true, 'published', 0),
    ('bed4e003-2015-4027-a033-000029cca039', '6904d61c-dac4-4f6c-a7dc-0000cb5be414', 'Book Launch – Uplifting. A Celebration of Women. Vol 3 By Murielle Sassine', 'Cheapest ticket: $64.84', 'REVY – Doltone House', 'REVY – Doltone House, Darling Island, Sydney, NSW', 'REVY – Doltone House, Darling Island', '2026-03-27T18:00:00.000Z'::timestamptz, '2026-03-27T18:00:00.000Z'::timestamptz, 'party', true, 'published', 0)
  ;
END $$;