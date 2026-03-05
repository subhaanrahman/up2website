

## Plan: Social Follow Model for Organisers, Public/Private Profile Toggle, and Posts System

### 1. Organiser profiles: Follow (not friend request)

**Problem**: Visiting an organiser profile shows "ADD FRIEND" and requires acceptance. Organisers should only have followers -- no request/accept flow.

**Changes**:
- **`UserProfile.tsx`**: Detect `_isOrganiser` on the viewed profile. If organiser, show "FOLLOW" / "FOLLOWING" button that inserts/deletes from `organiser_followers` instead of `connections`. No pending state needed.
- Organiser profiles are always public -- no privacy gating.

### 2. Public/Private toggle for personal profiles

**Problem**: Personal profiles can't toggle between public (followers, no approval) and private (friend requests, approval needed).

**Changes**:
- **Edit Profile page** (`EditProfile.tsx`): Add a "Public Profile" switch toggle. When enabled, anyone can follow without approval. When disabled, friend requests require acceptance.
- This maps to the existing `privacy_settings.go_public` field.
- **`UserProfile.tsx`**: When viewing a public personal profile, show "FOLLOW"/"FOLLOWING" button (using `organiser_followers` or a new follow mechanism on `connections` with auto-accept). When viewing a private profile, keep the current friend request flow.

**Approach**: Use the existing `privacy_settings.go_public` column. On `UserProfile.tsx`, fetch the target user's public status via the existing `is_profile_public()` RPC. If public, auto-accept the connection (insert with `status: 'accepted'`) so it acts like a follow -- no pending state.

### 3. Posts system (database + composer + feed)

**Database migration**:
```sql
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organiser_profile_id uuid REFERENCES organiser_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read posts
CREATE POLICY "Authenticated can view posts" ON posts
  FOR SELECT TO authenticated USING (true);

-- Authors can insert own posts
CREATE POLICY "Users can create posts" ON posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Authors can delete own posts
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
```

**Frontend changes**:
- **`PostComposer.tsx`**: Wire the "Post" button to insert into `posts` table. Accept an optional `organiserProfileId` prop for posting as an organiser. On success, clear text and call an `onPostCreated` callback.
- **`Index.tsx`**: Replace hardcoded feed posts with a query from the `posts` table (ordered by `created_at DESC`). Use realtime subscription so new posts appear instantly. Join with `profiles` for author avatar/name.
- **`Profile.tsx`**: In the "Feed" tab, query posts where `author_id = user.id` (or `organiser_profile_id` for organiser view) and render them.

### 4. Handover doc update

Append all changes to `docs/Dylan_handover.md`.

### Summary of files to modify/create:
- **DB migration**: New `posts` table
- **`PostComposer.tsx`**: Wire post button to DB
- **`Index.tsx`**: Real feed from `posts` table with realtime
- **`Profile.tsx`**: Show user's posts in feed tab
- **`UserProfile.tsx`**: Organiser follow logic + public profile follow logic
- **`EditProfile.tsx`**: Add public/private toggle
- **`docs/Dylan_handover.md`**: Document changes

