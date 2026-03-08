

## Plan: Like counters, filled heart, and repost-to-feed functionality

### 1. Update FeedPost component
- Add `postId` prop and optional `repostedBy` prop (string, the display name of the reposter)
- Wire up `usePostInteractions(postId)` hook to get `likeCount`, `repostCount`, `isLiked`, `isReposted`, `toggleLike`, `toggleRepost`
- Show like count next to the heart icon; show repost count next to the repost icon
- When `isLiked` is true, render the Heart with `fill="currentColor"` and color it red/primary
- When `isReposted` is true, color the repost icon green (Twitter-style)
- When `repostedBy` is provided, show a small header above the post: "🔁 {name} reposted" in muted text with a Repeat2 icon

### 2. Update feed query to include reposts
- Modify `useFeedPosts` to also fetch `post_reposts` for the current user, join with the original post data, and merge them into the feed sorted by time
- Reposted items appear in the feed with the `repostedBy` label showing the current user's display name
- Deduplicate: if a post already appears as an original, the repost still shows separately (Twitter behavior)

### 3. Pass `postId` from Index.tsx
- Add `id={post.id}` as `postId` prop to `<FeedPost>` in the feed rendering loop

### Technical details

**FeedPost.tsx changes:**
- New props: `postId: string`, `repostedBy?: string`
- Import and call `usePostInteractions(postId)`
- Render repostedBy banner above the post content
- Like button: `className` toggles red color + `fill="currentColor"` when liked
- Display `likeCount` and `repostCount` as small text next to icons (only when > 0)

**usePostsQuery.ts changes:**
- In `fetchPosts()`, after fetching posts, also fetch `post_reposts` joined with posts to get reposted content
- Return merged + sorted array with a `reposted_by_name` field on reposted entries

**Index.tsx changes:**
- Pass `postId={post.id}` and `repostedBy={post.reposted_by_name}` to each `<FeedPost>`

