-- Edge organiser-profile-create uses service_role JWT to INSERT after DML was revoked from authenticated.
-- Mirror explicit grants used elsewhere (e.g. profiles) so PostgREST never hits 42501 for missing table privilege.

GRANT INSERT, UPDATE, DELETE ON TABLE public.organiser_profiles TO service_role;
