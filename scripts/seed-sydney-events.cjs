#!/usr/bin/env node
/**
 * Generates seed SQL from Sydney_Events_March2026.xlsx
 * Run: node scripts/seed-sydney-events.js [path-to-xlsx]
 * Output: supabase/seed-sydney-events.sql
 */

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const DEFAULT_XLSX =
  "/Users/subhaan/Library/Application Support/Claude/local-agent-mode-sessions/645367de-2cbf-4233-a44d-8563d6d2d97d/2c55079c-2689-40c9-872e-142f3b2235c5/local_1904e869-e1ee-4e74-a7e2-2f18a16151ce/outputs/Sydney_Events_March2026.xlsx";

const xlsxPath = process.argv[2] || DEFAULT_XLSX;

if (!fs.existsSync(xlsxPath)) {
  console.error("File not found:", xlsxPath);
  console.error("Usage: node scripts/seed-sydney-events.js [path-to-Sydney_Events_March2026.xlsx]");
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Skip header rows; require event name (col 1) and organiser (col 6)
const rows = data
  .slice(2)
  .filter((r) => r && r.length >= 7 && r[1])
  .map((r) => ({
    num: r[0],
    eventName: String(r[1] || "").trim(),
    dateStr: String(r[2] || "").trim(),
    timeStr: String(r[3] || "").trim(),
    venue: String(r[4] || "").trim(),
    ticketPrice: String(r[5] || "").trim(),
    organiser: String(r[6] || "").trim(),
  }));

const organisers = [...new Set(rows.map((r) => r.organiser).filter(Boolean))];

// Generate slug from organiser name for unique username
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Parse "Sat, 21 Mar 2026" + "6:30 PM" -> ISO string (Sydney time assumed)
function parseDateTime(dateStr, timeStr) {
  const dateMatch = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (!dateMatch) return null;
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const [, day, monthName, year] = dateMatch;
  const month = months[monthName];
  const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  let hour = 0,
    min = 0;
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    min = parseInt(timeMatch[2] || "0", 10);
    if ((timeMatch[3] || "").toUpperCase() === "PM" && hour < 12) hour += 12;
    if ((timeMatch[3] || "").toUpperCase() === "AM" && hour === 12) hour = 0;
  }
  const d = new Date(Date.UTC(parseInt(year), month - 1, parseInt(day), hour, min, 0));
  return d.toISOString();
}

// Deterministic UUID v4-like from string (for reproducible seeds)
// Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (8-4-4-4-12)
function uuidFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  const pad = (n, len) => (n >>> 0).toString(16).padStart(len, "0").slice(-len);
  return `${pad(h, 8)}-${pad(h * 7, 4)}-4${pad(h * 13, 3)}-a${pad(h * 17, 3)}-${pad(h * 19, 12)}`;
}

const orgToUserId = {};
const orgToOrgProfileId = {};
organisers.forEach((name, i) => {
  if (!name) return;
  const base = `sydney-org-${i + 1}-${slugify(name)}`;
  orgToUserId[name] = uuidFromString(`user-${base}`);
  orgToOrgProfileId[name] = uuidFromString(`org-${base}`);
});

const pw = "seedhost123";

const out = [];

