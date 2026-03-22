-- =============================================
-- Lovable auth seed (paired with 20260326120100_lovable_data_export.sql).
-- Source of truth: docs/supabase/auth_users_seed.sql — keep in sync.
-- Auth Users Seed for data_export.sql
-- Run this FIRST in the Supabase SQL Editor before data_export.sql
-- Creates auth.users + auth.identities for every user_id in the export
-- Phone-only auth: uses phone from profiles, placeholders for users without phones
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_pw text := extensions.crypt('seedplaceholder1', extensions.gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_user record;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('1eafb563-071a-45c6-a82e-79b460b3a851'::uuid, '61405826420'),
      ('e8f02149-2ccf-4324-950a-d2a574c46569'::uuid, '17472753223'),
      ('a1b2c3d4-0001-4000-8000-000000000001'::uuid, '+27000000001'),
      ('a1b2c3d4-0002-4000-8000-000000000002'::uuid, '+27000000002'),
      ('a1b2c3d4-0003-4000-8000-000000000003'::uuid, '+27000000003'),
      ('a1b2c3d4-0004-4000-8000-000000000004'::uuid, '+27000000004'),
      ('a1b2c3d4-0005-4000-8000-000000000005'::uuid, '+27000000005'),
      ('a1b2c3d4-0006-4000-8000-000000000006'::uuid, '+27000000006'),
      ('a1b2c3d4-0007-4000-8000-000000000007'::uuid, '+27000000007'),
      ('a1b2c3d4-0008-4000-8000-000000000008'::uuid, '+27000000008'),
      ('a1b2c3d4-0009-4000-8000-000000000009'::uuid, '+27000000009'),
      ('a1b2c3d4-0010-4000-8000-000000000010'::uuid, '+27000000010'),
      ('a1b2c3d4-0011-4000-8000-000000000011'::uuid, '+27000000011'),
      ('a1b2c3d4-0012-4000-8000-000000000012'::uuid, '+27000000012'),
      ('a1b2c3d4-0013-4000-8000-000000000013'::uuid, '+27000000013'),
      ('a1b2c3d4-0014-4000-8000-000000000014'::uuid, '+27000000014'),
      ('a1b2c3d4-0015-4000-8000-000000000015'::uuid, '+27000000015'),
      ('a1b2c3d4-0016-4000-8000-000000000016'::uuid, '+27000000016'),
      ('a1b2c3d4-0017-4000-8000-000000000017'::uuid, '+27000000017'),
      ('a1b2c3d4-0018-4000-8000-000000000018'::uuid, '+27000000018'),
      ('a1b2c3d4-0019-4000-8000-000000000019'::uuid, '+27000000019'),
      ('a1b2c3d4-0020-4000-8000-000000000020'::uuid, '+27000000020'),
      ('d7870a01-cc4e-489f-a824-f9a76f3c7fd0'::uuid, '+16513342985'),
      ('08531275-4784-48d4-a02f-1ba2bd4c920d'::uuid, '+61452266573'),
      ('59137a61-98ce-4b1a-af30-997b8c58ce00'::uuid, '+61451119895'),
      ('891c971d-a8ed-4ae2-bf6a-8151e05419b2'::uuid, '+61468467867'),
      ('69cb2c94-625b-47cd-ac42-28d6fdaa67f4'::uuid, '+16507969122'),
      ('88cfad8c-088d-4da3-b51c-455c6bd7d0d9'::uuid, '+66949611245')
    ) AS t(user_id, phone)
  LOOP
    -- auth.users: phone + email for phone-only auth (generateLink uses email; phone required for lookup)
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, phone, phone_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      v_user.user_id,
      v_instance,
      'authenticated',
      'authenticated',
      regexp_replace(v_user.phone, '[^0-9]', '', 'g') || '@phone.local',
      v_pw,
      now(),
      v_user.phone,
      now(),
      '{"provider":"phone","providers":["phone"]}',
      jsonb_build_object('phone', v_user.phone),
      now(),
      now()
    ) ON CONFLICT (id) DO NOTHING;

    -- auth.identities: phone provider (provider_id = phone digits for uniqueness)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user.user_id,
      v_user.user_id,
      jsonb_build_object(
        'sub', v_user.user_id,
        'phone', v_user.phone
      ),
      'phone',
      regexp_replace(v_user.phone, '[^0-9]', '', 'g'),
      now(),
      now(),
      now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  END LOOP;
END $$;
