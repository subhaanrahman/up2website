# Up2 Platform → Marketing Site Integration Analysis

> **Status:** Analysis only — no code changes proposed in this document.
> **Author scope:** Recommendations for how the live Up2 platform at
> `https://up2-platform.web.app` should be reflected, surfaced, and linked from
> this marketing repo (`up2website`).
> **Last updated:** 2026-05-03

---

## 1. Context

There are two related products in this organisation:

| Product | URL | Repo | Audience | Purpose |
|---|---|---|---|---|
| **Up2 platform** (the app) | `https://up2-platform.web.app` | separate (Supabase + React + Vite) | Guests, organisers, venues, brands | Discovery, RSVP, ticketing, community, ops |
| **Up2 marketing site** (this repo) | container build → Cloud Run | `up2website` | Prospects: organisers, venues, brands, press | Tell the story, drive sign-ups into the platform |

This repo today is intentionally minimal: 4 marketing pages (`Home`,
`Features`, `HowItWorks`, `AboutUs`) plus a `NotFound`, with a handful of
section components in `src/components/marketing/sections/`.

The platform itself is much larger — `docs/ARCHITECTURE.md` documents ~47
routes, ~47 DB tables, ~50 edge functions, Stripe Connect, realtime feeds,
QR check-in, Digital ID, group chat, organiser dashboards, VIP tables, and
loyalty. The marketing site currently shows almost none of that surface area.

The opportunity: **make the marketing site a faithful, conversion-focused
trailer for what the platform already does**, with clear hand-offs into the
platform itself.

---

## 2. Live platform inventory (from nav + repo docs)

### Top-level navigation observed at `up2-platform.web.app`

| Tab | Route | What it actually is (per `docs/ARCHITECTURE.md`) |
|---|---|---|
| Home | `/` | Personalised feed (or public feed when signed out): friends/orgs posts, reposts, nearby events, suggested friends |
| Search | `/search` | Event discovery — search, filters, categories, city |
| Events | `/events` (Tickets page) | "My Plans" (RSVP / purchased / saved) + "My Events" (created); organiser profiles see Organiser Dashboard |
| Messages | `/messages` | Messaging hub: group chats, organiser DMs, broadcast |
| Profile | `/profile` | Personal or organiser profile, posts feed, stats |
| Notifications | `/notifications` | In-app notifications |
| Settings | `/settings/*` | Notifications, privacy, account, payment methods, music, **Digital ID**, etc. |
| Create Event (CTA) | `/create` | Multi-step event creation: ticketing, guestlist, notifications |

### Public (unauthenticated) routes that the marketing site can deep-link into safely

From `docs/ARCHITECTURE.md` §1 "Route Protection":

- `/` — public feed
- `/search` and `/search/:id` — event discovery + public event view
- `/events/:id` and `/events/:id/guests` — public event detail + public guest list
- `/user/:userId` — public profile
- `/embed/:id` — embeddable event widget for external sites
- `/auth` — sign-in / register
- `/terms`, `/privacy`

These are the only URLs the marketing site can deep-link to without leaving
the visitor at a login wall.

### Capability surface to communicate (grouped by buyer concern)

Pulled from `ARCHITECTURE.md` and `PLATFORM_TODOS.md`. Each item is shipped
unless flagged.

**Discovery & community**
- Personalised home feed with weighted scoring (friends → followed orgs →
  reposts → friends-of-followed-orgs → public).
- Event discovery (`/search`) with categories, filters, city.
- Public event pages with friends-going, public guest list, share/conversion
  tracking (`event_link_clicks` → `event_link_conversions`).
- Suggested friends, organiser follow, mute controls, blocking.
- Group chats and event boards (attendee-only realtime chat per event).

**Organiser ops**
- Multi-step event creation (`/create`), edit, manage.
- Ticket tiers, discount codes, capacity, guestlist, waitlist with
  promotion (`waitlist-promote`), VIP tables (partial).
