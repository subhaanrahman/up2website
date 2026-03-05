

## Problem

The `check-phone` edge function fetches up to 1000 auth users via `admin.listUsers()` and scans them in-memory to find a phone match. This is slow and will only get worse as users grow. The same pattern exists in the `register` function.

## Solution

1. **Add `phone` column to `profiles` table** -- a unique, indexed column for fast lookups
2. **Rewrite `check-phone`** to do a simple `SELECT` from `profiles` by phone instead of listing all auth users
3. **Update `register` function** to store the phone on the profile row, and use a profiles lookup instead of `admin.listUsers` for the duplicate check
4. **Backfill existing users** -- update profiles rows with phone numbers from auth metadata

## Technical Details

### Migration
```sql
ALTER TABLE profiles ADD COLUMN phone text UNIQUE;
CREATE INDEX idx_profiles_phone ON profiles (phone);
```

### Backfill (via insert tool)
Update existing profiles with phone numbers derived from their `user_id` in `auth.users`.

### `check-phone` rewrite
Replace the `admin.listUsers` call with:
```ts
const { data } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .eq('phone', normalizedPhone)
  .maybeSingle();
const exists = !!data;
```

### `register` function update
- Replace `admin.listUsers` duplicate check with the same profiles lookup
- After creating the user, store `phone` on the profiles row

### Handover doc
Append this change to `Dylan_handover.md`.

