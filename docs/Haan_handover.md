# Haan (Subhan) — Handover Notes

## 5 March 2026

### Summary of Changes

- **Database seeding**: Inserted 20 user profiles and 8 organiser profiles with realistic South African data (names, bios, cities, avatar URLs via `i.pravatar.cc`)
- **Auth users**: Created corresponding `auth.users` entries to satisfy foreign key constraints on `profiles` table
- **Organiser profiles seeded**: Bassline Collective, The Rooftop Social, Vibe Republic, Cape Town Sunset Sessions, Durban Beats, Stellenbosch Socials, Jozi Nights, The Garden Collective — each linked to a seeded user
- **Profile edit sync fix**: Added `useEffect` in `ActiveProfileContext.tsx` to auto-sync `activeProfile` state when organiser profile data changes after a refetch (e.g. after editing display name)
- **Profile heading fix**: Changed `Profile.tsx` heading from `{username}` to `{displayName || username}` so edited display names reflect immediately
- **Auth flow UX improvement**: Refactored `PhoneStep` to navigate to the OTP/password step instantly without waiting for the OTP send to complete — fire-and-forget pattern for better perceived performance