- Manage Event: orders ledger, refunds (organiser + buyer self-service),
  attendee broadcast, CSV exports.
- Organiser team membership and roles (`organiser_members`).
- Per-event analytics dashboard (`/events/:id/analytics`) and overall
  organiser dashboard analytics (`useDashboardAnalytics`).

**Door / day-of-event**
- QR check-in (`/events/:id/checkin`) — manual toggle and camera scan.
- **Digital ID** — every profile carries a personal QR (`PID-{uuid}`) used
  as a universal ticket; check-in validates profile QR or per-ticket QR.
- Apple Wallet + Google Wallet integration (⏳ pending — wallet credentials).

**Payments & money movement**
- Stripe Connect (Express, destination charges).
- 7% service fee on top of ticket price; organiser receives full face value.
- 15-minute order reservation with inventory lock.
- Webhook-driven ticket issuance, auto-RSVP, loyalty point award.
- Refunds: organiser-initiated, buyer self-service (with deadline rules),
  webhook `charge.refunded` sync.
- VIP table reservations (separate flow, partial).

**Loyalty & gamification**
- Points, ranks, vouchers, badges (`user_points`, `point_transactions`,
  `user_vouchers`, `user_badges`).
- Awarded automatically on purchase via webhook queue.

**Trust & safety**
- Phone-OTP auth via Twilio Verify.
- RLS on every user-data table, edge-function write boundaries for sensitive
  operations.
- Reports + (schema-ready) moderation actions.
- Blocking, muting, privacy tiers.

**Embeddable surface**
- `/embed/:id` widget — already built for external sites.

---

## 3. Current marketing site — what's there

### Pages
- `Home.tsx` — Hero → LogoStrip → 6 generic feature tiles → ProductMockup
  section → CTA band.
- `Features.tsx` — 6 generic feature tiles + CTA band.
- `HowItWorks.tsx` — 4-step "publish → convert → operate → iterate" + CTA.
- `AboutUs.tsx` — Company narrative + principles + CTA.
- `NotFound.tsx`.

### Section components in `src/components/marketing/sections/`
`HeroSection`, `FeatureGrid`, `LogoStrip`, `ProductMockupSection`,
`SocialProofSection`, `CtaBand`.

### Gap analysis

| Gap | Today | Why it hurts |
|---|---|---|
| No path into the platform | All CTAs link to other marketing pages (`/features`, `/how-it-works`). Header CTA is "Explore features". | Visitors who are sold can't actually start. There is **no link to the platform** from the marketing site at all. |
| Generic feature copy | "Discovery that feels premium", "Audience & community in one place", etc. — no specifics, no proof. | Could describe any nightlife app. Doesn't communicate that ticketing, QR check-in, Digital ID, Stripe Connect, organiser dashboard, group chat, etc. all already exist. |
| No live event proof | `LogoStrip` is the only social proof; no real events shown. | Discovery is the platform's primary public surface. Showing 3-6 real public events would do more than any copy. |
| No organiser-specific page | `Features` + `HowItWorks` mix audiences. | Organisers (who actually buy / sign up) need their own narrative: ticketing, fees, payouts, ops tooling. |
| No "for guests" framing | The whole site is operator-pitched. | Guests landing on `up2website` from a shared event link have no reason to install / sign up. |
| No pricing / fees clarity | Not mentioned. | The 7% service fee is a known, simple, defensible number — saying it builds trust with organisers comparing platforms. |
| No platform screenshots / mock | `ProductMockupSection` is a stylised placeholder. | The platform is genuinely good-looking and operators want to see it. |
| `Tickets` / `Plans` / `Manage Event` story missing | — | These are some of the strongest organiser-side stories. |
| Auth path missing | — | Need a clear "Sign in" link for returning users coming via `up2website` (e.g. from a printed flyer or business card). |
| No SEO landing for events / organisers | — | If `/events/:id` lives on `up2-platform.web.app`, the marketing domain isn't capturing branded searches like "Up2 [event name]". (Future option: reverse-proxy or shared root domain.) |

