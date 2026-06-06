# ⚡ UP NEPA — Full Product Spec (MVP)
> Stack: Antigravity (Frontend) · Supabase (Backend)  
> Scope: Magboro, Ogun State — MVP launch area  
> Team: Solo / 2-person student project  
> Status: Live on web — active development

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Core Problem](#2-core-problem)
3. [MVP Scope](#3-mvp-scope)
4. [Data Strategy](#4-data-strategy)
5. [User Identity System](#5-user-identity-system)
6. [Push Notification System](#6-push-notification-system)
7. [Home Screen UI](#7-home-screen-ui)
8. [Map Visualization](#8-map-visualization)
9. [Analytics Dashboard](#9-analytics-dashboard)
10. [Reporting Flow](#10-reporting-flow)
11. [Backend Logic — Status Calculation](#11-backend-logic--status-calculation)
12. [Prediction Engine](#12-prediction-engine-phase-2)
13. [Onboarding Flow](#13-onboarding-flow)
14. [Streak & Engagement Logic](#14-streak--engagement-logic)
15. [Data Staleness Handling](#15-data-staleness-handling)
16. [Supabase Schema](#16-supabase-schema)
17. [Full User Loop Summary](#17-full-user-loop-summary)
18. [Build Order](#18-build-order)

---

## 1. Product Vision

Up NEPA is a community-powered, Nigeria-focused web app that tells users:
- Whether power is currently ON or OFF in their area
- When power is likely to return, based on historical patterns

> **"NEPA"** = local Nigerian slang for the electricity authority  
> **"Up"** = light is back / restored

The product is **not** primarily a reporting tool. It is a **real-time electricity awareness and prediction system**. Reporting is only the mechanism that feeds it.

---

## 2. Core Problem

Nigerians have no reliable way to know:
- Whether power is currently on in their area
- When it is likely to return after an outage

Current workarounds: asking neighbours, checking WhatsApp groups, physically observing appliances.

**Up NEPA replaces all of that with one tap.**

---

## 3. MVP Scope

**Target area:** Magboro, Ogun State  
**Platform:** Progressive Web App (PWA) — distributable via WhatsApp link, installable from browser  
**Why PWA over native app:** No app store friction. Users click a link and it works. Critical for distribution via CDA WhatsApp groups.

**MVP feature set:**
- Area-based live power status (per street/estate in Magboro)
- One-tap reporting (via notification or in-app)
- Push notifications for status check-ins
- In-app notification history (bell icon drawer)
- Map visualization of power status across Magboro
- Collapsed analytics dashboard on home screen
- Basic streak mechanic to encourage habitual reporting
- Prediction display (Phase 2 — unlocks after ~4 weeks of data)

**What is NOT in MVP:**
- WhatsApp bot integration
- Charging detection / passive signals
- Points leaderboard
- Multi-city support
- Native mobile app

---

## 4. Data Strategy

### Primary data source: Community reports
Users are the sensor network. There is no passive or automatic alternative at this budget and scope.

### Cold start solution: CDA Network
- The CDA (Community Development Association) chairman for the area has WhatsApp groups covering multiple parts of Magboro
- Initial users are recruited through these groups — community trust transfers directly to early adoption
- Target: 20–30 seed reporters across at least 3–4 distinct streets at launch

### Secondary data source (pursue in parallel): DISCO outage schedules
- IBEDC (or relevant DISCO for Ogun State) occasionally publishes load shedding schedules
- Monitor their website and social media
- Manually or automatically layer this as a signal on top of user reports when available
- This is a long shot but worth pursuing as a background task

### Manual seeding (pre-launch):
- Founders log their own street's power status daily for 2–4 weeks before launch
- This becomes the first thin historical dataset for the prediction engine

### Grid zone mapping (emergent — not pre-defined):
- Do NOT attempt to pre-map transformer zones before launch
- Let user reports reveal natural clustering over time
- Streets that consistently report power ON and OFF together belong to the same transformer zone
- The system detects these clusters automatically from report correlation data
- Detected zones inform map visualization groupings over time
- The data tells you the map — not the other way around

---

## 5. User Identity System

### The problem
Device ID stored in localStorage is brittle. It breaks when:
- User clears browser cache, cookies, or history → new user created
- User switches to a different browser → new user created
- User reinstalls or updates their browser → potential new user

### Solution: Browser fingerprint hash (primary identifier)

Generate a stable hash on every app load by combining multiple browser signals:
- Screen resolution
- Timezone
- Browser language
- User agent string
- Canvas fingerprint
- Installed font list (sampled)

Hash these signals together into a single `device_id` string. Store this hash in localStorage as a cache, but regenerate and verify it on every load.

**Why this is more stable than localStorage alone:**  
The signals come from the device itself, not stored data. Cache clears do not affect the underlying device properties. The fingerprint regenerates to the same value on the same device/browser combination.

**Honest limitation:**  
Fingerprints break when the user switches browsers (e.g. Chrome → Firefox) because the environment differs. This is an accepted edge case at MVP scale.

### Fallback: Optional session recovery code

For users who switch browsers or lose their identity:
- After onboarding, the app displays a short **6-digit alphanumeric recovery code** (e.g. `MGB-4X9`)
- User can optionally save this code
- On a new browser, user can enter their code to recover their streak, area, and history
- No password. No email. Just a code — voluntary and frictionless

Recovery code is stored hashed in the `users` table and can be entered during onboarding screen 2.

### Identity flow summary

```
App loads
    ↓
Regenerate fingerprint hash
    ↓
Does hash exist in users table?
    ├── YES → restore user, sync state
    └── NO → check localStorage for cached device_id
              ├── Match found → update fingerprint in DB, restore user
              └── No match → new user onboarding
```

### What is never used for identity
- Email address
- Phone number
- Social login
- IP address alone (too unstable on mobile networks)

---

## 6. Push Notification System

### When notifications are sent (backend trigger logic):

| Trigger | Condition |
|---|---|
| Morning window | 6:00am – 7:00am WAT daily |
| Evening window | 6:00pm – 7:00pm WAT daily |
| Stale data | Last confirmed report for user's area is older than 3 hours |
| Neighbour trigger | Adjacent area just reported a status change |

### Notification copy by situation:

**Status unknown / morning check:**
> "Abi light dey your side? Help your neighbours know 👀"  
> `[YES it's up]` · `[NO it's out]`

**Power was last reported ON 3+ hours ago:**
> "Light still dey? Quick confirm for your area 🙏"  
> `[Still ON]` · `[It went off]`

**Neighbouring area just reported power:**
> "Your neighbours just got light — has it reached you?"  
> `[Yes it has]` · `[Not yet]`

### Key rule:
**Tapping either button reports directly from the notification. No app open required.**

This is the single most important UX decision in the product. If users must open the app to report, drop-off is immediate.

### In-app notification history:
- All notifications are written to the `notifications` table for **all users** — including those who declined push permission
- Users who declined push can still see their notification history via the bell icon drawer
- Notifications older than 60 days are automatically purged
- Maximum 30 notifications fetched per user at a time

---

## 7. Home Screen UI

### Layout (top to bottom):

```
┌─────────────────────────────────┐
│  UP NEPA              🔔  👤   │
│                      (badge)    │
├─────────────────────────────────┤
│                                 │
│  YOUR AREA                      │
│  Magboro — Pipeline Road        │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ⚡ LIGHT IS UP          │    │
│  │  Reported by 6 people   │    │
│  │  Last update: 8 mins ago│    │
│  └─────────────────────────┘    │
│                                 │
│  [ ✅ Confirm ON ]  [❌ It's off]│
│                                 │
├─────────────────────────────────┤
│  NEARBY AREAS                   │
│                                 │
│  Magboro — Arepo     ⚡ ON  4m  │
│  Magboro — Owoade   🔴 OFF 12m  │
│  Magboro — Likosi    ⚡ ON  1h  │
│                                 │
├─────────────────────────────────┤
│  📊 Today: 4h supply  ↑ vs yday │  ← collapsed analytics bar
│  (tap to expand full dashboard) │
├─────────────────────────────────┤
│  PREDICTION                     │
│  "Light usually returns         │
│   around 6pm in your area"      │
│  Confidence: Pretty confident   │
├─────────────────────────────────┤
│  🔥 You've reported 5 days      │
│     in a row. Keep it up!       │
└─────────────────────────────────┘
```

### Colour language:

| State | Colour | Icon |
|---|---|---|
| Power ON | Green | ⚡ |
| Power OFF | Red | 🔴 |
| Unconfirmed / stale | Grey | — |

### Status card behaviour:
- Pulses gently on fresh update
- Fades to grey as data gets stale
- Never shows data older than 6 hours as current — defaults to "Unconfirmed" label

---

## 8. Map Visualization

### Purpose
Allow users to see power status across Magboro visually — not just as a list. Over time, the map will reveal natural transformer zone clusters based on report correlation.

### Location access policy
- Location permission is requested **once** during onboarding to pre-select the user's area from the preset list
- Location is used only to suggest the closest area — it is not stored, not tracked, and not used after onboarding
- The map visualization uses **area coordinates** (from the `areas` table), not the user's live location
- This must be communicated clearly to the user during the location permission prompt

### Map base layer
**Use Leaflet.js with OpenStreetMap tiles** (free, no billing risk at MVP scale).  
Google Maps API is not recommended for MVP due to billing requirements and API key management overhead.  
Can be upgraded to Mapbox or Google Maps post-launch if design quality requires it.

### Map features

**Base behaviour:**
- Pannable and zoomable map centred on Magboro
- Preset area pins rendered from the `areas` table (lat/lng)
- Dark mode and light mode toggle — map tiles switch accordingly (use Leaflet providers for dark tile layer)

**Custom visualization layer (on top of base map):**

| Dot colour | Meaning |
|---|---|
| 🟢 Green dot | Area currently reporting power ON |
| 🔴 Red dot | Area currently reporting power OFF |
| ⚪ Grey dot | Unconfirmed / no recent data |

- Dot size scales with report confidence (more reports = larger, more opaque dot)
- Tapping a dot shows a popup: area name, current status, report count, last updated time
- User's own area is highlighted with a distinct ring or outline

**Grid zone clustering (Phase 2):**
- As report correlation data accumulates, areas that consistently share the same status get visually grouped with a soft boundary overlay
- This boundary is computed, not manually drawn — it emerges from the data

### Map placement in UI
- Accessible via a **"Map" tab** in the bottom navigation or a map icon on the home screen
- Not on the home screen itself — home screen stays focused on the user's own area status
- Map is a secondary view, not the primary one

---

## 9. Analytics Dashboard

### Placement and behaviour
- Collapsed by default on the home screen as a single summary bar
- Summary bar shows: today's estimated supply hours + trend arrow (up/down vs yesterday)
- Tapping the bar expands a full analytics panel below it (accordion pattern)
- No separate screen — stays within the home screen context

### Summary bar (collapsed):
```
📊 Today: 4h supply  ↑ vs yesterday    [tap to expand]
```

### Expanded dashboard content:

**1. Daily supply hours — 7-day bar chart**
- X axis: last 7 days (Mon, Tue, Wed...)
- Y axis: estimated hours of power supply
- Bar chart format — easiest to compare across days on mobile
- Bar colour: green if above area average, amber if below

**2. Current outage duration**
- If power is currently OFF: "Power has been out for 2h 40min"
- If power is currently ON: "Power has been on for 1h 15min"

**3. Average daily supply (this area)**
- "Your area gets an average of 6.2 hours of power per day this week"
- Compared against last week: "↓ 1.4h vs last week"

**4. Most reliable time window**
- "Power is most stable in your area between 6am – 9am"
- Derived from historical ON reports clustered by hour of day

**5. Outage frequency**
- "Your area has had 3 outages today"
- "Average: 2 outages per day this week"

**6. Longest uninterrupted supply streak**
- "Longest stretch without outage this month: 8 hours (last Tuesday)"

### Data source for analytics
All analytics are derived from the `reports` table — specifically the timestamps and status values of ON/OFF transitions per area. No separate analytics table needed at MVP. Queries run on demand when the panel expands, not on page load.

### Important constraint
Analytics only display when sufficient data exists (minimum 10 reports for that area). Below that threshold, show:
> "Not enough data yet for your area — keep reporting and analytics will appear here 📊"

---

## 10. Reporting Flow

### In-app reporting:
- Report button is the **single most visible element** on home screen
- One tap. No confirmation screen. No form.
- Haptic feedback on tap
- Report count increments visibly in real time

### Duplicate report guard:
If user tries to report the same status twice within **5 minutes**:
> "You already confirmed this — we'll ask again soon 👍"

5 minutes is sufficient to prevent accidental double-taps while still allowing rapid status changes to be captured. Power can return within minutes in Nigeria — a 30-minute guard would suppress legitimate reports.

### Conflicting report handling:
If user reports a status that conflicts with majority consensus (e.g. 5 say ON, they say OFF):
> "Noted — your report has been recorded. Might be a partial outage in your street."

This keeps conflicting reporters feeling heard while protecting data integrity.

---

## 11. Backend Logic — Status Calculation

### Per-area confidence score inputs:

| Input | Weight |
|---|---|
| Number of reports in last 2 hours | High |
| Ratio of ON vs OFF reports | High |
| Recency of each report | Medium (newer = more weight) |
| Reporter reliability score | Medium |

### Output states:

| State | Condition |
|---|---|
| **Confirmed ON** | 3+ weighted reports agreeing power ON in last 90 mins |
| **Confirmed OFF** | 3+ weighted reports agreeing power OFF in last 90 mins |
| **Likely ON / Likely OFF** | Fewer than 3 reports but leaning one way |
| **Unconfirmed** | No reports in last 2 hours OR conflicting reports |

### Reporter reliability score (backend only, never shown to user):

**Increases when:**
- Reports match area consensus
- Reports are consistent over multiple days

**Decreases when:**
- Reports consistently conflict with consensus
- Suspicious reporting frequency (spam detection)

High reliability reporters carry more weight in confidence calculation.

### Implementation:
Status calculation runs as a **PostgreSQL trigger function** (`recalculate_area_status()`) that fires `AFTER INSERT` on `reports`. Runs server-side — no Edge Function latency.

---

## 12. Prediction Engine (Phase 2)

> **Unlocks after approximately 4 weeks of data accumulation per area**

### What the engine tracks per area:
- Average time power comes ON by day of week
- Average duration of outages
- Average duration of power supply windows
- Frequency of outages per week

### Display rules:

**Before power returns:**
> "Your area usually gets light around 6pm on weekdays. That's in about 2 hours."

**Outage longer than historical average:**
> "This outage is longer than normal for your area. No prediction available yet."

**Insufficient data:**
> "Not enough data for your area yet — help us by reporting daily"

### Critical rule — never show hard times:
❌ `"Power returns at 18:00"`  
✅ `"Usually comes back around evening — roughly 6pm based on past patterns"`

A wrong hard prediction destroys trust permanently. Soft probabilistic language preserves credibility.

---

## 13. Onboarding Flow

**Maximum 4 screens. No account creation at MVP.**

| Screen | Content |
|---|---|
| 1 | "Welcome to Up NEPA" · "Know when light is coming — before it arrives" · `[Get Started]` |
| 2 | "Where do you stay?" · Dropdown: select area within Magboro (street/estate level) · Optional: `[Use my location]` to auto-suggest closest area · Optional: `[Enter recovery code]` to restore previous session |
| 3 | "Allow notifications" · "We'll ping you twice a day — you just tap Yes or No. That's it." · `[Allow]` · `[Maybe later]` |
| 4 | "You're in." · Shows recovery code with save prompt · Goes to home screen |

**No email. No password. No friction.**  
Identity is established via browser fingerprint hash. Recovery code is optional but shown to every new user.

---

## 14. Streak & Engagement Logic

### Streak rules:
- Increments if user reports at least once in a 24-hour window
- Resets at midnight if no report that day
- Displayed passively on home screen — not aggressively pushed

### Milestone messages:

| Streak | Message |
|---|---|
| 3 days | "You're helping your whole street 🙌" |
| 7 days | "One week strong 🔥 Magboro thanks you" |
| 30 days | "You're an Up NEPA legend for this area ⚡" |

**No points system. No leaderboard. Just streak count and milestone messages.**  
Simple, effective, leverages loss aversion without overcomplicating MVP.

---

## 15. Data Staleness Handling

| Age of last report | UI behaviour |
|---|---|
| 0 – 90 minutes | Full colour, shown as current |
| 90 min – 3 hours | Slight visual fade, "last updated X ago" label |
| 3 – 6 hours | Grey, labelled "Unconfirmed — tap to update" |
| Over 6 hours | "No recent data for this area" |

The UI communicates data confidence visually. Users never have to think about it.

---

## 16. Supabase Schema

### `users`
```sql
id                uuid primary key default gen_random_uuid()
device_id         text unique not null        -- browser fingerprint hash
recovery_code     text unique                 -- hashed 6-digit code e.g. MGB-4X9
area_id           uuid references areas(id)
reliability       float default 0.5           -- 0.0 to 1.0
streak            int default 0
push_subscription jsonb                       -- web push subscription object
last_reported     timestamp
created_at        timestamp default now()
```

### `areas`
```sql
id            uuid primary key default gen_random_uuid()
name          text not null                   -- e.g. "Magboro — Pipeline Road"
city          text default 'Magboro'
state         text default 'Ogun'
lat           float                           -- used for map visualization
lng           float                           -- used for map visualization
created_at    timestamp default now()
```

### `reports`
```sql
id            uuid primary key default gen_random_uuid()
user_id       uuid references users(id)
area_id       uuid references areas(id)
status        text check (status in ('ON', 'OFF'))
created_at    timestamp default now()
```

### `area_status` (computed / cached)
```sql
id               uuid primary key default gen_random_uuid()
area_id          uuid references areas(id) unique
current_status   text check (current_status in ('ON', 'OFF', 'LIKELY_ON', 'LIKELY_OFF', 'UNCONFIRMED'))
confidence       float                       -- 0.0 to 1.0
report_count     int
last_updated     timestamp
```

### `notifications`
```sql
id            uuid primary key default gen_random_uuid()
user_id       uuid references users(id)
title         text
body          text
is_read       boolean default false
created_at    timestamp default now()
```
> Purge policy: delete rows older than 60 days via scheduled cron. Fetch limit: 30 per user.

### `patterns` (Phase 2 — prediction engine)
```sql
id               uuid primary key default gen_random_uuid()
area_id          uuid references areas(id)
day_of_week      int                         -- 0 = Sunday, 6 = Saturday
avg_on_time      time                        -- average time power comes ON
avg_off_time     time                        -- average time power goes OFF
avg_duration_on  float                       -- average hours of supply
avg_duration_off float                       -- average hours of outage
sample_size      int                         -- number of data points used
last_computed    timestamp
```

### Supabase features to use:
- **Realtime** — subscribe to `area_status` and `notifications` changes live
- **PostgreSQL triggers** — status calculation fires server-side on report insert
- **Row Level Security** — users can only write and read their own data
- **Edge Functions + cron** — push notification scheduling at 6am/6pm WAT
- **x-device-id header** — passed with every request for anonymous RLS enforcement

---

## 17. Full User Loop Summary

```
User wakes up
      ↓
6am notification arrives
"Abi light dey?"
      ↓
User taps YES or NO
directly in notification
(no app open needed)
      ↓
Report hits Supabase
PostgreSQL trigger fires
      ↓
Confidence score
recalculated for area
      ↓
area_status table updated
      ↓
Notification written to
notifications table
(all users, not just push)
      ↓
All users in that area
see updated status via
Supabase Realtime
      ↓
Analytics dashboard
recalculates supply hours
      ↓
Map dot updates colour
for that area
      ↓
Prediction engine
recalibrates pattern
(Phase 2)
      ↓
6pm notification
cycle repeats
      ↓
Streak increments
if user reported today
```

---

## 18. Build Order

### Week 1–2: Foundation
- [ ] Supabase project setup — schema, RLS policies, Realtime enabled
- [ ] Browser fingerprint identity system + recovery code generation
- [ ] PWA scaffold in Antigravity — installable, works on mobile browser
- [ ] Onboarding flow (4 screens, fingerprint ID, area selection, location suggest)
- [ ] Home screen UI — status card, nearby areas list, report buttons

### Week 3–4: Core loop
- [ ] Report submission → Supabase insert
- [ ] PostgreSQL trigger for confidence score calculation
- [ ] area_status table update + Realtime sync to frontend
- [ ] Data staleness UI logic (colour fading, grey states)
- [ ] Streak logic (daily increment, midnight reset)
- [ ] Duplicate report guard (5-minute window)

### Week 5–6: Notifications + map
- [ ] Web push setup (VAPID keys, service worker)
- [ ] Notification scheduling (6am / 6pm WAT via Edge Function cron)
- [ ] One-tap report from notification (no app open required)
- [ ] In-app notification history drawer (bell icon, bottom sheet)
- [ ] Leaflet.js map view with area dots + dark/light mode toggle
- [ ] Map dot colours driven by area_status Realtime subscription

### Week 7: Analytics
- [ ] Collapsed analytics bar on home screen
- [ ] Expandable analytics panel (accordion)
- [ ] 7-day supply hours bar chart
- [ ] Outage frequency, current duration, most reliable window queries
- [ ] Minimum data threshold guard ("not enough data yet" state)

### Week 8: Soft launch
- [ ] Seed all 8 Magboro areas in database
- [ ] Distribute via CDA WhatsApp groups
- [ ] Monitor report quality and reliability scores
- [ ] Fix bugs, tune confidence thresholds based on real data

### Phase 2 (post-launch, ~4 weeks after):
- [ ] Pattern computation per area (cron job, weekly recalculation)
- [ ] Prediction display on home screen
- [ ] Probabilistic language engine for prediction copy
- [ ] Grid zone clustering overlay on map (computed from report correlation)

---

*Document version: MVP v1.1*  
*Last updated: June 2026*  
*Product: Up NEPA — Magboro, Ogun State*
