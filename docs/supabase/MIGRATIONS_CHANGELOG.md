# Migration Changelog

Recent schema changes applied via `supabase db push`.

## 2026-03-19

### `20260319120000_add_venue_name_and_address`
- **Table:** `events`
- **Changes:** Added `venue_name` and `address` columns for proper venue + address support.
- **Purpose:** Separate venue display name from full address (replaces single `location` field).

### `20260319120000_tickets_available_until`
- **Table:** `events`
- **Changes:** Added `tickets_available_until` (timestamptz, nullable).
- **Purpose:** When to stop selling tickets; `null` = close 1 min before event start.

### `20260319130000_profiles_qr_code_digital_id`
- **Table:** `profiles`
- **Changes:** Added `qr_code` (text, NOT NULL, UNIQUE).
- **Purpose:** Per-user digital ID / QR code for check-in, digital wallet, etc.

### `20260319140000_event_messages_host_delete`
- **Table:** `event_messages`
- **Changes:** New RLS policy allowing event hosts to DELETE messages in their event.
- **Purpose:** Host moderation of event chat.