---

## 4. Integration plan — recommendations

The plan is split into four layers, ordered by effort and impact.

### Layer A — Wire the marketing site into the platform (low effort, high impact)

Goal: stop being a dead-end. Every page should have at least one path into
the platform.

1. **Add a single source of truth for the platform URL.**
   Add `PLATFORM_URL = "https://up2-platform.web.app"` to `src/lib/brand.ts`
   (and an env override `VITE_PLATFORM_URL` for staging).

2. **Add primary CTAs to the platform in `SiteHeader.tsx`.**
   - Replace / augment the current "Explore features" header button with two
     CTAs:
     - `Sign in` → `${PLATFORM_URL}/auth` (text link)
     - `Open Up2` → `${PLATFORM_URL}` (filled button)
   - Keep "Explore features" only as a tertiary in-page link.

3. **Add platform CTAs to every `CtaBand`.**
   - Home page CTA band: primary "Open Up2" → platform; secondary "How it
     works" stays internal.
   - HowItWorks / Features / AboutUs CTA bands: same treatment.

4. **Footer links to platform sections.**
   Add columns in `SiteFooter.tsx`:
   - **Product**: Open app, Sign in, Discover events (`/search`),
     Create an event (`/create`).
   - **For organisers**: Pricing, Get started, Manage events (deep link).
   - **Resources**: Terms, Privacy (use `${PLATFORM_URL}/terms` and
     `/privacy` to avoid duplicating legal copy).

5. **Use the embed widget.**
   The platform exposes `/embed/:id`. Add a single iframe-based "Live event"
   block to the home page using one curated upcoming event id. Lets the
   marketing site show a real, working ticket button without rebuilding it.

**Acceptance:** From any marketing page, a visitor can reach the live app in
≤ 1 click.

---

### Layer B — Restructure marketing pages around the actual platform (medium effort)

Goal: the marketing copy reflects what the product actually does, with proof.

