

## Analysis: Why "Today" Anchor Scroll Isn't Working

**Root cause:** The current approach uses `window.scrollTo` inside a double `requestAnimationFrame` triggered by a `useEffect`. This is unreliable for several reasons:

1. **Image loading shifts layout** — Event cards contain images. When the effect fires, images haven't loaded yet, so the "Today" divider's measured position is wrong. After images load, layout shifts and Today moves further down.
2. **`useEffect` runs after paint** — By the time the scroll fires, the user already sees the top of the page (oldest past events). Even the double-rAF is not enough to wait for images.
3. **No re-trigger on layout changes** — Once `hasScrolled` is set to true, even if layout shifts occur, the scroll won't re-fire.

## Plan

### 1. Switch to a scroll-container approach (most reliable)

Instead of fighting `window.scrollTo` timing, wrap the plans list in a **scrollable container** and set its `scrollTop` directly using `useLayoutEffect`. This gives us full control.

**Changes to `src/pages/Tickets.tsx`:**

- Add a `scrollContainerRef` for the plans content area
- On mobile: make the `<main>` area a scrollable container with `overflow-y: auto` and calculated height (`calc(100vh - sticky header height - bottom nav height)` ≈ `calc(100dvh - 160px - 80px)`)
- On desktop: similar approach within the content column
- Use `useLayoutEffect` to set `scrollContainerRef.current.scrollTop` so the "Today" divider is at the top — this fires **before** the browser paints, so users never see the wrong scroll position
- Add `scroll-margin-top` CSS on the Today divider as a fallback
- Remove `window.scrollTo` and the double-rAF hack
- Add a secondary `setTimeout` (~300ms) scroll correction to handle post-image-load layout shift

### 2. Remove the sticky header on mobile for the Tickets page content area

The mobile header stays sticky, but the scrollable area is now inside a container below it, so `headerOffset` calculation is no longer needed.

### Summary of changes
- **One file:** `src/pages/Tickets.tsx` — restructure the mobile and desktop content areas to use an explicit scroll container, replace `useEffect`+`window.scrollTo` with `useLayoutEffect`+`scrollTop`, and add a delayed correction for image loading.

