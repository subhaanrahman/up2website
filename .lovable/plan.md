

## Plan: Expandable Post Composer

Currently the "Write Something..." text is static and non-interactive. We need to make it expand inline (not full-screen) when tapped, similar to Twitter/Threads compose behavior.

### Approach

**In `src/pages/Index.tsx`:**

1. Add local state: `isComposing` (boolean) and `postText` (string)
2. When collapsed (default): Show the current "Write Something..." placeholder — clicking it sets `isComposing = true`
3. When expanded:
   - Replace the placeholder with an auto-growing `<textarea>` (focused automatically)
   - Expand the composer area with a smooth transition (e.g. `min-h-[120px]`)
   - Show a row of post action icons below the textarea (Image, Calendar/Event link, etc.) and a "Post" button aligned right
   - Clicking outside or pressing a close/cancel button collapses it back
4. The composer stays inline at the top of the feed — it does not cover the screen or open a modal

### UI Details
- Textarea: no border, transparent background, auto-focus, placeholder "What's happening?"
- Action bar: small icon buttons (Image, Calendar) on the left, "Post" button on the right
- Smooth height animation using CSS transition on max-height or similar
- Post button disabled when text is empty

No backend changes needed — this is purely a UI/UX enhancement. Actual post submission can be wired up later.