1. **Split `Features.tsx` into audience-specific pages.**
   Keep `/features` as an overview, but add:
   - `/for-organisers` — ticketing, Stripe Connect, manage event, QR check-in,
     analytics, refunds, fees ("7% service fee on top of ticket price, you
     keep 100% of face value, payouts via Stripe Connect").
   - `/for-guests` — discovery, Digital ID (one personal QR for every
     event), free RSVPs, group chats, friends-going, loyalty points.
   - Optional `/for-venues` later, if that's a wedge.

2. **Rewrite `Home.tsx` feature tiles with platform-true copy.**
   Replace the 6 generic tiles with concrete capabilities:
   - "**Discover** — Personalised feed of nights from friends and the
     organisers you follow."
   - "**Sell tickets** — Stripe-powered checkout, tiers, discount codes,
     guestlist, waitlist."
   - "**Run the door** — QR check-in from any phone. Digital ID means one
     QR per guest, every event."
   - "**Stay close to your audience** — Organiser DMs, group chats,
     event-only attendee boards."
   - "**See what worked** — Per-event analytics: views, clicks,
     conversions, attendee make-up."
   - "**Reward repeat guests** — Built-in points, ranks, and vouchers
     awarded on purchase."

3. **New section: "See it live".**
   - Strip of cards linking to 4-6 hand-picked **public** event pages on
     `up2-platform.web.app/events/:id`.
   - Powered by either (a) a hard-coded curated list, (b) the platform's
     public REST endpoint if one is exposed, or (c) the embed widget.
   - Risks live event content not always being pristine — choose option (a)
     unless an "is_featured_marketing" flag is added platform-side.

4. **Rewrite `HowItWorks.tsx` to match the actual flows.**
   Two parallel stories side-by-side or tabbed:
   - **Organiser path**: Create profile → Stripe Connect → Create event →
     Publish → Sell tickets → Manage door with QR check-in → See analytics.
   - **Guest path**: Browse / get a link → Reserve or buy → Get Digital ID
     → Walk in with one QR → Earn points → Get suggested next.

5. **Add a `Pricing` page (or a `Pricing` section).**
   The fee model is simple and defensible — say it out loud:
   - Free RSVP / guestlist events: **free**.
   - Paid tickets: **7% platform service fee on top of ticket price**.
   - Organiser receives 100% of face value via Stripe Connect payouts.
   - VIP tables: separate (in development).
   This builds trust faster than any "Contact sales" gate.

6. **Add a real screenshot/mock section.**
   - Replace the abstract `ProductMockupSection` with phone-frame mockups
     of three real screens: **Home feed**, **Event detail**, **Manage Event /
     Check-in**.
   - Source: hand-captured screenshots of the live app in dark mode (the
     platform already runs dark). Store in `src/assets/platform/`.

**Acceptance:** Anyone reading the marketing site can describe in two
sentences what the platform does, what it costs, and who it's for.

---

### Layer C — SEO + shared identity (medium-to-high effort)

Goal: make the marketing site the front door for branded and organic
traffic, without forcing visitors through it.

1. **Domain strategy.**
   Decide the long-term domain shape. Three viable patterns:
   - `up2.app` (or chosen apex) → marketing site;
     `app.up2.app` → platform.
   - Marketing on `www.up2.app`, platform on `up2.app` (better for app
     deep-linking from social shares).
   - Single domain with reverse proxy: `/` (marketing) and `/app/*`
     (platform). Highest SEO leverage but biggest infra change.
   `docs/PLATFORM_TODOS.md` already flags moving the frontend to static + CDN
   (Cloud Storage / Firebase Hosting + Cloud CDN); align this decision now.

2. **`Seo.tsx` improvements.**
   - Add `og:image` per page (currently only title/description).
   - Add `application-name`, `apple-mobile-web-app-title`, theme-color.
   - Add `JSON-LD`:
     - `Organization` on `/about` (links to social, logo, founding date).
     - `Product` / `SoftwareApplication` on `/features` and
       `/for-organisers`.
     - On any "see it live" event card section, `Event` JSON-LD pointing
       at the canonical platform URL.

3. **Canonical link rules.**
   - Marketing pages canonical to themselves.
   - Any event card on the marketing site must `rel="canonical"` to the
     platform's `/events/:id` (so Google ranks the platform page, not a
     marketing snippet).

4. **`robots.txt` + sitemap.**
   - Add `public/sitemap.xml` covering `/`, `/features`, `/how-it-works`,
     `/about`, plus any new `/for-organisers`, `/for-guests`, `/pricing`.
   - Confirm `public/robots.txt` allows indexing of marketing routes and
     references the sitemap.

5. **Shared brand tokens.**
   The platform and the marketing site likely already share a Tailwind +
   shadcn vocabulary; codify the shared design tokens (primary, radii,
   typography) into a small `brand-tokens.css` so the two surfaces stay in
   visual lockstep without copy-paste drift.

**Acceptance:** Branded searches ("Up2", "Up2 events", "Up2 [city]") land on
a clearly-linked marketing or app page, with correct OG previews on social.

---

### Layer D — Deeper integrations (optional / future)

These need product-side cooperation; included so we know the trade-offs.

1. **Public event read API.**
   Today there's no documented public REST endpoint for "list featured /
   upcoming events". Adding a tiny edge function (e.g. `events-public-list`)
   would let the marketing site render a *live* curated list without
   embedding `iframe`s. RLS already supports public reads of published
   events.

2. **Organiser sign-up funnel routed through marketing.**
   Add a `/get-started` page on the marketing site that:
   - Captures name + email + venue/brand + city in a small form.
   - Posts to a new `marketing-leads` edge function (or directly to
     Supabase via a public-write table with RLS and rate limiting).
   - Redirects to `${PLATFORM_URL}/auth?intent=organiser&utm_source=marketing`.
   This gives marketing attribution and a low-friction qualifier ahead of
   real sign-up.

