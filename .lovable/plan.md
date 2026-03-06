

# Updated Plan — Settings Subpages

Remove the QR Code subpage from the plan. The three settings pages to build are:

1. **Manage Account** (`/settings/account`) — Change password, email display, delete account with confirmation dialog
2. **Connect Music** (`/settings/music`) — Mock UI with Spotify/Apple Music toggle cards
3. **Contact Us** (`/settings/contact`) — Contact form with subject/message fields, email and social links

Also remove the "Regenerate QR Code" item from the settings menu in `src/pages/Settings.tsx`.

**Files changed:**
- `src/pages/Settings.tsx` — Remove QR Code menu item
- `src/pages/ManageAccount.tsx` — New
- `src/pages/ConnectMusic.tsx` — New
- `src/pages/ContactUs.tsx` — New
- `src/App.tsx` — Add 3 new routes

No database migrations needed.