out.push(`-- Sydney Events March 2026 seed (from Sydney_Events_March2026.xlsx)`);
out.push(`-- Run: supabase db reset (local) or paste into SQL Editor (hosted)`);
out.push(`-- Organiser accounts: sydney-org-1@seed.sydney, sydney-org-2@seed.sydney, ... (password: ${pw})`);
out.push("");
out.push(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
out.push("");

out.push("DO $$");
out.push("DECLARE");
out.push("  v_pw text := crypt('" + pw + "', gen_salt('bf'));");
organisers.forEach((name, i) => {
  if (!name) return;
  const uid = orgToUserId[name];
  const email = `sydney-org-${i + 1}@seed.sydney`;
  out.push(`  v_uid_${i + 1} uuid := '${uid}'::uuid;`);
});
out.push("BEGIN");

// 1. Auth users
organisers.forEach((name, i) => {
  if (!name) return;
  const uid = orgToUserId[name];
  const email = `sydney-org-${i + 1}@seed.sydney`;
  out.push("");
  out.push(`  -- Organiser: ${name.replace(/'/g, "''")}`);
  out.push(`  INSERT INTO auth.users (`);
  out.push(`    id, instance_id, aud, role, email, encrypted_password,`);
  out.push(`    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at`);
  out.push(`  ) VALUES (`);
  out.push(`    '${uid}', '00000000-0000-0000-0000-000000000000',`);
  out.push(`    'authenticated', 'authenticated', '${email}', v_pw, now(),`);
  out.push(`    '{"provider":"email","providers":["email"]}',`);
  out.push(`    '{"display_name":"${name.replace(/"/g, '\\"')}"}',`);
  out.push(`    now(), now()`);
  out.push(`  ) ON CONFLICT (id) DO NOTHING;`);
  out.push("");
  out.push(`  INSERT INTO auth.identities (`);
  out.push(`    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at`);
  out.push(`  ) VALUES (`);
  out.push(`    '${uid}', '${uid}',`);
  out.push(`    format('{"sub":"%s","email":"${email}"}', '${uid}')::jsonb,`);
  out.push(`    'email', '${email}', now(), now(), now()`);
  out.push(`  ) ON CONFLICT (provider, provider_id) DO NOTHING;`);
});

// 2. Profiles
out.push("");
out.push("  -- Profiles for organisers");
out.push("  INSERT INTO public.profiles (user_id, display_name, username) VALUES");
const profileRows = organisers
  .filter(Boolean)
  .map((name, i) => {
    const uid = orgToUserId[name];
    const username = `sydney-org-${i + 1}`;
    return `    ('${uid}', '${name.replace(/'/g, "''")}', '${username}')`;
  });
out.push(profileRows.join(",\n"));
out.push("  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, username = COALESCE(profiles.username, EXCLUDED.username);");

// 3. Organiser profiles
out.push("");
out.push("  -- Organiser profiles");
out.push("  INSERT INTO public.organiser_profiles (id, owner_id, display_name, username, category, city) VALUES");
const orgProfileRows = organisers
  .filter(Boolean)
  .map((name, i) => {
    const uid = orgToUserId[name];
    const orgId = orgToOrgProfileId[name];
    const username = `sydney-org-${i + 1}`;
    return `    ('${orgId}', '${uid}', '${name.replace(/'/g, "''")}', '${username}', 'Promoter', 'Sydney')`;
  });
out.push(orgProfileRows.join(",\n"));
out.push("  ON CONFLICT (id) DO NOTHING;");

// 4. Events
out.push("");
out.push("  -- Events");
out.push("  INSERT INTO public.events (");
out.push("    host_id, organiser_profile_id, title, description, venue_name, address, location,");
out.push("    event_date, end_date, category, is_public, status, ticket_price_cents");
out.push("  ) VALUES");

const esc = (s) => String(s || "").replace(/'/g, "''").replace(/\u2019/g, "''");
const eventRows = rows.map((r) => {
  const uid = orgToUserId[r.organiser];
  const orgId = orgToOrgProfileId[r.organiser];
  const eventDate = parseDateTime(r.dateStr, r.timeStr) || "2026-03-20T00:00:00Z";
  const venueRaw = r.venue || "";
  const venueName = venueRaw.split(",")[0]?.trim() || venueRaw;
  const address = venueRaw ? `${venueRaw}, Sydney, NSW` : "Sydney, NSW";
  const desc = r.ticketPrice ? `Cheapest ticket: ${r.ticketPrice}` : "";
  return `    ('${uid}', '${orgId}', '${esc(r.eventName || "Untitled")}', '${esc(desc)}', '${esc(venueName)}', '${esc(address)}', '${esc(venueRaw)}', '${eventDate}'::timestamptz, '${eventDate}'::timestamptz, 'party', true, 'published', 0)`;
});

out.push(eventRows.join(",\n"));
out.push("  ;");

out.push("END $$;");

const sql = out.join("\n");

const outputPath = path.join(__dirname, "..", "supabase", "seed-sydney-events.sql");
fs.writeFileSync(outputPath, sql, "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`  ${organisers.length} organisers, ${rows.length} events`);
