# Flutter Migration Changelog

> Every change made to the React/TypeScript codebase is logged here with notes on how to replicate it in Flutter.

## Tech Stack Mapping

| React / Web                        | Flutter Equivalent                              |
|------------------------------------|------------------------------------------------|
| React functional components        | `StatelessWidget` / `StatefulWidget`            |
| React Router (`react-router-dom`)  | `go_router` or `Navigator 2.0`                 |
| TanStack React Query               | `riverpod` / `bloc` with repository pattern     |
| Supabase JS (`@supabase/supabase-js`) | `supabase_flutter`                          |
| Context API (`AuthContext`, etc.)   | `riverpod` providers or `InheritedWidget`       |
| Tailwind CSS                       | Flutter `ThemeData` + custom design tokens      |
| shadcn/ui components               | Material 3 widgets or custom widget library     |
| Radix UI primitives                | Flutter built-in gesture/overlay widgets         |
| `react-hook-form` + `zod`          | `flutter_form_builder` + custom validators      |
| Stripe (`@stripe/react-stripe-js`) | `flutter_stripe`                                |
| Recharts                           | `fl_chart`                                      |
| `date-fns`                         | Dart `intl` package / `DateTime` extensions     |
| `sonner` toasts                    | `ScaffoldMessenger.showSnackBar` or `fluttertoast` |
| `lucide-react` icons               | `flutter_lucide` or Material Icons              |
| Vite dev server                    | `flutter run` with hot reload                   |
| `html-to-image`                    | `screenshot` or `RenderRepaintBoundary`         |
| `qrcode.react`                     | `qr_flutter`                                    |
| Embla Carousel                     | `carousel_slider` or `PageView`                 |
| `vaul` (drawer)                    | `showModalBottomSheet` / `DraggableScrollableSheet` |
| `react-international-phone`        | `intl_phone_field`                              |

---

## Changes

<!-- New entries are added below this line, newest first -->

### 2026-03-11 — Unify FeedPost event card layout with NearbyEvents tile

**Files changed:** `src/components/FeedPost.tsx`

**What changed (React/TS):**
- Replaced the vertical event card (full-width banner image on top, text below) with a horizontal layout matching the NearbyEventsCarousel tiles.
- Now uses a flex row: 112×112px square image on the left, title + date + location stacked on the right.
- Title is truncated with `capitalize`; date format changed to short form (`EEE M/d - ha`); location uses `MapPin` icon with truncation.

**Flutter migration notes:**
- Extract a shared `EventTileCard` widget used by both the nearby-events carousel and feed post event embeds. Layout:
  ```dart
  Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: theme.dividerColor),
      color: theme.cardColor,
    ),
    clipBehavior: Clip.antiAlias,
    child: Row(
      children: [
        SizedBox(
          width: 112, height: 112,
          child: Image.network(coverImage, fit: BoxFit.cover),
        ),
        Expanded(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title, style: bold14, overflow: TextOverflow.ellipsis, maxLines: 1),
                SizedBox(height: 2),
                Row(children: [Icon(LucideIcons.calendar, size: 12, color: primary), SizedBox(width: 4), Text(formattedDate, style: muted12)]),
                if (location != null) ...[
                  SizedBox(height: 2),
                  Row(children: [Icon(LucideIcons.mapPin, size: 12, color: primary), SizedBox(width: 4), Expanded(child: Text(location!, style: muted12, overflow: TextOverflow.ellipsis))]),
                ],
              ],
            ),
          ),
        ),
      ],
    ),
  )
  ```
- Reuse this widget in both the `NearbyEventsCarousel` and `FeedPost` to keep them consistent.
- No new packages or routes required.

---

### 2026-03-11 — Match SuggestedFriendsSection heading to section heading style

**Files changed:** `src/pages/Index.tsx`

**What changed (React/TS):**
- Updated the "Suggested Friends" `<h2>` in `SuggestedFriendsSection` from `font-semibold` to `font-black uppercase font-display tracking-[0.05em]` with `fontStretch: "expanded"` — matching the "Events Near You" heading style used across the app.

**Flutter migration notes:**
- Define a reusable section heading `TextStyle` in your theme or a shared widget (e.g. `SectionHeading`) so all section titles are consistent. The style should use:
  ```dart
  TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w900,
    fontFamily: 'Akira', // or your display font
    letterSpacing: 0.8,
    height: 1.2,
  )
  ```
  with `text.toUpperCase()` applied to the string.
- Apply this shared style to both the "Events Near You" and "Suggested Friends" headers (and any future section headers) to keep them in sync.
- No new packages or routes required.

---

### 2026-03-11 — Add MapPin icon to location in NearbyEventsCarousel

**Files changed:** `src/components/NearbyEventsCarousel.tsx`

**What changed (React/TS):**
- Imported `MapPin` from `lucide-react`.
- Replaced the plain `<p>` tag for `event.location` with a flex row containing a `MapPin` icon (matching the style of the Calendar and DollarSign rows).
- Icon uses `h-3 w-3 text-primary flex-shrink-0`; text uses `truncate` to prevent overflow.

**Flutter migration notes:**
- In the corresponding `NearbyEventsCarousel` widget, update the location row to use a `Row` with an `Icon` widget (`Icons.location_on` or `LucideIcons.mapPin` from `flutter_lucide`) sized at 12px with the primary theme colour, followed by an `Expanded` > `Text` widget with `overflow: TextOverflow.ellipsis` and `maxLines: 1`.
- Example:
  ```dart
  if (event.location != null)
    Row(
      children: [
        Icon(LucideIcons.mapPin, size: 12, color: theme.colorScheme.primary),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            event.location!,
            style: theme.textTheme.bodySmall?.copyWith(color: mutedForeground),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ),
      ],
    ),
  ```
- No new packages or routes required.