3. **Press kit / brand assets page.**
   `/press` with logo downloads (the repo already has `public/logo-full.png`
   and a `src/assets/logo-full.png`), short bio (`PRODUCT_NAME`,
   `LEGAL_ENTITY_NAME`), founder contact, screenshots zip.

4. **Status page link.**
   When the platform's observability story matures (mentioned across
   `PLATFORM_TODOS.md`), link a `status.up2.app` from the footer.

5. **App store badges.**
   `flutterchanges.md` exists in this repo, suggesting native/Flutter work.
   Once apps are live, add Apple/Play badges to the hero and footer.

---

## 5. Concrete page-by-page recommendations

### `src/pages/Home.tsx`
- **Hero:** keep the current copy direction; replace primary CTA with
  `Open Up2` (→ platform) and secondary with `How it works` (internal).
- **Replace** the existing 6-tile `FeatureGrid` with the platform-true
  6-tile copy from Layer B.2.
- **Add** a "See it live" section using the embed widget *or* curated public
  event cards.
- **Add** a "For organisers / For guests" two-column split linking to
  `/for-organisers` and `/for-guests`.
- **Replace** `ProductMockupSection` with real platform screenshots
  (Layer B.6).
- **Final CTA band:** primary `Create your first event` →
  `${PLATFORM_URL}/auth?intent=organiser`, secondary `Browse events` →
  `${PLATFORM_URL}/search`.

### `src/pages/Features.tsx`
- Reframe as the canonical capability matrix: a table or grid grouped by
  the four product areas — Discovery & community, Organiser ops,
  Door / day-of, Payments & loyalty.
- Each row: capability + one-line description + link to the corresponding
  platform deep link where one is public.

### `src/pages/HowItWorks.tsx`
- Refactor the 4-step list into two parallel stories
  (Organiser / Guest, Layer B.4).
- Add concrete screen references next to each step.

### `src/pages/AboutUs.tsx`
- Keep substantively as-is, but add:
  - A small "What we built" stat row pulled from `ARCHITECTURE.md`:
    "47 routes · 50 edge functions · realtime feed · QR-based Digital ID".
  - Link to the Press kit page if/when added.

### New: `src/pages/ForOrganisers.tsx`
- Hero: "Run the room. Not the spreadsheet."
- Sections: Ticketing & checkout · Door & check-in · Manage Event ·
  Audience & messaging · Analytics · Pricing.
- CTA: "Start onboarding" → `${PLATFORM_URL}/auth?intent=organiser`.

### New: `src/pages/ForGuests.tsx`
- Hero: "One QR for every night out."
- Sections: Discover · Friends-going · Digital ID · Loyalty.
- CTA: "Open Up2" → platform root.

### New: `src/pages/Pricing.tsx`
- Three cards: Free events, Paid tickets (7%), VIP tables (coming soon).
- FAQ: payouts, refunds, multi-currency status, taxes, fee surcharge vs
  absorb.

### `src/components/marketing/SiteHeader.tsx`
- Add `Sign in` text link and a primary `Open Up2` button that point at
  the platform.
- Add new nav entries: `For organisers`, `For guests`, `Pricing` (collapse
  under a `Product` dropdown if header gets crowded).

### `src/components/marketing/SiteFooter.tsx`
- Footer columns described in Layer A.4.

---

## 6. Technical notes & guardrails

- **Don't proxy the platform.** Tempting to render `up2-platform.web.app` in
  a frame for "see it live" — but Supabase auth, realtime, and Stripe all
  break in framed contexts and the platform almost certainly sets
  `X-Frame-Options`. Use `/embed/:id` (which is *built* to be embedded) or
  static screenshots.
