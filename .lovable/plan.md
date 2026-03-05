

## Plan: Rich Post Composer (Photo Upload, GIF Picker, Dynamic Textarea) + Events Schema Info

### 1. Fix textarea size — dynamic expansion

**Problem**: The textarea starts with `rows={3}` and `min-h-[80px]`, creating a large empty box on focus.

**Fix**: Change to `rows={1}` and `min-h-[24px]`. The existing auto-resize logic in `handleTextChange` already grows the box as text is typed. This makes the composer start compact (single line) and expand naturally.

### 2. Add image/photo uploads to posts

**Database migration** — add nullable columns to `posts`:
```sql
ALTER TABLE posts ADD COLUMN image_url text;
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;
ALTER TABLE posts ADD CONSTRAINT posts_has_content 
  CHECK (content IS NOT NULL AND content != '' OR image_url IS NOT NULL);
```
Wait — CHECK constraints can cause restoration issues. Instead, use a validation trigger:
```sql
ALTER TABLE posts ADD COLUMN image_url text;
ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;

CREATE OR REPLACE FUNCTION validate_post_content()
RETURNS trigger AS $$
BEGIN
  IF (NEW.content IS NULL OR trim(NEW.content) = '') AND NEW.image_url IS NULL THEN
    RAISE EXCEPTION 'Post must have content or an image';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_post_content
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION validate_post_content();
```

**Storage**: Create a `post-images` bucket (public) for uploaded photos.

**Frontend**: In `PostComposer.tsx`, wire the Image button to an `<input type="file" accept="image/*">`. On selection, show a preview thumbnail. On post, upload to `post-images` bucket via the client, get the public URL, then insert the post with `image_url`.

**Post button logic**: Disabled unless `postText.trim() || selectedImage`.

### 3. Add GIF picker

**Strategy**: Use the **Tenor API** (by Google) — it's free with generous rate limits and no credit card required. It provides a simple REST endpoint for searching GIFs.

- Requires a free API key from Google Cloud Console (Tenor API v2).
- Alternative: **GIPHY** also has a free tier but requires attribution. Tenor is simpler.

**Implementation**:
- Store the Tenor API key as a secret.
- Add a GIF button (using a sparkle/smile icon) to the composer toolbar.
- On click, open a small popover/drawer with a search input and a grid of GIF thumbnails.
- On GIF selection, store the GIF URL in a new `gif_url` column on `posts`.
- Show a preview in the composer before posting.

**Database**: Add `gif_url text` column to posts. Update the validation trigger to allow `gif_url` as valid content too.

Updated trigger:
```sql
IF (NEW.content IS NULL OR trim(NEW.content) = '') 
   AND NEW.image_url IS NULL 
   AND NEW.gif_url IS NULL THEN
  RAISE EXCEPTION 'Post must have content, image, or GIF';
END IF;
```

### 4. Update FeedPost to render media

Update `FeedPost.tsx` to accept and render `imageUrl` and `gifUrl` props — display them below the text content as responsive images.

### 5. Update post queries

Update `usePostsQuery.ts` to select the new `image_url` and `gif_url` columns. Update `Index.tsx` and `Profile.tsx` feed rendering to pass these through.

### 6. Events table structure (for your reference)

The current `events` table has these columns:
- **id** (uuid, PK)
- **host_id** (uuid, references profiles.user_id)
- **organiser_profile_id** (uuid, nullable, references organiser_profiles)
- **title** (text, required)
- **description** (text, nullable)
- **location** (text, nullable)
- **event_date** (timestamptz, required)
- **end_date** (timestamptz, nullable)
- **cover_image** (text, nullable)
- **category** (text, default 'party')
- **max_guests** (integer, nullable)
- **is_public** (boolean, default true)
- **created_at** / **updated_at** (timestamptz)

Send me the event data you want seeded and I'll insert it.

### Summary of files to modify/create

- **DB migration**: Add `image_url`, `gif_url` to `posts`, make `content` nullable, add validation trigger, create `post-images` storage bucket
- **Secret**: Tenor API key (will prompt you)
- **`PostComposer.tsx`**: Dynamic textarea, image upload, GIF picker popover
- **`FeedPost.tsx`**: Render images and GIFs
- **`usePostsQuery.ts`**: Select new columns
- **`Index.tsx`** / **`Profile.tsx`**: Pass media props to FeedPost

