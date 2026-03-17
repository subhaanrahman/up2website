-- =============================================
-- Up2 Platform — Full Data Export
-- Generated: 2026-03-17
-- Source: Lovable Cloud (Supabase)
-- Contains: All public schema data as INSERT statements in dependency order
-- =============================================

BEGIN;

-- =============================================
-- 1. PROFILES (28 rows)
-- =============================================
INSERT INTO profiles (id, user_id, display_name, first_name, last_name, username, email, email_verified, phone, avatar_url, bio, city, page_classification, instagram_handle, is_verified, profile_tier, created_at, updated_at) VALUES
('8a99de08-f8f5-44de-a220-1bed62cb6b7a', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'Dylan', 'Godwin', 'dylangodwin', NULL, false, '61405826420', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/1eafb563-071a-45c6-a82e-79b460b3a851/avatar.jpeg?t=1772538993200', 'Emotion without the E...', 'Sydney', 'Promoter', 'dylgodwin', true, 'professional', '2026-03-03 11:54:41.865078+00', '2026-03-16 13:52:25.541123+00'),
('31a99b08-576e-4f5e-8da8-cbdd83aaa7d6', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Haan', 'Haan', 'R', 'fuckhaan', NULL, false, '17472753223', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/e8f02149-2ccf-4324-950a-d2a574c46569/initials.svg', 'hey guys', 'Sydney', 'DJ', 'fuckhaan', true, 'personal', '2026-03-03 23:09:24.740922+00', '2026-03-10 11:33:22.824471+00'),
('667ef47a-98ba-425f-a901-476de0640cb8', 'a1b2c3d4-0003-4000-8000-000000000003', 'Jordan Smith', 'Jordan', 'Smith', 'jordansmith', NULL, false, NULL, 'https://i.pravatar.cc/300?img=3', 'Event enthusiast. Always on the guest list.', 'Durban', 'Promoter', 'jordan.smith', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('fc41969e-8e1c-400c-bbe2-c534bba2b725', 'a1b2c3d4-0004-4000-8000-000000000004', 'Amara Osei', 'Amara', 'Osei', 'amara_o', NULL, false, NULL, 'https://i.pravatar.cc/300?img=9', 'Art, culture, and late-night conversations ✨', 'Pretoria', 'Artist', NULL, false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('9db01e55-6480-4890-97dd-6451a5ae084c', 'a1b2c3d4-0005-4000-8000-000000000005', 'Liam van der Berg', 'Liam', 'van der Berg', 'liamvdb', NULL, false, NULL, 'https://i.pravatar.cc/300?img=11', 'Photographer by day, party-goer by night 📸', 'Stellenbosch', NULL, 'liamvdb', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('bdff7647-3cf6-4a05-8747-164b678a7ac4', 'a1b2c3d4-0006-4000-8000-000000000006', 'Zinhle Dlamini', 'Zinhle', 'Dlamini', 'zinhle_d', NULL, false, NULL, 'https://i.pravatar.cc/300?img=20', 'Fashion & nightlife 💃', 'Johannesburg', NULL, 'zinhle.dlam', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('dce78d2d-e7c8-4646-8775-f9b46088d3ea', 'a1b2c3d4-0007-4000-8000-000000000007', 'Marcus Johnson', 'Marcus', 'Johnson', 'marcusj', NULL, false, NULL, 'https://i.pravatar.cc/300?img=12', 'Sports fan & social butterfly 🦋', 'Cape Town', NULL, NULL, false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('011b0d1c-83cc-46e7-a00c-a28dce580d0e', 'a1b2c3d4-0008-4000-8000-000000000008', 'Fatima Al-Rashid', 'Fatima', 'Al-Rashid', 'fatima_r', NULL, false, NULL, 'https://i.pravatar.cc/300?img=25', 'Foodie | Traveler | Event curator', 'Durban', 'Promoter', 'fatima.rashid', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('534850ff-9dec-410c-9cc7-73f3fe29dd01', 'a1b2c3d4-0009-4000-8000-000000000009', 'Siya Nkosi', 'Siya', 'Nkosi', 'siyanks', NULL, false, NULL, 'https://i.pravatar.cc/300?img=13', 'Making memories one event at a time 🎉', 'Johannesburg', 'DJ', 'siyanks', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('e3a5b63a-33f4-4940-b66d-bb553fb8c22e', 'a1b2c3d4-0010-4000-8000-000000000010', 'Emma Williams', 'Emma', 'Williams', 'emmaw', NULL, false, NULL, 'https://i.pravatar.cc/300?img=26', 'Coffee addict & concert lover ☕🎵', 'Cape Town', NULL, 'emma.w', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('920ad35b-88e8-47d3-9620-d0d556626a1d', 'a1b2c3d4-0011-4000-8000-000000000011', 'Kabelo Mokoena', 'Kabelo', 'Mokoena', 'kabelo_m', NULL, false, NULL, 'https://i.pravatar.cc/300?img=14', 'Entrepreneur & culture enthusiast', 'Pretoria', NULL, 'kabelo.mok', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('ea4b958e-5ff9-4989-9dd2-cff845928341', 'a1b2c3d4-0012-4000-8000-000000000012', 'Chloe Peters', 'Chloe', 'Peters', 'chloep', NULL, false, NULL, 'https://i.pravatar.cc/300?img=31', 'Yoga by morning, rooftop bars by night 🧘‍♀️', 'Stellenbosch', NULL, 'chloe.peters', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('3d0ec1ef-8fcc-47a3-bfb7-f379ae785155', 'a1b2c3d4-0013-4000-8000-000000000013', 'Dumisani Ngcobo', 'Dumisani', 'Ngcobo', 'dumi_n', NULL, false, NULL, 'https://i.pravatar.cc/300?img=15', 'Hip-hop head & event organiser 🎤', 'Johannesburg', 'Artist', 'dumi.ngcobo', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('cd3afe59-8e76-4971-8e58-41e3f7125b4b', 'a1b2c3d4-0014-4000-8000-000000000014', 'Sarah Chen', 'Sarah', 'Chen', 'sarahc', NULL, false, NULL, 'https://i.pravatar.cc/300?img=32', 'Design lover & weekend wanderer', 'Cape Town', NULL, 'sarah.chen', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('5b3180d7-9e5c-4866-bd04-435628a47f11', 'a1b2c3d4-0001-4000-8000-000000000001', 'Thabo Molefe', 'Thabo', 'Molefe', 'thabo_m', NULL, false, NULL, 'https://i.pravatar.cc/300?img=1', 'Music lover & weekend explorer 🎶', 'Johannesburg', 'DJ', 'thabo.molefe', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('2821e1a6-a1f7-426c-b9af-103ed22d8ad7', 'a1b2c3d4-0016-4000-8000-000000000016', 'Lerato Moloi', 'Lerato', 'Moloi', 'lerato_m', NULL, false, NULL, 'https://i.pravatar.cc/300?img=33', 'Social butterfly with a camera roll full of sunsets 🌅', 'Durban', NULL, 'lerato.m', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('1c856194-738f-4fac-bf08-9a0ca7d13d0e', 'a1b2c3d4-0017-4000-8000-000000000017', 'Ryan O''Connor', 'Ryan', 'O''Connor', 'ryano', NULL, false, NULL, 'https://i.pravatar.cc/300?img=17', 'Surfer. Music lover. Always says yes to events.', 'Cape Town', NULL, 'ryan.oconnor', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('7732e995-7db1-4611-8b34-2c11b369fcf5', 'a1b2c3d4-0018-4000-8000-000000000018', 'Nomvula Sithole', 'Nomvula', 'Sithole', 'nomvula_s', NULL, false, NULL, 'https://i.pravatar.cc/300?img=34', 'Wellness advocate & dinner party host 🕯️', 'Johannesburg', NULL, 'nomvula.s', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('cf5b996a-811b-461c-a49b-e4d1737f784b', 'a1b2c3d4-0019-4000-8000-000000000019', 'Daniel Botha', 'Daniel', 'Botha', 'danbotha', NULL, false, NULL, 'https://i.pravatar.cc/300?img=18', 'Craft beer connoisseur & live music fan 🍺', 'Stellenbosch', NULL, NULL, false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('c2c61670-0989-4c65-b354-b9cd5c6397b3', 'a1b2c3d4-0020-4000-8000-000000000020', 'Ayanda Zulu', 'Ayanda', 'Zulu', 'ayanda_z', NULL, false, NULL, 'https://i.pravatar.cc/300?img=35', 'Creative director & nightlife enthusiast 🌙', 'Johannesburg', 'Promoter', 'ayanda.zulu', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('26402c56-686e-4298-bbc7-4c36d5579df4', 'a1b2c3d4-0015-4000-8000-000000000015', 'Tshepo Mabaso', 'Tshepo', 'Mabaso', 'tshepo_m', NULL, false, NULL, 'https://i.pravatar.cc/300?img=16', 'Tech bro who knows all the spots 🍸', 'Johannesburg', NULL, NULL, false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('2f87acf1-3295-4362-8d27-1c7bd4bc8377', 'a1b2c3d4-0002-4000-8000-000000000002', 'Naledi Khumalo', 'Naledi', 'Khumalo', 'naledi_k', NULL, false, NULL, 'https://i.pravatar.cc/300?img=5', 'Living for good vibes and great food 🍕', 'Cape Town', NULL, 'naledi.khumalo', false, 'personal', '2026-03-05 09:54:07.65279+00', '2026-03-05 09:54:45.795764+00'),
('aaca33c3-032b-4a18-8bfb-ac323cede608', 'd7870a01-cc4e-489f-a824-f9a76f3c7fd0', 'Kai Wilson', 'Kai', 'Wilson', 'kaiwilson', NULL, false, '+16513342985', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/d7870a01-cc4e-489f-a824-f9a76f3c7fd0/avatar.jpg?t=1772830797407', NULL, 'Los Angeles', NULL, 'kaiswxrld', false, 'personal', '2026-03-06 20:55:38.611383+00', '2026-03-06 21:00:42.953356+00'),
('080e1667-6d18-4854-94c5-39a503dbb061', '08531275-4784-48d4-a02f-1ba2bd4c920d', 'Tino Tsuro', 'Tino', 'Tsuro', 'tino', NULL, false, '+61452266573', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/08531275-4784-48d4-a02f-1ba2bd4c920d/initials.svg', NULL, NULL, NULL, NULL, false, 'personal', '2026-03-08 23:53:44.456011+00', '2026-03-08 23:53:46.329507+00'),
('d0c7abc4-60f4-497d-a1af-23c7e23fed18', '59137a61-98ce-4b1a-af30-997b8c58ce00', 'Jake Jepson', 'Jake', 'Jepson', 'jakejepson_', NULL, false, '+61451119895', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/59137a61-98ce-4b1a-af30-997b8c58ce00/initials.svg', NULL, NULL, NULL, NULL, false, 'personal', '2026-03-09 02:47:51.062941+00', '2026-03-09 02:47:52.36608+00'),
('900cb7e3-39f0-4fc8-81a1-eacadf2d5038', '891c971d-a8ed-4ae2-bf6a-8151e05419b2', 'Insaaf Rahman', 'Insaaf', 'Rahman', 'insi', NULL, false, '+61468467867', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/891c971d-a8ed-4ae2-bf6a-8151e05419b2/initials.svg', NULL, NULL, NULL, NULL, false, 'personal', '2026-03-10 00:26:39.20628+00', '2026-03-10 00:26:40.66584+00'),
('67ae4243-5628-4be1-98aa-ffbd40c890b6', '69cb2c94-625b-47cd-ac42-28d6fdaa67f4', 'A J', 'A', 'J', 'ajax', NULL, false, '+16507969122', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/69cb2c94-625b-47cd-ac42-28d6fdaa67f4/initials.svg', NULL, NULL, NULL, NULL, false, 'personal', '2026-03-12 00:32:44.586609+00', '2026-03-12 00:32:45.455315+00'),
('86712b8f-1fa0-4976-82e3-b730fd096185', '88cfad8c-088d-4da3-b51c-455c6bd7d0d9', 'Matt Developer', 'Matt', 'Developer', 'matt', NULL, false, '+66949611245', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/88cfad8c-088d-4da3-b51c-455c6bd7d0d9/initials.svg', NULL, NULL, NULL, NULL, false, 'personal', '2026-03-16 08:22:05.631472+00', '2026-03-16 09:41:49.426233+00');

-- =============================================
-- 2. ORGANISER_PROFILES (9 rows)
-- =============================================
INSERT INTO organiser_profiles (id, owner_id, display_name, username, avatar_url, bio, city, category, instagram_handle, opening_hours, tags, created_at, updated_at) VALUES
('6348b9db-fd8a-466e-8549-6c4333cdfa56', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Members Only', 'membersonly', 'https://dcjymbpjmbfoikqjrmuo.supabase.co/storage/v1/object/public/avatars/org-membersonly/initials.svg', 'members only official', 'Sydney', 'Event', 'membersonlyaustralia', NULL, '["Hip Hop","R&B","Afrobeats","Exclusive","VIP"]', '2026-03-03 23:26:26.376461+00', '2026-03-09 01:48:53.380258+00'),
('d9a9f4f5-6916-4ea7-a06f-0e4d263404a2', 'a1b2c3d4-0003-4000-8000-000000000003', 'The Rooftop Social', 'rooftop_social', 'https://i.pravatar.cc/300?img=41', 'Curating the best rooftop experiences in Durban 🌆', 'Durban', 'Venue', 'rooftopsocial', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('117ef4d3-1d9d-498a-9b2d-f2ca6fa18dd4', 'a1b2c3d4-0006-4000-8000-000000000006', 'Glow Events', 'glow_events', 'https://i.pravatar.cc/300?img=42', 'Fashion meets nightlife. Premium events only ✨', 'Johannesburg', 'Event', 'glow.events', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('51626166-142a-4f67-af9c-f2df80318b24', 'a1b2c3d4-0008-4000-8000-000000000008', 'Spice Market', 'spice_market', 'https://i.pravatar.cc/300?img=43', 'Food festivals, supper clubs & culinary adventures 🌶️', 'Durban', 'Event', 'spicemarket.za', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('50d9a015-e9da-4219-831b-5515b8468588', 'a1b2c3d4-0001-4000-8000-000000000001', 'Bassline Collective', 'bassline_collective', 'https://i.pravatar.cc/300?img=40', 'Johannesburg''s premier underground music collective 🔊', 'Johannesburg', 'Event', 'basslinecollective', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('05a318d0-c7da-41fd-8ab3-ee0147bbd51d', 'a1b2c3d4-0013-4000-8000-000000000013', 'Kulture Yard', 'kulture_yard', 'https://i.pravatar.cc/300?img=45', 'A creative space for art, music & community 🎨', 'Johannesburg', 'Venue', 'kultureyard', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('e03bc4d8-70d7-472d-b9a5-0f611d6c2302', 'a1b2c3d4-0017-4000-8000-000000000017', 'Sunset Sessions CPT', 'sunset_sessions_cpt', 'https://i.pravatar.cc/300?img=46', 'Beach parties & sunset vibes in Cape Town 🌊', 'Cape Town', 'Event', 'sunsetsessionscpt', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('9d4bf8fd-36d3-4e07-9dc0-c247307c3994', 'a1b2c3d4-0020-4000-8000-000000000020', 'Neon Nights', 'neon_nights', 'https://i.pravatar.cc/300?img=47', 'Late-night events that light up the city 🌃', 'Johannesburg', 'Event', 'neon.nights', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00'),
('ec62e9a9-4059-41e9-af47-d916f9562825', 'a1b2c3d4-0009-4000-8000-000000000009', 'Club Vinyl', 'club_vinyl', 'https://i.pravatar.cc/300?img=44', 'Where the records spin and the good times roll 🎧', 'Johannesburg', 'Venue', 'clubvinyl.jozi', NULL, '[]', '2026-03-05 09:54:57.173621+00', '2026-03-05 09:54:57.173621+00');

-- =============================================
-- 3. ORGANISER_MEMBERS (2 rows)
-- =============================================
INSERT INTO organiser_members (id, organiser_profile_id, user_id, role, status, invited_by, accepted_at, created_at) VALUES
('b2da3de3-f762-4da9-8246-36b3e0e046cb', '6348b9db-fd8a-466e-8549-6c4333cdfa56', '1eafb563-071a-45c6-a82e-79b460b3a851', 'admin', 'accepted', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-04 11:05:08.516+00', '2026-03-04 11:03:41.91651+00'),
('de00ba0c-1892-4e04-a9b3-1b4cab12bc46', '6348b9db-fd8a-466e-8549-6c4333cdfa56', '08531275-4784-48d4-a02f-1ba2bd4c920d', 'editor', 'pending', 'e8f02149-2ccf-4324-950a-d2a574c46569', NULL, '2026-03-09 07:18:01.595361+00');

-- =============================================
-- 4. ORGANISER_FOLLOWERS (2 rows)
-- =============================================
INSERT INTO organiser_followers (id, organiser_profile_id, user_id, muted, created_at) VALUES
('f3e59844-f37e-490e-883d-789b16d96ac8', '6348b9db-fd8a-466e-8549-6c4333cdfa56', '1eafb563-071a-45c6-a82e-79b460b3a851', false, '2026-03-05 11:03:00.302432+00'),
('21bb8b61-c18a-4683-9501-99856cd00827', '6348b9db-fd8a-466e-8549-6c4333cdfa56', 'e8f02149-2ccf-4324-950a-d2a574c46569', false, '2026-03-10 09:34:03.423377+00');

-- =============================================
-- 5. PRIVACY_SETTINGS (1 row)
-- =============================================
INSERT INTO privacy_settings (id, user_id, go_public, share_going_events, share_saved_events, created_at, updated_at) VALUES
('bb73dc34-0250-40b2-8875-585126292297', 'd7870a01-cc4e-489f-a824-f9a76f3c7fd0', true, true, false, '2026-03-06 21:00:43.295297+00', '2026-03-06 21:00:43.295297+00');

-- =============================================
-- 6. CONNECTIONS (13 rows)
-- =============================================
INSERT INTO connections (id, requester_id, addressee_id, status, muted, accepted_at, created_at) VALUES
('5a2e86a0-5058-4db3-b727-305eb8249fb4', '1eafb563-071a-45c6-a82e-79b460b3a851', '6348b9db-fd8a-466e-8549-6c4333cdfa56', 'pending', false, NULL, '2026-03-05 10:37:55.651916+00'),
('29576e8c-9024-4259-a51a-fb90911ce3c4', 'd7870a01-cc4e-489f-a824-f9a76f3c7fd0', '1eafb563-071a-45c6-a82e-79b460b3a851', 'accepted', false, '2026-03-06 20:56:06.358+00', '2026-03-06 20:56:06.543075+00'),
('6ab25789-b77a-4af9-abfa-16dc5e77988c', 'e8f02149-2ccf-4324-950a-d2a574c46569', '1eafb563-071a-45c6-a82e-79b460b3a851', 'accepted', false, '2026-03-07 05:11:42.239+00', '2026-03-07 05:11:42.365889+00'),
('a3cb3f01-2fe0-422e-9f07-44c5050bf2f0', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'd7870a01-cc4e-489f-a824-f9a76f3c7fd0', 'accepted', false, '2026-03-07 12:19:20.853+00', '2026-03-07 12:19:21.005755+00'),
('1a313219-110e-43b7-bf5b-718079e6484f', 'a1b2c3d4-0004-4000-8000-000000000004', '1eafb563-071a-45c6-a82e-79b460b3a851', 'accepted', false, '2026-03-08 13:33:25.438+00', '2026-03-08 13:32:02.350358+00'),
('73ccbb03-b1bc-442e-8fee-de12e418ff70', 'a1b2c3d4-0005-4000-8000-000000000005', '1eafb563-071a-45c6-a82e-79b460b3a851', 'accepted', false, '2026-03-08 13:33:29.22+00', '2026-03-08 13:32:02.350358+00'),
('ee191105-8dd5-427f-96fc-83ebec7c9661', '08531275-4784-48d4-a02f-1ba2bd4c920d', 'd7870a01-cc4e-489f-a824-f9a76f3c7fd0', 'accepted', false, '2026-03-08 23:55:46.086+00', '2026-03-08 23:55:46.359301+00'),
('a226f8aa-69f3-4ed0-ab36-352861eab0f0', '08531275-4784-48d4-a02f-1ba2bd4c920d', '1eafb563-071a-45c6-a82e-79b460b3a851', 'accepted', false, '2026-03-08 23:55:53.041+00', '2026-03-08 23:55:53.257612+00'),
('bb9c32f5-fddf-498a-b113-54f3015b60fd', '08531275-4784-48d4-a02f-1ba2bd4c920d', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'accepted', false, '2026-03-08 23:56:00.217+00', '2026-03-08 23:56:00.445367+00'),
('7722f8fe-4c4d-4cf1-9eb3-fb0c312b6699', '59137a61-98ce-4b1a-af30-997b8c58ce00', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'accepted', false, '2026-03-09 02:49:40.049+00', '2026-03-09 02:49:40.309525+00'),
('e944d94f-e994-48dd-9687-87cb95e356ed', '1eafb563-071a-45c6-a82e-79b460b3a851', '59137a61-98ce-4b1a-af30-997b8c58ce00', 'accepted', false, '2026-03-09 06:49:16.545+00', '2026-03-09 06:49:16.767936+00'),
('ea3c854d-61a9-4ea5-956f-12b3c7c6cba6', 'e8f02149-2ccf-4324-950a-d2a574c46569', '891c971d-a8ed-4ae2-bf6a-8151e05419b2', 'pending', false, NULL, '2026-03-10 12:31:22.849542+00'),
('83b596a5-3668-4785-95d2-92b0718bf40a', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'a1b2c3d4-0005-4000-8000-000000000005', 'pending', false, NULL, '2026-03-11 09:48:12.708104+00');

-- =============================================
-- 7. EVENTS (8 rows)
-- =============================================
INSERT INTO events (id, host_id, title, description, location, cover_image, event_date, end_date, is_public, max_guests, organiser_profile_id, ticket_price_cents, category, status, guestlist_enabled, guestlist_deadline, guestlist_require_approval, guestlist_max_capacity, show_tickets_remaining, tickets_available_from, publish_at, sold_out_message, tags, created_at, updated_at) VALUES
('8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Members Only Launch Party', 'Exclusive launch event celebrating our community. Music, drinks, networking, and surprises all night long.', 'Johannesburg, SA', NULL, '2026-03-20 12:00:00+00', '2026-03-21 01:00:00+00', true, 100, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'Social', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-04 01:29:37.781038+00', '2026-03-12 03:16:51.003871+00'),
('50cf07a0-bac9-4905-a1e3-1b63533a3681', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Rooftop Sunset Cocktails', 'Unwind with craft cocktails, gourmet snacks, and breathtaking city views. Our mixologist will be crafting signature drinks all evening.', 'Manhattan, NY', NULL, '2026-04-22 17:00:00+00', '2026-04-22 22:00:00+00', true, 75, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'Social', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-04 01:29:37.781038+00', '2026-03-04 01:29:37.781038+00'),
('2648e8ed-1973-4776-9109-f16775c89679', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Weekend Brunch Gathering', 'A laid-back brunch with bottomless mimosas, live acoustic music, and great vibes. Bring your friends!', 'Cape Town, SA', NULL, '2026-02-14 10:00:00+00', '2026-02-14 14:00:00+00', true, 40, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'Dinner', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-04 01:29:37.781038+00', '2026-03-04 01:29:37.781038+00'),
('8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Summer Garden Dinner Party', 'Join us for an unforgettable evening under the stars! Elegant outdoor dinner with farm-to-table cuisine, great wine, and amazing company.', 'Brooklyn, NY', NULL, '2026-04-15 18:00:00+00', '2026-04-15 23:00:00+00', true, 24, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'Dinner', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-04 01:29:37.781038+00', '2026-03-04 01:29:37.781038+00'),
('f45146db-33c3-469e-95a5-c0d41cf7903d', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'New Year''s Eve Celebration 2026', 'Ring in 2026 with style! Live DJ, champagne toast at midnight, gourmet appetizers, and stunning rooftop fireworks views.', 'Manhattan, NY', NULL, '2026-12-31 19:00:00+00', '2027-01-01 01:00:00+00', true, 150, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'New Year''s', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-04 01:29:37.781038+00', '2026-03-07 13:59:33.77784+00'),
('99ce333a-5108-443d-b688-f1513dd81d5f', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Live From The Gutter', 'INCOMING', 'Secrete Spot', NULL, '2026-01-17 11:00:00+00', NULL, true, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'party', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-07 03:45:46.5461+00', '2026-03-07 13:21:02.036065+00'),
('c65e659c-85f0-44ea-8bbf-24001f55be07', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'test', 'test', 'test', NULL, '2026-03-07 00:00:00+00', NULL, true, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'party', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-07 04:17:37.012857+00', '2026-03-07 13:26:01.615547+00'),
('a7f900af-1389-4320-bcf2-b8da522d53f3', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'test', 'test', 'Sydney', NULL, '2026-03-18 10:00:00+00', NULL, true, 200, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 0, 'party', 'published', true, NULL, false, NULL, false, NULL, NULL, NULL, '[]', '2026-03-17 08:15:38.372645+00', '2026-03-17 08:53:20.507205+00');

-- =============================================
-- 8. POSTS (22 rows)
-- =============================================
INSERT INTO posts (id, author_id, content, image_url, gif_url, organiser_profile_id, event_id, created_at, updated_at) VALUES
('469693b8-94ae-4b63-ba11-cfc9435bc473', 'a1b2c3d4-0005-4000-8000-000000000005', 'Who''s heading to the beach party this Saturday? Heard the lineup is stacked 🏖️🎵', NULL, NULL, NULL, NULL, '2026-03-04 05:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('7274a239-59ae-44a3-8d17-b19ffbd07770', 'a1b2c3d4-0009-4000-8000-000000000009', 'Sunday brunch > everything else. Change my mind ☕🥂', NULL, NULL, NULL, NULL, '2026-03-04 10:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('2d4502dc-34c0-407b-9d11-e99e8488c41c', 'a1b2c3d4-0002-4000-8000-000000000002', 'Finally got my tickets for the warehouse party next month 🎶 See you all there!', NULL, NULL, NULL, NULL, '2026-03-05 07:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('c5e4d607-3286-4fbf-b4fc-ac85e32241cb', '1eafb563-071a-45c6-a82e-79b460b3a851', 'yooooo', NULL, NULL, NULL, NULL, '2026-03-05 10:52:15.25429+00', '2026-03-05 10:52:15.25429+00'),
('24b267b4-46e7-4745-9d7a-31e3b8bf7b64', 'a1b2c3d4-0007-4000-8000-000000000007', 'Throwback to NYE 2025 🎆 That lineup was insane. Who was there?', NULL, NULL, NULL, NULL, '2026-03-05 10:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('c0dba7c4-551e-4318-89c5-b7005cdac45c', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'yooo', NULL, NULL, NULL, NULL, '2026-03-05 10:57:30.033321+00', '2026-03-05 10:57:30.033321+00'),
('a22fa95b-e171-4420-9bad-7466101785a6', 'a1b2c3d4-0003-4000-8000-000000000003', 'Best cocktail bar in Melbourne? Need recs for this weekend 🍸', NULL, NULL, NULL, NULL, '2026-03-05 22:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('7a381c30-4aa7-4816-9d97-7d4f7c5d6a50', 'a1b2c3d4-0006-4000-8000-000000000006', 'New DJ set dropping this Friday. Link in bio 🎧✨', NULL, NULL, NULL, NULL, '2026-03-06 02:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('a59d50a5-d9d8-4974-b356-60823fe435c2', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Just wrapped up organising the craziest event of the year. Stay tuned for photos 📸🔥', NULL, NULL, NULL, NULL, '2026-03-06 04:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('772ccaa2-ffdd-402c-9784-0ae39e8c3de7', 'a1b2c3d4-0004-4000-8000-000000000004', 'That rooftop party last weekend was unreal 🔥 Can''t wait for the next one', NULL, NULL, NULL, NULL, '2026-03-06 05:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('5224430f-fbb4-4252-b640-2c8c1ebd12ee', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Weekend vibes only 🌊 Let me know what events are popping this week', NULL, NULL, NULL, NULL, '2026-03-06 07:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('2bd62962-ed28-4d5a-9738-d2b4c9fe1ef4', 'a1b2c3d4-0001-4000-8000-000000000001', 'Just landed in Sydney 🇦🇺 Who''s going out tonight? Drop your spots below 👇', NULL, NULL, NULL, NULL, '2026-03-06 08:55:27.053492+00', '2026-03-06 10:55:27.053492+00'),
('acd8370d-58d9-4cfe-ae81-718b049001e3', '1eafb563-071a-45c6-a82e-79b460b3a851', 'bringing the heat real soon....', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', NULL, '2026-03-06 12:56:01.269715+00', '2026-03-06 12:56:01.269715+00'),
('cce4efce-be65-4bd5-8d40-f49a11b54b3b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'yooooo', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', NULL, '2026-03-07 04:16:28.864166+00', '2026-03-07 04:16:28.864166+00'),
('e6b34264-0a2c-441a-91e4-5afd61d2a885', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🎆 New Year''s Eve Celebration 2026 — Ring in the new year with style! Live DJ, champagne toast at midnight.', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('fd1be763-0b1b-474b-a33a-656c2521bd23', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🍸 Rooftop Sunset Cocktails — Unwind with craft cocktails, gourmet snacks, and breathtaking city views.', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('0edbe6f3-4d99-4ca7-b4ca-7aebb121734f', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🌿 Summer Garden Dinner Party — Join us for an unforgettable evening under the stars!', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('63d09b44-b5ec-4a74-a18d-6a0cafccfe70', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🎉 Members Only Launch Party — Exclusive launch event celebrating our community. Music, drinks, networking, and surprises all night long.', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('564e285a-25d8-49af-88d6-9f80e88029ed', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🥂 Weekend Brunch Gathering — A laid-back brunch with bottomless mimosas, live acoustic music, and great vibes. Bring your friends!', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', '2648e8ed-1973-4776-9109-f16775c89679', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('2bf38592-7bee-434b-8619-992a622ca91b', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🔥 INCOMING — Live From The Gutter', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', '99ce333a-5108-443d-b688-f1513dd81d5f', '2026-03-07 14:19:27.212449+00', '2026-03-07 14:19:27.212449+00'),
('ff9aa375-1109-46e5-8345-39acdbff78b7', '1eafb563-071a-45c6-a82e-79b460b3a851', 'lessgoo', NULL, NULL, NULL, NULL, '2026-03-07 14:24:11.588015+00', '2026-03-07 14:24:11.588015+00'),
('c5a3f4be-2815-44ea-b90f-c3f9d0ad62c7', 'e8f02149-2ccf-4324-950a-d2a574c46569', '🎉 test — test', NULL, NULL, '6348b9db-fd8a-466e-8549-6c4333cdfa56', 'a7f900af-1389-4320-bcf2-b8da522d53f3', '2026-03-17 08:15:38.725939+00', '2026-03-17 08:15:38.725939+00');

-- =============================================
-- 9. POST_COLLABORATORS (1 row)
-- =============================================
INSERT INTO post_collaborators (id, post_id, user_id, created_at) VALUES
('c6923188-2ae0-450b-aa78-2a6ef5ed8c5b', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-07 14:24:12.148815+00');

-- =============================================
-- 10. POST_LIKES (22 rows)
-- =============================================
INSERT INTO post_likes (id, post_id, user_id, reaction_type, created_at) VALUES
('352d6551-9ac7-4311-99ba-ddfcd26fbdd1', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'a1b2c3d4-0001-4000-8000-000000000001', 'fire', '2026-03-08 13:31:08.444856+00'),
('6afaf458-b42a-44ef-afa7-90a3b621c999', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'a1b2c3d4-0002-4000-8000-000000000002', 'heart', '2026-03-08 13:31:08.444856+00'),
('9eb65f30-9f06-4ed6-bc18-17c2bb5e6189', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'a1b2c3d4-0003-4000-8000-000000000003', 'eyes', '2026-03-08 13:31:08.444856+00'),
('f8163a55-ef88-4bfe-b950-89dcd8c449f4', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'a1b2c3d4-0004-4000-8000-000000000004', 'pray', '2026-03-08 13:31:08.444856+00'),
('eb798081-3f7b-4c95-9d3f-9066fcf38b76', 'ff9aa375-1109-46e5-8345-39acdbff78b7', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'fire', '2026-03-08 13:31:08.444856+00'),
('92424be2-7614-4bd5-ac00-a3fd0253ec9f', '2bf38592-7bee-434b-8619-992a622ca91b', 'a1b2c3d4-0001-4000-8000-000000000001', 'fire', '2026-03-08 13:31:08.444856+00'),
('82dfd265-24e7-4a4a-b158-200946bfd10f', '2bf38592-7bee-434b-8619-992a622ca91b', 'a1b2c3d4-0002-4000-8000-000000000002', 'fire', '2026-03-08 13:31:08.444856+00'),
('10934006-a017-4d58-a544-00eb03af7efe', '2bf38592-7bee-434b-8619-992a622ca91b', 'a1b2c3d4-0003-4000-8000-000000000003', 'heart', '2026-03-08 13:31:08.444856+00'),
('2b9bd0f4-d187-4b44-afdc-3f50417a894f', '2bf38592-7bee-434b-8619-992a622ca91b', 'a1b2c3d4-0005-4000-8000-000000000005', 'mood', '2026-03-08 13:31:08.444856+00'),
('5dc7f97a-66f4-44f3-84a5-d92eefe44ebd', '2bf38592-7bee-434b-8619-992a622ca91b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'eyes', '2026-03-08 13:31:08.444856+00'),
('b6526672-92cd-4ca7-9575-577184449310', '564e285a-25d8-49af-88d6-9f80e88029ed', 'a1b2c3d4-0001-4000-8000-000000000001', 'heart', '2026-03-08 13:31:08.444856+00'),
('3798a241-cfa3-41ad-b504-291e7c755e49', '564e285a-25d8-49af-88d6-9f80e88029ed', 'a1b2c3d4-0002-4000-8000-000000000002', 'heart', '2026-03-08 13:31:08.444856+00'),
('9ff3a837-9dc2-4612-ac39-30ff164df289', '564e285a-25d8-49af-88d6-9f80e88029ed', 'a1b2c3d4-0004-4000-8000-000000000004', 'fire', '2026-03-08 13:31:08.444856+00'),
('159274ca-9032-447a-854b-03ddff89a718', '63d09b44-b5ec-4a74-a18d-6a0cafccfe70', 'a1b2c3d4-0003-4000-8000-000000000003', 'pray', '2026-03-08 13:31:08.444856+00'),
('91c2bc3e-1880-4d61-a61d-6272d75b46be', '63d09b44-b5ec-4a74-a18d-6a0cafccfe70', 'a1b2c3d4-0005-4000-8000-000000000005', 'pray', '2026-03-08 13:31:08.444856+00'),
('cd1e5dd6-94d3-4a9e-bcda-a80f8fa97361', '63d09b44-b5ec-4a74-a18d-6a0cafccfe70', '1eafb563-071a-45c6-a82e-79b460b3a851', 'pray', '2026-03-08 13:31:08.444856+00'),
('e874d814-4789-4ed3-87ee-f755f54b9703', 'cce4efce-be65-4bd5-8d40-f49a11b54b3b', 'a1b2c3d4-0002-4000-8000-000000000002', 'mood', '2026-03-08 13:31:08.444856+00'),
('cd2c7a31-954e-4385-ad21-898a9ce7aa64', 'cce4efce-be65-4bd5-8d40-f49a11b54b3b', 'a1b2c3d4-0004-4000-8000-000000000004', 'heart', '2026-03-08 13:31:08.444856+00'),
('c8709bf3-800a-461a-ae07-6a64ec55595d', 'cce4efce-be65-4bd5-8d40-f49a11b54b3b', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'fire', '2026-03-08 13:31:08.444856+00'),
('f700dbf1-2ad7-4f8c-834e-939babc187c7', '0edbe6f3-4d99-4ca7-b4ca-7aebb121734f', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'heart', '2026-03-10 09:30:41.461331+00'),
('8d29e1f7-3342-4459-b4bd-1bc1b68262d3', '564e285a-25d8-49af-88d6-9f80e88029ed', '1eafb563-071a-45c6-a82e-79b460b3a851', 'heart', '2026-03-12 10:44:21.821214+00'),
('939233fe-71b5-4b8d-90c6-602259a1c61a', 'ff9aa375-1109-46e5-8345-39acdbff78b7', '1eafb563-071a-45c6-a82e-79b460b3a851', 'heart', '2026-03-16 13:37:54.499558+00');

-- =============================================
-- 11. POST_REPOSTS (5 rows)
-- =============================================
INSERT INTO post_reposts (id, post_id, user_id, created_at) VALUES
('40397892-b00b-4e04-b2c5-52772f06b54e', '2bf38592-7bee-434b-8619-992a622ca91b', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-08 12:33:58.305062+00'),
('0e039df8-82b3-4c00-9a20-9b9ebd9c70d6', '564e285a-25d8-49af-88d6-9f80e88029ed', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-08 12:34:01.105235+00'),
('2e355bc7-399b-4107-8002-a45f663d8788', '0edbe6f3-4d99-4ca7-b4ca-7aebb121734f', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-10 11:49:28.390205+00'),
('b8a075ed-ce72-4a8c-a041-a7240fda9127', '63d09b44-b5ec-4a74-a18d-6a0cafccfe70', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-11 09:16:25.15756+00'),
('f0faef6b-e35d-4046-800c-a7a18c47accb', 'acd8370d-58d9-4cfe-ae81-718b049001e3', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-12 10:44:35.586539+00');

-- =============================================
-- 12. TICKET_TIERS (15 rows)
-- =============================================
INSERT INTO ticket_tiers (id, event_id, name, price_cents, available_quantity, sort_order, created_at, updated_at) VALUES
('2e929368-8e6b-433e-b187-08b716c3ee55', '99ce333a-5108-443d-b688-f1513dd81d5f', 'General Admission', 15000, 100, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', '99ce333a-5108-443d-b688-f1513dd81d5f', 'VIP', 35000, 30, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('a71938b3-946f-45ae-be36-fdca7fe509eb', '2648e8ed-1973-4776-9109-f16775c89679', 'Standard', 12000, 60, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('a028cd18-fff1-4ba8-8d28-e84e06cd1cab', '2648e8ed-1973-4776-9109-f16775c89679', 'Premium Table', 25000, 20, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('2cd0fcaf-b0f8-4062-beaf-8d3e04201ec3', 'c65e659c-85f0-44ea-8bbf-24001f55be07', 'Entry', 5000, 50, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('3668eaec-f4f0-4173-8464-510e8b09e67f', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'Early Bird', 10000, 50, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('45aed354-d60c-4b9e-9216-6908f8e1010a', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'General', 15000, 100, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('3c31e6a1-2a0d-44eb-babf-c208e4163b45', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'VIP', 40000, 25, 2, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('8e666677-edb0-41b6-8bd5-d1ad91ee3f99', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'Dinner Seat', 20000, 80, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('d3ca224f-0304-48da-895a-622f1638f23c', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'VIP Dinner', 45000, 20, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('4da626f3-2dfa-4d5d-9365-ea5416b05df2', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'General', 18000, 60, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('78332bf0-69da-4b67-a5bd-b7b26ff91b14', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'Premium', 30000, 15, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'Standard', 25000, 150, 0, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('36dd902d-69e7-4141-ba25-8cd333f48804', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'VIP', 60000, 40, 1, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00'),
('ae54a6b5-b90d-48aa-84d8-55a0618930bc', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'VVIP Table', 120000, 10, 2, '2026-03-09 07:08:02.032312+00', '2026-03-09 07:08:02.032312+00');

-- =============================================
-- 13. RSVPS (44 rows)
-- =============================================
INSERT INTO rsvps (id, event_id, user_id, status, guest_count, created_at, updated_at) VALUES
('0b6adf28-3508-480a-b93d-d9e949de0ea8', '2648e8ed-1973-4776-9109-f16775c89679', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'going', 1, '2026-03-06 12:05:51.913292+00', '2026-03-06 12:05:51.913292+00'),
('4c8596ab-be58-4be4-95c4-88badec81e79', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'going', 1, '2026-03-06 12:05:51.913292+00', '2026-03-06 12:05:51.913292+00'),
('2ea2a468-7f85-4b3c-8c4f-637f97a0ba08', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'going', 1, '2026-03-06 12:05:51.913292+00', '2026-03-06 12:05:51.913292+00'),
('8fcb6530-0c3d-43dc-be09-36f7e0bb4b63', '99ce333a-5108-443d-b688-f1513dd81d5f', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 03:55:01.889493+00', '2026-03-07 03:55:02.700976+00'),
('f42978bc-578b-4981-b2a3-18753358f3dd', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-17 06:52:59.483224+00'),
('34f87513-19c1-456c-be7c-8f98bb797e1c', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-07 13:34:28.426712+00'),
('60ca933e-0b01-4cb7-9129-b63581b05ed3', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-17 06:55:48.883294+00'),
('44f68895-3018-41c3-89eb-a888b37bba46', '2648e8ed-1973-4776-9109-f16775c89679', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-07 13:34:28.426712+00'),
('b66d17b5-2aa9-48b1-a1eb-91167a88108a', 'c65e659c-85f0-44ea-8bbf-24001f55be07', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-07 13:34:28.426712+00'),
('a24910e7-b012-4e12-8493-a6e1d05ed035', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '1eafb563-071a-45c6-a82e-79b460b3a851', 'going', 1, '2026-03-07 13:34:28.426712+00', '2026-03-07 13:50:05.900916+00'),
('23b5f512-9a3b-408e-8462-eda07de079c1', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0003-4000-8000-000000000003', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('95ea1e5b-6f39-4ccf-9b95-fdc20ddeecb8', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0005-4000-8000-000000000005', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('614c061f-ac16-43ee-a725-70f091f3c174', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0007-4000-8000-000000000007', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('796f1a6c-1f1a-491d-9a01-d45f74a8d9d6', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0009-4000-8000-000000000009', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('d64efe20-d398-40c4-a5ad-6f7174b7c93a', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0010-4000-8000-000000000010', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('c38c6ecf-c8c9-46bc-acdb-bf4e0c780a12', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0001-4000-8000-000000000001', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('0c0e5db4-2972-4a04-be13-fa47d1196d3b', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0002-4000-8000-000000000002', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('90a2d1aa-3a21-452b-a82f-59f26f03901a', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0003-4000-8000-000000000003', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('0d31f71e-0f88-4829-95f5-82d07dffee14', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0004-4000-8000-000000000004', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('f7957e2e-54cc-479e-99b1-85dd2e1232a2', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0005-4000-8000-000000000005', 'going', 3, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('ded0e17f-ceba-4f6c-a5d7-7dc52c63a83c', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0006-4000-8000-000000000006', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('f485a8b4-cac7-4dfd-9f4f-fa419ce8d98f', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0007-4000-8000-000000000007', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('cddcb033-49eb-48a1-ada2-6f63c1454060', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0008-4000-8000-000000000008', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('b2528822-59e8-4a68-a307-d5a7c1ebafa2', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0009-4000-8000-000000000009', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('cbeb75d2-ca85-45ee-b201-5280eb01d303', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0010-4000-8000-000000000010', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('5862c1d1-43d1-4406-a59a-b8a801526fb4', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0001-4000-8000-000000000001', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('3b97c02c-f175-4d0c-8f6d-a561ff805512', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0002-4000-8000-000000000002', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('230f5a74-fcce-4ccd-81bf-01efc483c1d6', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0004-4000-8000-000000000004', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('ce3d42df-abcd-4333-854b-d88ce548a0de', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0006-4000-8000-000000000006', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('7cb41096-403c-45fb-992b-929f744f34c7', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0008-4000-8000-000000000008', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('b1426a7c-a251-4105-a502-6b82bbd8060b', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0003-4000-8000-000000000003', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('06f10b2a-e2a1-4736-855f-cebefb6cc53f', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0005-4000-8000-000000000005', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('8fa9470c-2efb-4854-82c4-23f683c71522', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0007-4000-8000-000000000007', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('4c6dea2a-899f-415e-90a9-16640fdc7bb6', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0009-4000-8000-000000000009', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('3644d19a-e911-4b62-b20c-3d71f8c67dec', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0001-4000-8000-000000000001', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('e77e3fda-db6b-4b07-b877-1590baf971b4', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0003-4000-8000-000000000003', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('d881d0ff-8da6-494b-a480-0bbf3fbb93fe', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0005-4000-8000-000000000005', 'going', 3, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('f76d5615-2edf-4660-a29b-f6ee516f98d1', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0006-4000-8000-000000000006', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('0654576a-83cf-47d4-8c2e-66bbc18b4fdc', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0010-4000-8000-000000000010', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('32d42d73-620d-4daa-94cc-8a2a2c054ce1', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0002-4000-8000-000000000002', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('727ea41b-c535-4419-a72d-fa12cf2c7961', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0001-4000-8000-000000000001', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('68af606c-d486-4cac-b3b4-3d58e134d647', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0002-4000-8000-000000000002', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('ea00d795-f87a-4d3b-923e-220f10a695fe', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0003-4000-8000-000000000003', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('46be221c-d420-4c0e-bace-7d520c2c241f', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0004-4000-8000-000000000004', 'going', 3, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('e61ab44d-d618-4f5a-9e02-a7c8b101cdf1', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0005-4000-8000-000000000005', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('e8dcf3f8-a88f-4e65-b510-6de6c9fce4d1', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0006-4000-8000-000000000006', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('c9d41230-f3f9-45c2-9e4a-66c9011d1106', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0007-4000-8000-000000000007', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('6c02e6e2-fe1b-447e-9267-6564087de21f', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0008-4000-8000-000000000008', 'going', 1, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00'),
('fd613a6d-d8dd-4462-a51e-1f14f36144d5', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0001-4000-8000-000000000001', 'going', 2, '2026-03-09 07:09:37.857691+00', '2026-03-09 07:09:37.857691+00');

-- =============================================
-- 14. EVENT_MESSAGES (1 row)
-- =============================================
INSERT INTO event_messages (id, event_id, user_id, content, created_at) VALUES
('da2fc554-6288-49b9-8630-4e3bb3477032', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '1eafb563-071a-45c6-a82e-79b460b3a851', 'wasssupppp', '2026-03-15 03:05:34.748586+00');

-- =============================================
-- 15. EVENT_REMINDERS (1 row)
-- =============================================
INSERT INTO event_reminders (id, event_id, is_enabled, reminder_type, created_at) VALUES
('06384d11-60da-4b0a-b962-14353535cd3a', 'a7f900af-1389-4320-bcf2-b8da522d53f3', true, '1_day', '2026-03-17 08:15:39.158039+00');

-- =============================================
-- 16. ORDERS (40 rows)
-- =============================================
INSERT INTO orders (id, event_id, user_id, ticket_tier_id, quantity, amount_cents, platform_fee_cents, currency, status, stripe_payment_intent_id, stripe_account_id, reserved_at, confirmed_at, cancelled_at, expires_at, created_at, updated_at) VALUES
('5dc95728-1e81-4421-b8b1-35752d2801ae', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0001-4000-8000-000000000001', '2e929368-8e6b-433e-b187-08b716c3ee55', 2, 30000, 1500, 'zar', 'confirmed', NULL, NULL, '2026-01-10 10:00:00+00', '2026-01-10 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('9eb68d6f-b54f-43a6-9c8b-5b4c7e5e42af', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0002-4000-8000-000000000002', '2e929368-8e6b-433e-b187-08b716c3ee55', 1, 15000, 750, 'zar', 'confirmed', NULL, NULL, '2026-01-11 12:00:00+00', '2026-01-11 12:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('e5a4b46f-365d-4308-bff7-7b641e9e5ea2', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0003-4000-8000-000000000003', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 2, 70000, 3500, 'zar', 'confirmed', NULL, NULL, '2026-01-12 09:00:00+00', '2026-01-12 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('abbe2b22-f5b3-4a53-9ecd-f4e311cd76d4', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0004-4000-8000-000000000004', '2e929368-8e6b-433e-b187-08b716c3ee55', 3, 45000, 2250, 'zar', 'confirmed', NULL, NULL, '2026-01-13 14:00:00+00', '2026-01-13 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('045499a0-33e0-4caa-9c8f-8193525f6d9e', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0005-4000-8000-000000000005', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 1, 35000, 1750, 'zar', 'confirmed', NULL, NULL, '2026-01-14 11:00:00+00', '2026-01-14 11:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('1586920b-532f-4138-95b6-1f8cbb6c588a', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0006-4000-8000-000000000006', '2e929368-8e6b-433e-b187-08b716c3ee55', 2, 30000, 1500, 'zar', 'confirmed', NULL, NULL, '2026-01-15 16:00:00+00', '2026-01-15 16:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('01b2f389-ef7d-40ee-946d-6910e3edb77d', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0007-4000-8000-000000000007', '2e929368-8e6b-433e-b187-08b716c3ee55', 1, 15000, 750, 'zar', 'confirmed', NULL, NULL, '2026-01-16 08:00:00+00', '2026-01-16 08:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('956148e3-aa73-40a9-87a5-45a0787bb1a8', '99ce333a-5108-443d-b688-f1513dd81d5f', 'a1b2c3d4-0008-4000-8000-000000000008', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 1, 35000, 1750, 'zar', 'confirmed', NULL, NULL, '2026-01-16 15:00:00+00', '2026-01-16 15:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('1d0f8f90-2ece-4aba-a190-f95efad9ce25', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0001-4000-8000-000000000001', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 2, 24000, 1200, 'zar', 'confirmed', NULL, NULL, '2026-02-05 10:00:00+00', '2026-02-05 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('95d926f1-2cb4-40f5-8497-0e51d8230950', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0003-4000-8000-000000000003', 'a028cd18-fff1-4ba8-8d28-e84e06cd1cab', 1, 25000, 1250, 'zar', 'confirmed', NULL, NULL, '2026-02-07 14:00:00+00', '2026-02-07 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('7a2dc585-9683-4131-ba06-3edbd1a2ed8a', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0005-4000-8000-000000000005', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 1, 12000, 600, 'zar', 'confirmed', NULL, NULL, '2026-02-09 11:00:00+00', '2026-02-09 11:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('38a860b6-6f8e-4c08-9617-c73e2804f82a', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0007-4000-8000-000000000007', 'a028cd18-fff1-4ba8-8d28-e84e06cd1cab', 2, 50000, 2500, 'zar', 'confirmed', NULL, NULL, '2026-02-10 09:00:00+00', '2026-02-10 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('85edfb40-785b-46f2-bacc-3660f4f28d73', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0009-4000-8000-000000000009', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 1, 12000, 600, 'zar', 'confirmed', NULL, NULL, '2026-02-12 16:00:00+00', '2026-02-12 16:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('46f8b3c3-8665-4573-b42a-f23ff33c6b19', '2648e8ed-1973-4776-9109-f16775c89679', 'a1b2c3d4-0010-4000-8000-000000000010', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 2, 24000, 1200, 'zar', 'confirmed', NULL, NULL, '2026-02-13 10:00:00+00', '2026-02-13 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('a5de8e95-2bb1-43ed-beda-18f039b3646d', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0001-4000-8000-000000000001', '3668eaec-f4f0-4173-8464-510e8b09e67f', 2, 20000, 1000, 'zar', 'confirmed', NULL, NULL, '2026-03-01 10:00:00+00', '2026-03-01 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('ac22ebda-1b4e-4c5c-9888-fd221ab176c5', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0002-4000-8000-000000000002', '45aed354-d60c-4b9e-9216-6908f8e1010a', 1, 15000, 750, 'zar', 'confirmed', NULL, NULL, '2026-03-02 12:00:00+00', '2026-03-02 12:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('e6189391-750c-405d-9421-e77e6f1b4d6e', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0003-4000-8000-000000000003', '3c31e6a1-2a0d-44eb-babf-c208e4163b45', 2, 80000, 4000, 'zar', 'confirmed', NULL, NULL, '2026-03-03 09:00:00+00', '2026-03-03 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('398efc1a-78eb-42ce-9be7-405087f1eaa7', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0004-4000-8000-000000000004', '3668eaec-f4f0-4173-8464-510e8b09e67f', 1, 10000, 500, 'zar', 'confirmed', NULL, NULL, '2026-03-04 14:00:00+00', '2026-03-04 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('f469136b-ca24-484f-8af3-968f078a4b66', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0005-4000-8000-000000000005', '45aed354-d60c-4b9e-9216-6908f8e1010a', 3, 45000, 2250, 'zar', 'confirmed', NULL, NULL, '2026-03-05 11:00:00+00', '2026-03-05 11:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('59cab1c0-9e7b-4b85-a28b-cf0799e344f3', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0006-4000-8000-000000000006', '3668eaec-f4f0-4173-8464-510e8b09e67f', 2, 20000, 1000, 'zar', 'confirmed', NULL, NULL, '2026-03-05 16:00:00+00', '2026-03-05 16:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('289a008e-94bf-436f-8757-fc015a073333', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0007-4000-8000-000000000007', '45aed354-d60c-4b9e-9216-6908f8e1010a', 1, 15000, 750, 'zar', 'confirmed', NULL, NULL, '2026-03-06 08:00:00+00', '2026-03-06 08:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('b29332b8-169a-411d-9ed6-c132dfb9ed55', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0008-4000-8000-000000000008', '3c31e6a1-2a0d-44eb-babf-c208e4163b45', 1, 40000, 2000, 'zar', 'confirmed', NULL, NULL, '2026-03-07 10:00:00+00', '2026-03-07 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('f289d61c-4fdf-4b6a-b923-d17db146dbc9', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0009-4000-8000-000000000009', '3668eaec-f4f0-4173-8464-510e8b09e67f', 1, 10000, 500, 'zar', 'confirmed', NULL, NULL, '2026-03-08 12:00:00+00', '2026-03-08 12:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('30f9e5e6-cc90-4ed5-aa64-22d24f56547f', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', 'a1b2c3d4-0010-4000-8000-000000000010', '45aed354-d60c-4b9e-9216-6908f8e1010a', 2, 30000, 1500, 'zar', 'confirmed', NULL, NULL, '2026-03-08 15:00:00+00', '2026-03-08 15:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('c977a28c-17ac-4bf3-9415-d3d1ed9a03c4', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0001-4000-8000-000000000001', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 2, 40000, 2000, 'zar', 'confirmed', NULL, NULL, '2026-03-05 10:00:00+00', '2026-03-05 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('7479f19d-e480-42d2-823f-5b4df67336a8', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0002-4000-8000-000000000002', 'd3ca224f-0304-48da-895a-622f1638f23c', 1, 45000, 2250, 'zar', 'confirmed', NULL, NULL, '2026-03-06 14:00:00+00', '2026-03-06 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('0a8159d1-3138-4bc8-a262-aa996534f6ef', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0004-4000-8000-000000000004', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 1, 20000, 1000, 'zar', 'confirmed', NULL, NULL, '2026-03-07 09:00:00+00', '2026-03-07 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('5d12ae35-ad2a-465c-b2b1-c4129b433171', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0006-4000-8000-000000000006', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 2, 40000, 2000, 'zar', 'confirmed', NULL, NULL, '2026-03-08 11:00:00+00', '2026-03-08 11:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('62b4776f-0d7c-4fcb-9bfa-ab3ad6343b83', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'a1b2c3d4-0008-4000-8000-000000000008', 'd3ca224f-0304-48da-895a-622f1638f23c', 2, 90000, 4500, 'zar', 'confirmed', NULL, NULL, '2026-03-09 08:00:00+00', '2026-03-09 08:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('a25f7eed-4c5e-4600-81c6-64355849554e', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0003-4000-8000-000000000003', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 2, 36000, 1800, 'zar', 'confirmed', NULL, NULL, '2026-03-06 10:00:00+00', '2026-03-06 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('458afe6f-9330-4a35-8330-4f3d17a7043d', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0005-4000-8000-000000000005', '78332bf0-69da-4b67-a5bd-b7b26ff91b14', 1, 30000, 1500, 'zar', 'confirmed', NULL, NULL, '2026-03-07 12:00:00+00', '2026-03-07 12:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('d977b4bb-2589-47d6-aa8c-1de37fff4e35', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0007-4000-8000-000000000007', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 1, 18000, 900, 'zar', 'confirmed', NULL, NULL, '2026-03-08 14:00:00+00', '2026-03-08 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('e7bc2d2f-f24d-4e2c-ba0a-0d607eb3745b', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'a1b2c3d4-0009-4000-8000-000000000009', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 2, 36000, 1800, 'zar', 'confirmed', NULL, NULL, '2026-03-09 09:00:00+00', '2026-03-09 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('eb32d9d5-a41c-4ecd-96bf-95034af6fa34', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0001-4000-8000-000000000001', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 2, 50000, 2500, 'zar', 'confirmed', NULL, NULL, '2026-03-01 10:00:00+00', '2026-03-01 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('25f7cbbc-7666-4d5e-870f-9ea6da7e0f15', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0002-4000-8000-000000000002', '36dd902d-69e7-4141-ba25-8cd333f48804', 1, 60000, 3000, 'zar', 'confirmed', NULL, NULL, '2026-03-03 12:00:00+00', '2026-03-03 12:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('6f51d89d-5506-4583-b8f5-3b6a8ecf85df', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0003-4000-8000-000000000003', 'ae54a6b5-b90d-48aa-84d8-55a0618930bc', 1, 120000, 6000, 'zar', 'confirmed', NULL, NULL, '2026-03-04 09:00:00+00', '2026-03-04 09:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('88793beb-1388-400c-9975-5773cac249e0', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0005-4000-8000-000000000005', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 3, 75000, 3750, 'zar', 'confirmed', NULL, NULL, '2026-03-05 14:00:00+00', '2026-03-05 14:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('62b51d75-7e60-4530-848f-bab4b9edcd44', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0006-4000-8000-000000000006', '36dd902d-69e7-4141-ba25-8cd333f48804', 2, 120000, 6000, 'zar', 'confirmed', NULL, NULL, '2026-03-06 16:00:00+00', '2026-03-06 16:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('c4e88714-fd01-4ca2-a2d8-4c8c19a91e3e', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0010-4000-8000-000000000010', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 1, 25000, 1250, 'zar', 'confirmed', NULL, NULL, '2026-03-08 10:00:00+00', '2026-03-08 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00'),
('44625e91-ada6-4834-a00b-1503a9247360', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'a1b2c3d4-0010-4000-8000-000000000010', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 1, 25000, 1250, 'zar', 'confirmed', NULL, NULL, '2026-03-08 10:00:00+00', '2026-03-08 10:00:00+00', NULL, '2026-03-09 07:23:56.116996+00', '2026-03-09 07:08:56.116996+00', '2026-03-09 07:08:56.116996+00');

-- =============================================
-- 17. TICKETS (62 rows — COMPLETE)
-- =============================================
-- Event: Live From The Gutter (99ce333a)
INSERT INTO tickets (id, order_id, event_id, ticket_tier_id, user_id, qr_code, status, checked_in_at, created_at) VALUES
('8c342334-c1fa-4093-8b87-6b507a464d5b', '5dc95728-1e81-4421-b8b1-35752d2801ae', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-0d49b463-64a', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('a01e45fc-5187-4e01-8700-6ca712ff76bf', '5dc95728-1e81-4421-b8b1-35752d2801ae', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-a6c25744-f6b', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('30561b43-dc04-401c-ba09-082f3ff491a2', '9eb68d6f-b54f-43a6-9c8b-5b4c7e5e42af', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0002-4000-8000-000000000002', 'QR-ce2b788e-03d', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('a03d173c-a57b-4ef6-9327-605b80f8ef6f', 'e5a4b46f-365d-4308-bff7-7b641e9e5ea2', '99ce333a-5108-443d-b688-f1513dd81d5f', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-632c086a-681', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('f9440c93-83f7-42fa-97f6-ef0e610a815d', 'e5a4b46f-365d-4308-bff7-7b641e9e5ea2', '99ce333a-5108-443d-b688-f1513dd81d5f', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-974f1e26-a1c', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('7630b3b4-6c54-4596-b998-bae014188170', 'abbe2b22-f5b3-4a53-9ecd-f4e311cd76d4', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0004-4000-8000-000000000004', 'QR-ad0f6ba1-15c', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('0476a29b-949e-44a8-9cd8-95f2b6dd23c0', 'abbe2b22-f5b3-4a53-9ecd-f4e311cd76d4', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0004-4000-8000-000000000004', 'QR-e2cec76a-1d2', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('80a400d0-1306-4115-be6f-88d05a00f411', 'abbe2b22-f5b3-4a53-9ecd-f4e311cd76d4', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0004-4000-8000-000000000004', 'QR-9f0288ff-590', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('906e84cd-7df8-4359-9c16-ae023137ac07', '045499a0-33e0-4caa-9c8f-8193525f6d9e', '99ce333a-5108-443d-b688-f1513dd81d5f', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-ce7eda61-2ea', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('a51ad55b-8ec1-42fa-baae-03d9a2eceb2c', '1586920b-532f-4138-95b6-1f8cbb6c588a', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-36f17a7f-1cb', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('44339718-c777-4afb-be64-2c82fabf485e', '1586920b-532f-4138-95b6-1f8cbb6c588a', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-5a43e252-42f', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('8fa35431-3435-4185-8e29-cbcf55173b60', '01b2f389-ef7d-40ee-946d-6910e3edb77d', '99ce333a-5108-443d-b688-f1513dd81d5f', '2e929368-8e6b-433e-b187-08b716c3ee55', 'a1b2c3d4-0007-4000-8000-000000000007', 'QR-6e6931ec-845', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('af63056a-7653-4ac0-9cf5-a85ad5cbf50e', '956148e3-aa73-40a9-87a5-45a0787bb1a8', '99ce333a-5108-443d-b688-f1513dd81d5f', 'e1b4cd68-f948-45e7-b579-5f1c2d48d5f6', 'a1b2c3d4-0008-4000-8000-000000000008', 'QR-fcf9b0d5-ce8', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
-- Event: Weekend Brunch Gathering (2648e8ed)
('f55fa807-29a2-4d7b-bf17-3e5c27cb4c47', '1d0f8f90-2ece-4aba-a190-f95efad9ce25', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-89fed33b-f1b', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('51ecfab9-07ae-4083-98f1-db295905035e', '1d0f8f90-2ece-4aba-a190-f95efad9ce25', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-95ced207-613', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('2d5fe28e-7896-4bce-9a1c-6552d46be816', '95d926f1-2cb4-40f5-8497-0e51d8230950', '2648e8ed-1973-4776-9109-f16775c89679', 'a028cd18-fff1-4ba8-8d28-e84e06cd1cab', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-58696d0b-882', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('48d52fc2-dc95-494b-93bf-c09914cd5091', '7a2dc585-9683-4131-ba06-3edbd1a2ed8a', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-cf66d260-9b2', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('1c0da9e0-4ba7-428f-9cb4-860a7af88003', '38a860b6-6f8e-4c08-9617-c73e2804f82a', '2648e8ed-1973-4776-9109-f16775c89679', 'a028cd18-fff1-4ba8-8d28-e84e06cd1cab', 'a1b2c3d4-0007-4000-8000-000000000007', 'QR-f2722ceb-384', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('868aa95d-e39d-435c-bd36-395f6e17839b', '38a860b6-6f8e-4c08-9617-c73e2804f82a', '2648e8ed-1973-4776-9109-f16775c89679', 'a028cd18-fff1-4ba8-8d28-e84e06cd1cab', 'a1b2c3d4-0007-4000-8000-000000000007', 'QR-c32379b3-b3e', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('50ce621f-831c-4d57-b6d3-00be47af79c4', '85edfb40-785b-46f2-bacc-3660f4f28d73', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0009-4000-8000-000000000009', 'QR-6b251d14-817', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('35bcefba-534d-4409-9fed-f7ad31969185', '46f8b3c3-8665-4573-b42a-f23ff33c6b19', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0010-4000-8000-000000000010', 'QR-daceefc7-97f', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('5ed65ff1-dde1-4d0d-92a9-11787f321a86', '46f8b3c3-8665-4573-b42a-f23ff33c6b19', '2648e8ed-1973-4776-9109-f16775c89679', 'a71938b3-946f-45ae-be36-fdca7fe509eb', 'a1b2c3d4-0010-4000-8000-000000000010', 'QR-a3815f14-0bf', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
-- Event: Members Only Launch Party (8fa32304)
('21c6e815-ec04-4b6f-800a-5d33032fd00b', 'a5de8e95-2bb1-43ed-beda-18f039b3646d', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3668eaec-f4f0-4173-8464-510e8b09e67f', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-73f15faa-8b7', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('f8f75c52-08fc-439e-b91e-157d26143444', 'a5de8e95-2bb1-43ed-beda-18f039b3646d', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3668eaec-f4f0-4173-8464-510e8b09e67f', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-faccee87-1c9', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('8b4f15cf-34d3-4e8d-8af9-33174bd1ed4c', 'ac22ebda-1b4e-4c5c-9888-fd221ab176c5', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0002-4000-8000-000000000002', 'QR-9ed5f15d-147', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('7032376b-3f27-4529-9177-bd1c1fc861cd', 'e6189391-750c-405d-9421-e77e6f1b4d6e', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3c31e6a1-2a0d-44eb-babf-c208e4163b45', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-ebadbfff-21f', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('c37b6730-9104-408b-8c34-6f6af4959d8e', 'e6189391-750c-405d-9421-e77e6f1b4d6e', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3c31e6a1-2a0d-44eb-babf-c208e4163b45', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-5881a43f-edf', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('3ecde6e9-f74b-4992-b4bc-48b2892a89e8', '398efc1a-78eb-42ce-9be7-405087f1eaa7', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3668eaec-f4f0-4173-8464-510e8b09e67f', 'a1b2c3d4-0004-4000-8000-000000000004', 'QR-32a50bfd-65c', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('127b29f3-4d3f-487a-bee2-f6fe03f57162', 'f469136b-ca24-484f-8af3-968f078a4b66', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-28c4e6fc-cc9', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('70a52b3d-9b9e-4ac4-a955-8d7ceae86a74', 'f469136b-ca24-484f-8af3-968f078a4b66', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-ce90d4f1-6dd', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('7373cc87-a919-4425-a23f-fa7f53890a98', 'f469136b-ca24-484f-8af3-968f078a4b66', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-a999f865-d0d', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('e9f081db-6c88-47ab-a0c7-f0ec9a98088a', '59cab1c0-9e7b-4b85-a28b-cf0799e344f3', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3668eaec-f4f0-4173-8464-510e8b09e67f', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-b03185f9-c27', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('191d8ff8-c1d2-4423-94dc-80b3e1014f43', '289a008e-94bf-436f-8757-fc015a073333', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0007-4000-8000-000000000007', 'QR-f3b972a2-0d7', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('be2a456f-76ec-45c1-85b4-33110b6b0eb0', 'b29332b8-169a-411d-9ed6-c132dfb9ed55', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3c31e6a1-2a0d-44eb-babf-c208e4163b45', 'a1b2c3d4-0008-4000-8000-000000000008', 'QR-fc4b3b5f-bbc', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('d80067ee-4eec-4424-86b9-ee31796cf8c3', 'f289d61c-4fdf-4b6a-b923-d17db146dbc9', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '3668eaec-f4f0-4173-8464-510e8b09e67f', 'a1b2c3d4-0009-4000-8000-000000000009', 'QR-ff35077d-7e5', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('a69614f2-c0c0-4738-a5c1-b51ad0b4d757', '30f9e5e6-cc90-4ed5-aa64-22d24f56547f', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0010-4000-8000-000000000010', 'QR-71be83d4-7f0', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('cf057045-585d-4713-bb39-7928cc5db14b', '30f9e5e6-cc90-4ed5-aa64-22d24f56547f', '8fa32304-7cc5-463e-99ae-a8cb2d1f6ba5', '45aed354-d60c-4b9e-9216-6908f8e1010a', 'a1b2c3d4-0010-4000-8000-000000000010', 'QR-41a3a01f-969', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
-- Event: Summer Garden Dinner Party (8e0cf84a)
('10568f81-e2f0-470b-8fd5-9124f99fbaeb', 'c977a28c-17ac-4bf3-9415-d3d1ed9a03c4', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-fe8d4df4-675', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('fd97ac4c-1bf4-4111-9edf-c0e8008eab40', 'c977a28c-17ac-4bf3-9415-d3d1ed9a03c4', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-e917c372-c5c', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('70492d68-8c01-45b4-8af8-3a9107e3e921', '7479f19d-e480-42d2-823f-5b4df67336a8', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'd3ca224f-0304-48da-895a-622f1638f23c', 'a1b2c3d4-0002-4000-8000-000000000002', 'QR-e02d0e87-ae6', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('846284ae-9b3c-442f-b767-cb3282f2e4df', '0a8159d1-3138-4bc8-a262-aa996534f6ef', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 'a1b2c3d4-0004-4000-8000-000000000004', 'QR-a2cb81bd-5b6', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('768baf25-09ef-4742-a03f-f18eaecba367', '5d12ae35-ad2a-465c-b2b1-c4129b433171', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-b558a301-225', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('fe91f1a8-66fe-435b-8c8d-3057f1f77a98', '5d12ae35-ad2a-465c-b2b1-c4129b433171', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', '8e666677-edb0-41b6-8bd5-d1ad91ee3f99', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-0b26c8c5-7bd', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('708bad69-b641-4a2b-8394-e8c89295673e', '62b4776f-0d7c-4fcb-9bfa-ab3ad6343b83', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'd3ca224f-0304-48da-895a-622f1638f23c', 'a1b2c3d4-0008-4000-8000-000000000008', 'QR-0e230aae-2bb', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('78210cbe-68eb-4593-beec-9fbd220a827f', '62b4776f-0d7c-4fcb-9bfa-ab3ad6343b83', '8e0cf84a-e98c-4a48-905e-8f1d15a32ee4', 'd3ca224f-0304-48da-895a-622f1638f23c', 'a1b2c3d4-0008-4000-8000-000000000008', 'QR-4578efce-590', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
-- Event: Rooftop Sunset Cocktails (50cf07a0)
('47ab0aa2-4894-47e7-828a-cf804ecbc985', 'a25f7eed-4c5e-4600-81c6-64355849554e', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-7ee32c1f-08c', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('6183b74f-5227-447c-8ff8-44cfaf60c4b5', 'a25f7eed-4c5e-4600-81c6-64355849554e', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-f9e82689-599', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('c98da626-0836-4547-a09d-6663a78bac62', '458afe6f-9330-4a35-8330-4f3d17a7043d', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '78332bf0-69da-4b67-a5bd-b7b26ff91b14', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-0aa6239e-5f4', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('cc0985ac-6331-4b57-84dd-19fef07544f6', 'd977b4bb-2589-47d6-aa8c-1de37fff4e35', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 'a1b2c3d4-0007-4000-8000-000000000007', 'QR-bb129fe2-4c0', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('4fd1545a-60ce-4e31-b4e7-2f805f02d05b', 'e7bc2d2f-f24d-4e2c-ba0a-0d607eb3745b', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 'a1b2c3d4-0009-4000-8000-000000000009', 'QR-3aa10454-180', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('93d6c33a-9dd4-45df-be46-5f11dc06de27', 'e7bc2d2f-f24d-4e2c-ba0a-0d607eb3745b', '50cf07a0-bac9-4905-a1e3-1b63533a3681', '4da626f3-2dfa-4d5d-9365-ea5416b05df2', 'a1b2c3d4-0009-4000-8000-000000000009', 'QR-eb7aff13-417', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
-- Event: New Year''s Eve Celebration (f45146db)
('c34be2fb-1e83-4ea8-bcbe-8d479218f251', 'eb32d9d5-a41c-4ecd-96bf-95034af6fa34', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-71c4e246-82d', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('ca0e9279-3058-41ef-808a-b663b8ef8a94', 'eb32d9d5-a41c-4ecd-96bf-95034af6fa34', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0001-4000-8000-000000000001', 'QR-6aea00f6-10e', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('6d411e53-7251-4660-8ace-f4c6458428e0', '25f7cbbc-7666-4d5e-870f-9ea6da7e0f15', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '36dd902d-69e7-4141-ba25-8cd333f48804', 'a1b2c3d4-0002-4000-8000-000000000002', 'QR-40690ae8-5a3', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('acc85d88-4a66-432f-8513-df15d68d2ca5', '6f51d89d-5506-4583-b8f5-3b6a8ecf85df', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'ae54a6b5-b90d-48aa-84d8-55a0618930bc', 'a1b2c3d4-0003-4000-8000-000000000003', 'QR-f3656bc8-250', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('29912eed-9ebe-4e3f-8081-9733c2248a24', '88793beb-1388-400c-9975-5773cac249e0', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-4a5892d6-33d', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('7dcf54e1-6e05-49d6-adb7-1440f152bac3', '88793beb-1388-400c-9975-5773cac249e0', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-7c2a4dfa-ffc', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('a1e908fd-653f-42d9-ac93-67f02fe77513', '88793beb-1388-400c-9975-5773cac249e0', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0005-4000-8000-000000000005', 'QR-171d17e5-666', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('29ff7112-1746-4880-9966-9fe36679f1c1', '62b51d75-7e60-4530-848f-bab4b9edcd44', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '36dd902d-69e7-4141-ba25-8cd333f48804', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-23f29e88-cfa', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('7c038713-1013-491e-a977-88f8f02205b8', '62b51d75-7e60-4530-848f-bab4b9edcd44', 'f45146db-33c3-469e-95a5-c0d41cf7903d', '36dd902d-69e7-4141-ba25-8cd333f48804', 'a1b2c3d4-0006-4000-8000-000000000006', 'QR-211b6193-8fe', 'valid', NULL, '2026-03-09 07:09:18.045214+00'),
('19fb3c5c-ab57-4a35-9062-f7459cc7d136', '44625e91-ada6-4834-a00b-1503a9247360', 'f45146db-33c3-469e-95a5-c0d41cf7903d', 'c8af0363-878b-4ddd-b6e7-ea568cb55d71', 'a1b2c3d4-0010-4000-8000-000000000010', 'QR-95cd09f1-51d', 'valid', NULL, '2026-03-09 07:09:18.045214+00');

-- =============================================
-- 18. DM_THREADS (2 rows)
-- =============================================
INSERT INTO dm_threads (id, user_id, organiser_profile_id, created_at, updated_at) VALUES
('30539b0f-f692-4f36-a009-79c8b7cf9f47', '1eafb563-071a-45c6-a82e-79b460b3a851', '6348b9db-fd8a-466e-8549-6c4333cdfa56', '2026-03-09 12:40:40.857303+00', '2026-03-09 12:40:40.857303+00'),
('075ac739-8e10-4bb5-bae8-8fe4b379a106', 'e8f02149-2ccf-4324-950a-d2a574c46569', '6348b9db-fd8a-466e-8549-6c4333cdfa56', '2026-03-10 09:35:11.033327+00', '2026-03-10 09:35:11.033327+00');

-- =============================================
-- 19. DM_MESSAGES (6 rows)
-- =============================================
INSERT INTO dm_messages (id, thread_id, sender_id, content, created_at) VALUES
('380e5816-1460-43d1-87b6-df2ece9b6a5b', '30539b0f-f692-4f36-a009-79c8b7cf9f47', '1eafb563-071a-45c6-a82e-79b460b3a851', 'whats good brother', '2026-03-09 12:40:45.507922+00'),
('35fac0d5-d2dc-48d4-8ee4-ab1badcbeafc', '30539b0f-f692-4f36-a009-79c8b7cf9f47', '1eafb563-071a-45c6-a82e-79b460b3a851', 'not much wbu', '2026-03-09 12:41:06.391831+00'),
('d4a84133-17fb-4aa8-b832-0d22e814a7b6', '30539b0f-f692-4f36-a009-79c8b7cf9f47', '1eafb563-071a-45c6-a82e-79b460b3a851', 'hey', '2026-03-10 08:12:33.230532+00'),
('b66b2d6b-7c3b-4405-818f-28ab18c59338', '075ac739-8e10-4bb5-bae8-8fe4b379a106', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'hello', '2026-03-10 09:35:14.346034+00'),
('09a4075f-561a-40bc-a7e1-97ce216d8890', '075ac739-8e10-4bb5-bae8-8fe4b379a106', '1eafb563-071a-45c6-a82e-79b460b3a851', 'hey', '2026-03-10 09:35:30.023057+00'),
('15320e1b-d9d9-41a3-bd59-97ca683dd507', '30539b0f-f692-4f36-a009-79c8b7cf9f47', '1eafb563-071a-45c6-a82e-79b460b3a851', 'tester', '2026-03-12 11:29:39.490403+00');

-- =============================================
-- 20. GROUP_CHATS (10 rows)
-- =============================================
INSERT INTO group_chats (id, name, member_count, created_at, updated_at) VALUES
('a1b2c3d4-0001-4000-8000-000000000001', 'Friday Night Out', 6, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('a1b2c3d4-0002-4000-8000-000000000002', 'Wedding Squad', 8, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('a1b2c3d4-0003-4000-8000-000000000003', 'Rooftop Crew', 12, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('a1b2c3d4-0004-4000-8000-000000000004', 'Birthday Bash', 15, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('a1b2c3d4-0005-4000-8000-000000000005', 'NYE Planning', 4, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('a1b2c3d4-0006-4000-8000-000000000006', 'Dinner Club', 5, '2026-03-05 07:05:43.686505+00', '2026-03-05 07:05:43.686505+00'),
('68f8a86f-b1d9-496b-8ee1-e78997721e1f', 'testers', 1, '2026-03-09 07:02:55.101089+00', '2026-03-09 07:02:55.101089+00'),
('03c1f271-f46f-423c-b733-25d005627c0b', 'testers', 7, '2026-03-09 07:48:08.470065+00', '2026-03-09 07:48:08.470065+00'),
('cdc38735-b0f2-4164-a875-41290cd4de8a', 'test', 3, '2026-03-12 11:29:52.680617+00', '2026-03-12 11:29:52.680617+00'),
('b4d9bac3-98e3-4ba8-ad03-d1048d46b900', 'MO', 3, '2026-03-16 13:40:00.070507+00', '2026-03-16 13:40:00.070507+00');

-- =============================================
-- 21. GROUP_CHAT_MEMBERS (45 rows)
-- =============================================
INSERT INTO group_chat_members (id, group_chat_id, user_id, joined_at) VALUES
('679ab7b6-ab9e-4014-85e1-c9953a1912b1', '03c1f271-f46f-423c-b733-25d005627c0b', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:40:59.578188+00'),
('e8b1b2ec-4411-45ed-8610-e920b5f01291', '03c1f271-f46f-423c-b733-25d005627c0b', '08531275-4784-48d4-a02f-1ba2bd4c920d', '2026-03-09 08:42:46.816944+00'),
('a21943a0-caa0-4610-b857-80d318b3198b', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-09 08:42:46.816944+00'),
('0c130f98-9fc7-44fe-8b0b-89d2ab5b6f46', '03c1f271-f46f-423c-b733-25d005627c0b', '59137a61-98ce-4b1a-af30-997b8c58ce00', '2026-03-09 08:42:46.816944+00'),
('0bdca95d-5308-4505-bb1e-c46684bcca5e', 'a1b2c3d4-0001-4000-8000-000000000001', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('1df5b82c-b97e-43bb-a67f-e04478464b22', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-09 08:44:10.280016+00'),
('9fa72484-54f4-401e-9d9f-f4d95485167f', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0004-4000-8000-000000000004', '2026-03-09 08:44:10.280016+00'),
('94e7df55-f675-4ca5-8584-cfa5479d1870', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0005-4000-8000-000000000005', '2026-03-09 08:44:10.280016+00'),
('bba3ac70-b3ac-41db-91e5-2363f96d8e98', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0006-4000-8000-000000000006', '2026-03-09 08:44:10.280016+00'),
('9bd165a4-c152-4230-9acf-443be61bb39c', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0007-4000-8000-000000000007', '2026-03-09 08:44:10.280016+00'),
('4deac9bb-7ff6-4644-9148-7ed3f21a6b90', 'a1b2c3d4-0002-4000-8000-000000000002', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('2aba911a-dff4-42c6-8a88-6a6d7f8d8cf2', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-09 08:44:10.280016+00'),
('0b7f06cd-7ef6-486c-b1ba-596629f25fb3', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0004-4000-8000-000000000004', '2026-03-09 08:44:10.280016+00'),
('0753ecab-2ada-41c9-bc89-265265a444e0', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0008-4000-8000-000000000008', '2026-03-09 08:44:10.280016+00'),
('07326ff7-600b-43bf-a60e-7310ab66ffe2', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0009-4000-8000-000000000009', '2026-03-09 08:44:10.280016+00'),
('0b589583-5566-4f54-aef3-b11289c920f2', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0010-4000-8000-000000000010', '2026-03-09 08:44:10.280016+00'),
('50be42ef-e3ad-47e4-8735-ad71679d7fa0', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0011-4000-8000-000000000011', '2026-03-09 08:44:10.280016+00'),
('581fbc75-eac9-4769-92e3-a8c74cb66120', 'a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0012-4000-8000-000000000012', '2026-03-09 08:44:10.280016+00'),
('ca43900e-633b-49d0-a0df-007f774284bd', 'a1b2c3d4-0003-4000-8000-000000000003', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('6b64059b-a1ef-4c8c-90f9-4a4c83cd217b', 'a1b2c3d4-0003-4000-8000-000000000003', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-09 08:44:10.280016+00'),
('e121a707-5aa8-4aae-b9ea-7ef0d4c05af5', 'a1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0005-4000-8000-000000000005', '2026-03-09 08:44:10.280016+00'),
('df145579-8341-46bb-843e-22f3f5be7ca3', 'a1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0006-4000-8000-000000000006', '2026-03-09 08:44:10.280016+00'),
('8e39c920-763c-45a9-ad52-1bf9ed4ec1d1', 'a1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0014-4000-8000-000000000014', '2026-03-09 08:44:10.280016+00'),
('7641cc07-dfeb-475f-bd3f-86aca9efb4ff', 'a1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0015-4000-8000-000000000015', '2026-03-09 08:44:10.280016+00'),
('875000b4-538d-498e-9cbf-28cc6b4dd3e8', 'a1b2c3d4-0004-4000-8000-000000000004', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('15e06c54-03fb-4d99-a19f-179b56f5c714', 'a1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0007-4000-8000-000000000007', '2026-03-09 08:44:10.280016+00'),
('af5e67b7-5870-40ba-b7b0-37fa4b3755d1', 'a1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0008-4000-8000-000000000008', '2026-03-09 08:44:10.280016+00'),
('b796c124-0595-49a7-b2be-457857144209', 'a1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0016-4000-8000-000000000016', '2026-03-09 08:44:10.280016+00'),
('e08961dd-dfc9-45bb-9486-b381090390c0', 'a1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0017-4000-8000-000000000017', '2026-03-09 08:44:10.280016+00'),
('8a8e288e-984a-4881-93b5-bbcc93789ecc', 'a1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0018-4000-8000-000000000018', '2026-03-09 08:44:10.280016+00'),
('f5a86f72-5f40-4962-8a9c-d263ab91deb4', 'a1b2c3d4-0005-4000-8000-000000000005', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('578f0466-a219-4fde-bec0-6f5c712675f6', 'a1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-03-09 08:44:10.280016+00'),
('f2313186-85b9-439b-b08f-c8e1c6cc62a7', 'a1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0019-4000-8000-000000000019', '2026-03-09 08:44:10.280016+00'),
('dce88a1d-e662-4185-9732-98c03ddfe3b6', 'a1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0020-4000-8000-000000000020', '2026-03-09 08:44:10.280016+00'),
('200858dc-2e2e-4146-83c2-462ca90ed892', 'a1b2c3d4-0006-4000-8000-000000000006', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-09 08:44:10.280016+00'),
('566254c2-814a-476f-9f8f-ae17ab7fb602', 'a1b2c3d4-0006-4000-8000-000000000006', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-09 08:44:10.280016+00'),
('cb610418-d4c9-4f4a-a38e-413468cb7999', 'a1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-03-09 08:44:10.280016+00'),
('86a19b3f-d62c-4de9-9c3e-ccf395ea280f', 'a1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0009-4000-8000-000000000009', '2026-03-09 08:44:10.280016+00'),
('9abfdef8-22ad-4310-817a-cabc19f27195', 'a1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0010-4000-8000-000000000010', '2026-03-09 08:44:10.280016+00'),
('2b01d84c-6e63-49c6-b165-14c1e8060270', 'cdc38735-b0f2-4164-a875-41290cd4de8a', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-12 11:29:52.883677+00'),
('7e023a9a-9992-4ebe-8a1a-6e67964c6cc3', 'cdc38735-b0f2-4164-a875-41290cd4de8a', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-12 11:29:53.095933+00'),
('3f9af2e1-85b4-4f8d-a52a-9ccec3c774d6', 'cdc38735-b0f2-4164-a875-41290cd4de8a', '08531275-4784-48d4-a02f-1ba2bd4c920d', '2026-03-12 11:29:53.095933+00'),
('a9727e14-3887-4198-9e9a-3d7dc5499393', 'b4d9bac3-98e3-4ba8-ad03-d1048d46b900', '1eafb563-071a-45c6-a82e-79b460b3a851', '2026-03-16 13:40:00.435495+00'),
('f4ea1d6f-2bec-447c-9adc-c5a1962b59ca', 'b4d9bac3-98e3-4ba8-ad03-d1048d46b900', 'e8f02149-2ccf-4324-950a-d2a574c46569', '2026-03-16 13:40:00.82873+00'),
('32602925-d529-4632-b768-2aa5acab9bc4', 'b4d9bac3-98e3-4ba8-ad03-d1048d46b900', '08531275-4784-48d4-a02f-1ba2bd4c920d', '2026-03-16 13:40:00.82873+00');

-- =============================================
-- 22. GROUP_CHAT_MESSAGES (48 rows — COMPLETE)
-- =============================================
INSERT INTO group_chat_messages (id, group_chat_id, sender_id, sender_name, content, is_from_current_user, created_at) VALUES
('9d0b2458-ff40-4450-b4de-099fe3061bfb', 'a1b2c3d4-0006-4000-8000-000000000006', NULL, 'Jas', 'New spot on King St?', false, '2026-03-03 07:05:55.65021+00'),
('9ea623e7-d3ee-455b-a638-4d48f62357c4', 'a1b2c3d4-0006-4000-8000-000000000006', NULL, 'You', 'I''m down, when?', true, '2026-03-03 11:05:55.65021+00'),
('0a3f4d07-720d-423c-9d65-e11ead2a1a7c', 'a1b2c3d4-0004-4000-8000-000000000004', NULL, 'You', 'Can''t wait 🎉', true, '2026-03-04 07:05:55.65021+00'),
('93336d1c-6088-4b72-aed6-d8a58aba493e', 'a1b2c3d4-0005-4000-8000-000000000005', NULL, 'Mike', 'VIP confirmed', false, '2026-03-04 07:05:55.65021+00'),
('5f4c09a2-0604-40eb-ab16-6e479160db68', 'a1b2c3d4-0004-4000-8000-000000000004', NULL, 'Jess', 'Same!! What should I bring?', false, '2026-03-04 08:05:55.65021+00'),
('fc896b88-938f-45c7-ab50-b52d18769398', 'a1b2c3d4-0005-4000-8000-000000000005', NULL, 'You', 'Let''s gooo', true, '2026-03-04 08:05:55.65021+00'),
('1999890d-65a8-4c08-b0f5-fd191022e890', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'Alex', 'Table booked for 12', false, '2026-03-04 23:05:55.65021+00'),
('f26f9dfc-98ce-49f1-8a33-9ba653473fd7', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'You', 'Legend! What time?', true, '2026-03-05 00:05:55.65021+00'),
('c18c03c6-da05-4376-85fc-1e1a5e75983f', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'Sam', '7pm sharp', false, '2026-03-05 00:35:55.65021+00'),
('fde54456-a6ea-42ca-90e4-a89e8cdef4c3', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'Soph', 'Got the outfits sorted!', false, '2026-03-05 02:05:55.65021+00'),
('c7abdcf3-1f63-4a8d-9cd1-60dc2ae86f7f', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'Mia', 'Send pics!', false, '2026-03-05 02:35:55.65021+00'),
('b9027925-c388-4188-9af9-d7ff599e778d', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'You', 'Can''t wait for Saturday', true, '2026-03-05 03:05:55.65021+00'),
('e303c968-8a14-430d-859b-df0d9470df6a', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Jordan', 'Let''s meet at 9pm', false, '2026-03-05 05:05:55.65021+00'),
('c2e9cb97-bf3e-440e-91a6-c5084dd31f27', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Alex', 'Sounds good!', false, '2026-03-05 05:15:55.65021+00'),
('a8c3f905-1462-4674-92cb-273e90b57e9c', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'You', 'I''ll be there 🔥', true, '2026-03-05 05:20:55.65021+00'),
('e0bd8efa-7055-4821-b1fb-b9f7cc26b0a4', 'a1b2c3d4-0006-4000-8000-000000000006', NULL, 'Amara', 'Trying that new Italian place on Friday?', false, '2026-03-05 10:55:41.386671+00'),
('527b0050-ac16-4450-88c8-5d1078944d23', 'a1b2c3d4-0006-4000-8000-000000000006', NULL, 'Naledi', 'Yesss I''ve been dying to go there', false, '2026-03-05 12:55:41.386671+00'),
('3a7f85ad-6ada-4d31-87fb-21c3b3ec5f08', 'a1b2c3d4-0005-4000-8000-000000000005', NULL, 'Liam', 'Venue deposit is paid. We''re locked in 🔒', false, '2026-03-06 04:55:41.386671+00'),
('84395892-f78a-44f4-8f10-6742a5b2c601', 'a1b2c3d4-0005-4000-8000-000000000005', NULL, 'Thabo', 'Let''s gooo this is going to be huge', false, '2026-03-06 05:55:41.386671+00'),
('55f5419a-a2ba-450a-a1c0-dd522db59458', 'a1b2c3d4-0004-4000-8000-000000000004', NULL, 'Siya', 'DJ is confirmed for Saturday 🎉', false, '2026-03-06 07:55:41.386671+00'),
('22d829da-b6b1-4501-b12c-8fc3710718e2', 'a1b2c3d4-0004-4000-8000-000000000004', NULL, 'Fatima', 'Let''s do a group costume theme!', false, '2026-03-06 08:25:41.386671+00'),
('da97167a-2f69-439b-b1cf-b3370e4f44da', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'Naledi', 'Has everyone got their outfits sorted?', false, '2026-03-06 08:55:41.386671+00'),
('853af12e-a697-4965-a00b-cd469e3d97ec', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'Emma', 'Still looking for shoes 😭', false, '2026-03-06 09:55:41.386671+00'),
('cc0f0074-d020-45b0-9f29-afbbed04eb32', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'Zinhle', 'That sunset last night was incredible from up there', false, '2026-03-06 10:25:41.386671+00'),
('57e57eb2-7664-4457-8330-4a7a530bc779', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'Marcus', 'We need to go back this weekend fr', false, '2026-03-06 10:35:41.386671+00'),
('72fe295d-cddf-462d-95e5-41671d31f505', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Thabo', 'Yo who''s pulling up tonight?', false, '2026-03-06 10:40:41.386671+00'),
('3b23c6bd-ea05-478a-84f4-cfbdfa77977a', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Amara', 'Count me in! What time?', false, '2026-03-06 10:45:41.386671+00'),
('61ba6b8d-a2cb-4563-b06c-b7a3dc523d38', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'Jordan', 'Pre-drinks at mine at 9?', false, '2026-03-06 10:50:41.386671+00'),
('9de9d1f0-fad3-4c3c-8ab0-5082c95bc51a', 'a1b2c3d4-0003-4000-8000-000000000003', NULL, 'You', 'yiio', true, '2026-03-09 02:48:51.227859+00'),
('0abdf58d-d372-44d4-8a8f-d13f2979f210', 'a1b2c3d4-0001-4000-8000-000000000001', NULL, 'You', 'wassup', true, '2026-03-09 07:02:39.08465+00'),
('c50ccb0b-86b4-49b2-bf02-bf7391a27c9e', 'a1b2c3d4-0002-4000-8000-000000000002', NULL, 'You', 'yooo', true, '2026-03-09 07:02:56.279653+00'),
('81c8a512-0ca6-46ae-bd44-2bb7cab04418', '68f8a86f-b1d9-496b-8ee1-e78997721e1f', NULL, 'You', 'yo', true, '2026-03-09 07:03:22.249027+00'),
('60af181a-a0b4-44f8-a716-aa430081c7fc', '68f8a86f-b1d9-496b-8ee1-e78997721e1f', NULL, 'You', 'yoooooo', true, '2026-03-09 07:03:30.997228+00'),
('d40edac8-e3b7-4d5b-ba4e-cd3f565bf4ae', '03c1f271-f46f-423c-b733-25d005627c0b', NULL, 'You', 'yo', true, '2026-03-09 07:49:22.105309+00'),
('3f37a72d-5870-44eb-bba6-ffe5fe15ab06', '03c1f271-f46f-423c-b733-25d005627c0b', NULL, 'You', 'whats good', true, '2026-03-09 07:50:13.411284+00'),
('6f7a183a-7dbd-4e9b-b06d-b0655afe7957', '03c1f271-f46f-423c-b733-25d005627c0b', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Haan', 'yo', true, '2026-03-09 07:52:32.026218+00'),
('3441973b-de71-4cdb-bcac-bf50d5e9a52b', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'wasssuppp', true, '2026-03-09 07:52:41.098046+00'),
('53c885f4-42ea-4cd0-9310-0c99bc03c56b', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'we live', true, '2026-03-09 07:53:17.928678+00'),
('72c186a7-d58c-4ca1-986f-509a320422b1', '03c1f271-f46f-423c-b733-25d005627c0b', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Haan', 'yo', true, '2026-03-09 10:14:58.692579+00'),
('0ec93fba-355c-4167-a6a6-757aa10615cf', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'still working', true, '2026-03-09 12:06:21.964047+00'),
('d1464ed1-bea0-40b9-9da5-a0278e492a81', '03c1f271-f46f-423c-b733-25d005627c0b', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Haan', 'still working', true, '2026-03-10 12:31:07.742321+00'),
('0f75be03-4818-4b4e-b08b-4d4333e9d610', 'b4d9bac3-98e3-4ba8-ad03-d1048d46b900', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'no', true, '2026-03-16 14:16:09.853163+00'),
('adb9c98d-9a7d-4e40-8171-678054edf3c1', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'still workinh', true, '2026-03-16 14:16:19.171489+00'),
('1945257e-57dc-4a01-b706-f4dfca0b365d', '03c1f271-f46f-423c-b733-25d005627c0b', 'e8f02149-2ccf-4324-950a-d2a574c46569', 'Haan', 'still working', true, '2026-03-17 09:12:05.502047+00'),
('793d5eb6-601c-4ab1-b26a-9f2efebd9410', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'yea still brother', true, '2026-03-17 13:11:44.232713+00'),
('078986c0-eaf2-44d6-863d-ae7518c07965', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'i want sparkling water still lad', true, '2026-03-17 13:11:54.636412+00'),
('e61dbee5-d4a9-4ab1-97d7-75f85ad2831e', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'when i msg it doesnt auto scroll down wtf brah fix that shit snap it to the bottom', true, '2026-03-17 13:12:15.06887+00'),
('f4fec6fc-4b56-44a3-bed1-90a0001c8c72', '03c1f271-f46f-423c-b733-25d005627c0b', '1eafb563-071a-45c6-a82e-79b460b3a851', 'Dylan Godwin', 'anchor maaatee', true, '2026-03-17 13:12:23.566848+00');

-- =============================================
-- 23. TICKET_TRANSFERS (1 row)
-- =============================================
INSERT INTO ticket_transfers (id, event_id, from_user_id, to_user_id, status, responded_at, created_at) VALUES
('2bf40e03-6075-470e-9161-c4c03f54c7ab', '50cf07a0-bac9-4905-a1e3-1b63533a3681', 'e8f02149-2ccf-4324-950a-d2a574c46569', '1eafb563-071a-45c6-a82e-79b460b3a851', 'cancelled', '2026-03-17 07:03:17.931234+00', '2026-03-17 07:01:39.217092+00');

-- =============================================
-- 24. SUPPORT_REQUESTS (1 row)
-- =============================================
INSERT INTO support_requests (id, user_id, subject, message, category, status, assigned_admin_id, resolution_notes, context_metadata, created_at, updated_at) VALUES
('1ea50a46-fa78-48d6-a5ca-3c3d9e36f712', NULL, 'Test', 'Testing support request', 'general', 'open', NULL, NULL, '{}', '2026-03-10 08:50:56.834445+00', '2026-03-10 08:50:56.834445+00');

-- =============================================
-- SKIPPED TABLES (empty or ephemeral):
-- user_roles, notification_settings, user_music_connections,
-- blocked_users, event_cohosts, event_media, saved_events,
-- waitlist, invites, discount_codes, check_ins, refunds,
-- payment_events, user_points, point_transactions, user_vouchers,
-- user_badges, reports, moderation_actions, contact_messages,
-- organiser_stripe_accounts
--
-- notifications (141 rows) — auto-expire after 20 days, regenerated by app
-- rate_limits (17 rows) — ephemeral, cleaned up automatically
-- =============================================

COMMIT;