- **External links.** All links to the platform should:
  - Use `target="_self"` by default (we want the visitor to *go there*),
    but allow `target="_blank" rel="noopener noreferrer"` for cards in
    "see it live" so the marketing tab persists.
  - Append UTM params: `?utm_source=marketing&utm_medium=site&utm_campaign=<page>`.
    Add a tiny `src/lib/platformLink.ts` helper to centralise this.
- **No platform secrets in this repo.** The marketing site should not
  embed `VITE_SUPABASE_*` keys. If we add the leads form (Layer D.2),
  use a dedicated narrowly-scoped function on the platform side — do not
  give the marketing build a service role key.
- **Image weight.** Platform screenshots can be heavy; export as WebP and
  use `<img loading="lazy" decoding="async">` or a `<picture>` with AVIF
  fallback. Marketing site is currently lean — keep it lean.
- **Routing additions.** New pages must be lazy-loaded in `src/App.tsx`
  matching the existing pattern (`const ForOrganisers = lazy(() => import(...))`).
- **Accessibility.** Anything described as a button to "Open Up2" should
  read clearly to screen readers (`aria-label="Open Up2 in this tab"`),
  especially since the destination is a different host.

---

## 7. Phased roadmap

| Phase | Scope | Effort | Outcome |
|---|---|---|---|
| **0 — Wire** (Layer A) | Header + footer links to platform, CTA band updates, `PLATFORM_URL` constant, embed widget on home | ~½ day | Marketing site stops being a dead-end |
| **1 — Reframe** (Layer B partial) | Rewrite Home feature tiles with platform-true copy, swap mockup section for real screenshots | 1–2 days | Site honestly represents the product |
| **2 — Audience split** (Layer B) | Add `/for-organisers`, `/for-guests`, `/pricing`; restructure `HowItWorks` into dual flows; update header nav | 2–3 days | Each persona has a path; pricing transparent |
| **3 — SEO** (Layer C) | OG images, JSON-LD, sitemap, canonicals, brand-tokens unification | 1–2 days | Marketing site rankable and shareable |
| **4 — Deeper** (Layer D) | Public events API, leads funnel, press kit, status link, app badges | Multi-week, needs platform-side work | Marketing becomes a measurable acquisition surface |

---

## 8. Open questions to resolve before building

1. **Domain plan.** What's the production domain for marketing vs platform?
   This shapes canonical URLs, OG, and analytics setup. Tied to the
   `PLATFORM_TODOS.md` "static build + CDN" item.
2. **Pricing copy sign-off.** Is `7% on top of ticket price` the public
   number we want to commit to in marketing copy?
3. **Curated public events.** Who picks the 4-6 events shown on the home
   page, and how often do they refresh? Manual list, or do we need a
   `is_featured_marketing` flag platform-side?
4. **Auth deep-linking.** Should `Sign in` from marketing always go to
   `/auth`, or do we want `/auth?intent=organiser` vs guest variants
   wired up on the platform first?
5. **Analytics / attribution.** What does the platform track today that we
   can pair with UTM params from this site? (PostHog is listed as pending
   in `PLATFORM_TODOS.md` — until that lands, we're limited to UTM +
   server logs.)
6. **Press / brand assets.** Are there finalised brand guidelines we should
   publish, or do we hold the press page until they exist?

---

## 9. Summary

The marketing site today is **well-crafted but disconnected** — beautiful
type, restrained design, but no path into the actual product and no
specifics about what the product does. The platform, by contrast, is
**broad and shipped** — discovery, ticketing, checkout, check-in, Digital
ID, messaging, loyalty, analytics, refunds, organiser team, embed widget.

The integration work splits cleanly into four layers:
- **A. Wire** — link header, footer, and CTAs into the platform (½ day).
- **B. Reframe** — rewrite copy and add audience-specific pages (3–5 days).
- **C. SEO** — make the site discoverable and trustworthy (1–2 days).
- **D. Deeper** — eventual leads funnel, public API, press kit, status
  page (ongoing).

Layer A alone — done in a single afternoon — would close the most expensive
gap on the site today: visitors who are sold have no door to walk through.
