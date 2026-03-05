# Haan (Subhaan Rahman) — Handover Notes

## 5 March 2026

### Summary of Changes

- **Database seeding**: Inserted 20 user profiles and 8 organiser profiles with realistic South African data (names, bios, cities, avatar URLs via `i.pravatar.cc`)
- **Auth users**: Created corresponding `auth.users` entries to satisfy foreign key constraints on `profiles` table
- **Organiser profiles seeded**: Bassline Collective, The Rooftop Social, Vibe Republic, Cape Town Sunset Sessions, Durban Beats, Stellenbosch Socials, Jozi Nights, The Garden Collective
- **Profile edit sync fix**: Added `useEffect` in `ActiveProfileContext.tsx` to auto-sync `activeProfile` state when organiser profile data changes after a refetch
- **Profile heading fix**: Changed `Profile.tsx` heading from `{username}` to `{displayName || username}`
- **Auth flow UX improvement**: Refactored `PhoneStep` to navigate to the OTP/password step instantly — OTP send fires in background (fire-and-forget) so users see the code input page immediately instead of hanging on "Checking..."
