# ⚡ UP NEPA — Full Product Spec (MVP)
> Stack: Antigravity (Frontend) · Supabase (Backend)  
> Scope: Magboro, Ogun State — MVP launch area  
> Team: Solo / 2-person student project  
> Status: Live on web — active development

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Core Problem](#2-core-problem)
3. [Nigerian Grid Reality](#3-nigerian-grid-reality)
4. [MVP Scope](#4-mvp-scope)
5. [Data Strategy](#5-data-strategy)
6. [User Identity System](#6-user-identity-system)
7. [Push Notification System](#7-push-notification-system)
8. [Home Screen UI](#8-home-screen-ui)
9. [Map Visualization](#9-map-visualization)
10. [Analytics Dashboard](#10-analytics-dashboard)
11. [Reporting Flow](#11-reporting-flow)
12. [Flash Supply Detection](#12-flash-supply-detection)
13. [Backend Logic — Status Calculation](#13-backend-logic--status-calculation)
14. [Prediction Engine](#14-prediction-engine-phase-2)
15. [Onboarding Flow](#15-onboarding-flow)
16. [Streak & Engagement Logic](#16-streak--engagement-logic)
17. [Data Staleness Handling](#17-data-staleness-handling)
18. [Supabase Schema](#18-supabase-schema)
19. [Full User Loop Summary](#19-full-user-loop-summary)
20. [Build Order](#20-build-order)

---

## 1. Product Vision

Up NEPA is a community-powered, Nigeria-focused web app that tells users:
- Whether power is currently ON or OFF in their area
- When power is likely to return, based on historical patterns

> **"NEPA"** = local Nigerian slang for the electricity authority  
> **"Up"** = light is back / restored

The product is **not** primarily a reporting tool. It is a **real-time electricity awareness and prediction system**. Reporting is only the mechanism that feeds it.

Beyond individual utility, Up NEPA is **community accountability infrastructure** — it converts informal, anecdotal power complaints into structured, timestamped, area-level data that communities can use to hold DISCOs like IBEDC accountable.

---

## 2. Core Problem

Nigerians have no reliable way to know:
- Whether power is currently on in their area
- When it is likely to return after an outage

Current workarounds: asking neighbours, checking WhatsApp groups, physically observing appliances.

**Up NEPA replaces all of that with one tap.**

---

## 3. Nigerian Grid Reality

> **This section is grounded in a real 30-day supply log from Igodo Community, Magboro — the exact MVP target area. It directly shapes product decisions throughout this spec.**

### What the data shows

A manually logged 30-day IBEDC supply analysis for Igodo, Magboro revealed:

| Metric | Value |
|---|---|
| Grid availability | 29.4% |
| Total supply in 30 days | 211 hours, 49 minutes (out of 720 possible) |
| Average daily supply | ~7 hours, 3 minutes |
| Total interruptions | 58 over 30 days |
| Performance rating | E — Critically Deficient |

### Key patterns identified

**1. Extreme daily variance**
Daily supply ranged from a total blackout (0 hours) to 15+ continuous hours. There is no consistent load-shedding schedule. Standard deviation between days is massive, making simple time-of-day prediction unreliable.

**2. Peak stability is nocturnal**
Overnight supply (10pm – 8am) is significantly more stable than daytime. Overnight spans of 6–15 continuous hours were recorded on multiple days (Day 2: 6h 49m, Day 6: 11h 57m, Day 22: 15h 10m). Daytime supply is heavily fragmented with constant interruptions.

**3. Flash supplies are a real and destructive phenomenon**
A significant portion of interruptions are "flash supplies" — power events lasting 1–6 minutes. Examples: Day 9 (1 min), Day 2 (3 min), Day 19 (5 min), Day 1 (6 min). These sub-10-minute cycles point to feeder tripping and auto-recloser malfunctions. They actively damage resident appliances and create false positive signals in any reporting system.

**4. High fragmentation days**
Day 12 had the highest fragmentation: 5 separate power events delivering a total of 12h 37m — but useless for sustained activity because of constant interruption. Day 27 had 4 interruptions delivering only 1h 55m total.

### What this means for Up NEPA

These patterns directly inform:
- Flash supply detection logic (Section 12)
- Notification timing adjustments (Section 7)
- Prediction engine honesty requirements (Section 14)
- Analytics fragmentation score (Section 10)
- Minimum supply duration threshold before confirming ON status (Section 13)

---

## 4. MVP Scope

**Target area:** Magboro, Ogun State  
**Platform:** Progressive Web App (PWA) — distributable via WhatsApp link, installable from browser  
**Why PWA over native app:** No app store friction. Users click a link and it works. Critical for distribution via CDA WhatsApp groups.

**MVP feature set:**
- Area-based live power status (per street/estate in Magboro)
- One-tap reporting (via notification or in-app)
- Flash supply detection and flagging
- Push notifications for status check-ins
- In-app notification history (bell icon drawer)
- Map visualization of power status across Magboro
- Collapsed analytics dashboard on home screen (with fragmentation score)
- Basic streak mechanic to encourage habitual reporting
- Prediction display (Phase 2 — unlocks after ~4 weeks of data)

**What is NOT in MVP:**
- WhatsApp bot integration
- Charging detection / passive signals
- Points leaderboard
- Multi-city support
- Native mobile app

---

## 5. Data Strategy

### Primary data source: Community reports
Users are the sensor network. There is no passive or automatic alternative at this budget and scope.

### Cold start solution: CDA Network
- The CDA (Community Development Association) chairman for the area has WhatsApp groups covering multiple parts of Magboro
- Initial users are recruited through these groups — community trust transfers directly to early adoption
- Target: 20–30 seed reporters across at least 3–4 distinct streets at launch

### Secondary data source (pursue in parallel): DISCO outage schedules
- IBEDC covers Ogun State and occasionally publishes load shedding schedules
- Monitor their website and social media
- Manually or automatically layer this as a signal on top of user reports when available
- **DISCO partnership angle:** Up NEPA is a natural fit for communities already building structured power accountability data to present to IBEDC. Position the product as community accountability infrastructure — this framing makes DISCO data sharing or partnership a credible long-term pitch

### Manual seeding (pre-launch):
- Founders log their own street's power status daily for 2–4 weeks before launch
- This becomes the first thin historical dataset for the prediction engine
- Reference: the Igodo 30-day log demonstrates exactly this approach is viable

### Grid zone mapping (emergent — not pre-defined):
- Do NOT attempt to pre-map transformer zones before launch
- Let user reports reveal natural clustering over time
- Streets that consistently report power ON and OFF together belong to the same transformer zone
- The system detects these clusters automatically from report correlation data
- Detected zones inform map visualization groupings over time
- The data tells you the map — not the other way around

---

## 6. User Identity System

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

## 7. Push Notification System

### When notifications are sent (backend trigger logic):

| Trigger | Condition |
|---|---|
| Morning window | 6:00am – 7:00am WAT daily |
| Evening window | 7:00pm – 8:00pm WAT daily |
| Stale data | Last confirmed report for user's area is older than 3 hours |
| Neighbour trigger | Adjacent area just reported a status change |
| Flash supply detected | ON report followed by OFF report within 10 minutes |

> **Note on evening window timing:** Based on Igodo supply log data, power restoration events in Magboro cluster heavily between 5pm–8pm. The original 6pm window is shifted to 7pm–8pm to better capture actual restoration moments and reduce false-check notifications.

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

**Flash supply detected:**
> "Quick flash or stable supply? Help your neighbours know if light is still on 👀"  
> `[Still on]` · `[Went off again]`

### Key rule:
**Tapping either button reports directly from the notification. No app open required.**

This is the single most important UX decision in the product. If users must open the app to report, drop-off is immediate.

### In-app notification history:
- All notifications are written to the `notifications` table for **all users** — including those who declined push permission
- Users who declined push can still see their notification history via the bell icon drawer
- Notifications older than 60 days are automatically purged
- Maximum 30 notifications fetched per user at a time

---

## 8. Home Screen UI

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
│   around 7-8pm in your area"    │
│  Confidence: Pretty confident   │
├─────────────────────────────────┤
│  🔥 You've reported 5 days      │
│     in a row. Keep it up!       │
└─────────────────────────────────┘
```

### Colour language:

| State | Colour | Icon |
|---|---|---|
| Power ON (stable, 10+ min) | Green | ⚡ |
| Power ON (unconfirmed / possible flash) | Amber | ⚡ |
| Power OFF | Red | 🔴 |
| Unconfirmed / stale | Grey | — |

> **Amber state is new:** When a single ON report arrives but less than 10 minutes have elapsed without a confirming second report or contradicting OFF report, the status shows as amber "Possible — unconfirmed" rather than full green. This prevents flash supplies from registering as false confirmed ON events.

### Status card behaviour:
- Pulses gently on fresh update
- Fades to grey as data gets stale
- Never shows data older than 6 hours as current — defaults to "Unconfirmed" label
- Amber state auto-resolves to green (confirmed) or red (flash supply) after 10-minute window

---

## 9. Map Visualization

### Purpose
Allow users to see power status across Magboro visually — not just as a list. Over time, the map will reveal natural transformer zone clusters based on report correlation.

### Location access policy
- Location permission is requested **once** during onboarding to pre-select the user's area from the preset list
- Location is used only to suggest the closest area — it is not stored, not tracked, and not used after onboarding
- The map visualization uses **area coordinates** (from the `areas` table), not the user's live location
- This must be communicated clearly to the user during the location permission prompt:
> "We only use your location once to suggest your area. We don't store or track it."

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
| 🟢 Green dot | Area currently reporting power ON (stable, confirmed) |
| 🟡 Amber dot | Area reporting possible power ON — unconfirmed or possible flash |
| 🔴 Red dot | Area currently reporting power OFF |
| ⚪ Grey dot | Unconfirmed / no recent data |

- Dot size scales with report confidence (more reports = larger, more opaque dot)
- Tapping a dot shows a popup: area name, current status, report count, last updated time, today's fragmentation score
- User's own area is highlighted with a distinct ring or outline

**Grid zone clustering (Phase 2):**
- As report correlation data accumulates, areas that consistently share the same status get visually grouped with a soft boundary overlay
- This boundary is computed, not manually drawn — it emerges from the data

### Map placement in UI
- Accessible via a **"Map" tab** in the bottom navigation or a map icon on the home screen
- Not on the home screen itself — home screen stays focused on the user's own area status
- Map is a secondary view, not the primary one

---

## 10. Analytics Dashboard

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

**2. Current session duration**
- If power is currently OFF: "Power has been out for 2h 40min"
- If power is currently ON (stable): "Power has been on for 1h 15min"
- If flash supply detected: "⚠️ Unstable — 3 interruptions in the last hour"

**3. Fragmentation score (NEW — informed by Igodo data)**
- Displayed as a simple label per day: **Stable / Moderate / Fragmented / Highly Fragmented**
- Derived from number of interruptions per day relative to total supply hours
- Tooltip/explainer: "Fragmented means power came in short bursts rather than one continuous block — even if total hours look okay"

| Label | Condition |
|---|---|
| Stable | ≤1 interruption, supply in 1–2 continuous blocks |
| Moderate | 2–3 interruptions |
| Fragmented | 4+ interruptions |
| Highly Fragmented | 4+ interruptions with multiple spans under 15 minutes |

**4. Average daily supply (this area)**
- "Your area gets an average of 6.2 hours of power per day this week"
- Compared against last week: "↓ 1.4h vs last week"

**5. Most stable time window**
- "Power is most stable in your area overnight (10pm – 7am)"
- Derived from historical ON reports clustered by hour of day
- Note: per Igodo data, overnight stability is the norm — this insight is genuinely useful to surface

**6. Outage frequency**
- "Your area has had 3 outages today"
- "Average: 2 outages per day this week"

**7. Longest uninterrupted supply streak**
- "Longest stretch without outage this month: 8 hours (last Tuesday)"

**8. Flash supply count (NEW)**
- "3 flash supplies detected this week (under 10 minutes each)"
- "These short bursts can damage appliances — unplug sensitive electronics during unstable periods"

### Data source for analytics
All analytics are derived from the `reports` table — specifically the timestamps and status values of ON/OFF transitions per area. Flash supply events are sourced from the `flash_events` table (see schema). Queries run on demand when the panel expands, not on page load.

### Important constraint
Analytics only display when sufficient data exists (minimum 10 reports for that area). Below that threshold, show:
> "Not enough data yet for your area — keep reporting and analytics will appear here 📊"

---

## 11. Reporting Flow

### In-app reporting:
- Report button is the **single most visible element** on home screen
- One tap. No confirmation screen. No form.
- Haptic feedback on tap
- Report count increments visibly in real time

### Duplicate report guard:
If user tries to report the same status twice within **5 minutes**:
> "You already confirmed this — we'll ask again soon 👍"

5 minutes is sufficient to prevent accidental double-taps while still allowing rapid status changes to be captured. Power can return and cut within minutes in Magboro — a longer guard would suppress legitimate reports.

### Conflicting report handling:
If user reports a status that conflicts with majority consensus (e.g. 5 say ON, they say OFF):
> "Noted — your report has been recorded. Might be a partial outage in your street."

This keeps conflicting reporters feeling heard while protecting data integrity.

---

## 12. Flash Supply Detection

> **This section is new — directly informed by the Igodo 30-day supply log which identified sub-10-minute power events as a significant pattern in Magboro.**

### What is a flash supply?
A flash supply is a power-on event that lasts fewer than 10 minutes before cutting out again. In Igodo, examples include 1-minute, 3-minute, 5-minute, and 6-minute supply spans. These are caused by feeder tripping and auto-recloser malfunctions — not genuine power restoration. They damage appliances and create noise in any reporting system.

### Why flash supplies are a data problem
If a user reports "Light is UP" during a 3-minute flash, the confidence score spikes incorrectly. When power cuts 3 minutes later, the system has a false ON event logged, corrupting analytics and prediction data.

### Detection logic (backend):

```
ON report received for area X
    ↓
Start 10-minute observation window
    ↓
Within 10 minutes:
    ├── Second ON report from different user → promote to Confirmed ON
    ├── OFF report received → flag as FLASH_SUPPLY event
    └── No further reports → hold at LIKELY_ON (amber), do not confirm
```

### Flash supply record:
When a flash supply is detected, the backend:
1. Logs a row in the `flash_events` table with start time, end time, and duration
2. Does NOT count this as a clean ON/OFF cycle in pattern analytics
3. Does NOT increment the ON supply duration counter
4. Triggers a flash supply notification to area users (see Section 7)

### UI treatment:
- Flash supply events show in analytics as a separate count — not mixed into supply hours
- Status card shows amber "Unstable" state when 2+ flash supplies detected in the last hour
- Tooltip available: "Power has been flickering — not stable enough to confirm"

---

## 13. Backend Logic — Status Calculation

### Per-area confidence score inputs:

| Input | Weight |
|---|---|
| Number of reports in last 2 hours | High |
| Ratio of ON vs OFF reports | High |
| Recency of each report | Medium (newer = more weight) |
| Reporter reliability score | Medium |
| Flash supply flag | Modifier — suppresses ON confirmation |

### Minimum supply duration threshold (NEW):
A single ON report only receives full confidence weight after **10 minutes have elapsed** without a contradicting OFF report. Before that threshold:
- Status = `LIKELY_ON` (amber in UI)
- Confidence score is capped at 0.4 regardless of report count

This directly addresses the flash supply problem — a 3-minute power flicker will never reach `Confirmed ON` status.

### Output states:

| State | Condition |
|---|---|
| **Confirmed ON** | 3+ weighted reports agreeing power ON, sustained 10+ min, in last 90 mins |
| **Confirmed OFF** | 3+ weighted reports agreeing power OFF in last 90 mins |
| **Likely ON** | ON reports present but under 10-minute threshold OR fewer than 3 reports |
| **Likely OFF** | Fewer than 3 OFF reports but leaning that way |
| **Unstable** | 2+ flash supply events detected in last hour |
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

## 14. Prediction Engine (Phase 2)

> **Unlocks after approximately 4 weeks of data accumulation per area**

### Honest acknowledgement from real data:
The Igodo 30-day supply log shows zero adherence to a recognisable load-shedding schedule. Daily supply ranged from 0 to 15+ hours with no consistent pattern. This means the prediction engine **must not over-promise**. Soft, probabilistic language is not just a nice-to-have — it is a product integrity requirement for Magboro specifically.

### What the engine tracks per area:
- Average time power comes ON by day of week
- Average duration of outages
- Average duration of power supply windows
- Frequency of outages per week
- **Overnight stability score** — probability that power will remain stable between 10pm–7am (typically high in Magboro)
- **Daytime fragmentation index** — how often daytime supply is interrupted (typically high)

### Display rules:

**Before power returns:**
> "Your area usually gets light around 7–8pm on weekdays. That's in about 2 hours."

**Outage longer than historical average:**
> "This outage is running longer than usual for your area. No reliable estimate available yet."

**High variance area (standard deviation too wide to predict):**
> "Power in your area doesn't follow a consistent pattern yet. Keep reporting — predictions improve with more data."

**Insufficient data:**
> "Not enough data for your area yet — help us by reporting daily"

**Overnight stability insight (always shown when available):**
> "Your area is most reliable overnight. If you need stable power, evenings after 10pm are your best window."

### Critical rule — never show hard times:
❌ `"Power returns at 18:00"`  
✅ `"Usually comes back around evening — roughly 7–8pm based on past patterns"`

A wrong hard prediction destroys trust permanently. Soft probabilistic language preserves credibility. This is especially important for Magboro where variance is extreme.

---

## 15. Onboarding Flow

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

## 16. Streak & Engagement Logic

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

## 17. Data Staleness Handling

| Age of last report | UI behaviour |
|---|---|
| 0 – 90 minutes | Full colour, shown as current |
| 90 min – 3 hours | Slight visual fade, "last updated X ago" label |
| 3 – 6 hours | Grey, labelled "Unconfirmed — tap to update" |
| Over 6 hours | "No recent data for this area" |

The UI communicates data confidence visually. Users never have to think about it.

---

## 18. Supabase Schema

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
current_status   text check (current_status in ('ON', 'OFF', 'LIKELY_ON', 'LIKELY_OFF', 'UNSTABLE', 'UNCONFIRMED'))
confidence       float                       -- 0.0 to 1.0
report_count     int
last_updated     timestamp
```

### `flash_events` (NEW)
```sql
id              uuid primary key default gen_random_uuid()
area_id         uuid references areas(id)
started_at      timestamp                    -- time of ON report
ended_at        timestamp                    -- time of OFF report
duration_mins   float                        -- computed: ended_at - started_at in minutes
created_at      timestamp default now()
```
> Flash events are logged when an ON report is followed by an OFF report within 10 minutes.  
> These are excluded from supply duration analytics and pattern calculations.

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
id                    uuid primary key default gen_random_uuid()
area_id               uuid references areas(id)
day_of_week           int                         -- 0 = Sunday, 6 = Saturday
avg_on_time           time                        -- average time power comes ON
avg_off_time          time                        -- average time power goes OFF
avg_duration_on       float                       -- average hours of supply
avg_duration_off      float                       -- average hours of outage
overnight_stability   float                       -- probability of stable overnight supply (0.0–1.0)
daytime_frag_index    float                       -- average interruptions per daytime hour
sample_size           int                         -- number of data points used
last_computed         timestamp
```

### Supabase features to use:
- **Realtime** — subscribe to `area_status` and `notifications` changes live
- **PostgreSQL triggers** — status calculation and flash event detection fire server-side on report insert
- **Row Level Security** — users can only write and read their own data
- **Edge Functions + cron** — push notification scheduling at 6am WAT and 7pm WAT
- **x-device-id header** — passed with every request for anonymous RLS enforcement

---

## 19. Full User Loop Summary

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
Flash supply check runs
(was there an ON → OFF
within 10 minutes?)
      ↓
Confidence score
recalculated for area
(10-minute threshold applied)
      ↓
area_status table updated
(ON / LIKELY_ON / UNSTABLE)
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
and fragmentation score
      ↓
Map dot updates colour
for that area
(green / amber / red)
      ↓
Prediction engine
recalibrates pattern
(Phase 2)
      ↓
7pm notification
cycle repeats
      ↓
Streak increments
if user reported today
```

---

## 20. Build Order

### Week 1–2: Foundation
- [ ] Supabase project setup — schema, RLS policies, Realtime enabled
- [ ] Browser fingerprint identity system + recovery code generation
- [ ] PWA scaffold in Antigravity — installable, works on mobile browser
- [ ] Onboarding flow (4 screens, fingerprint ID, area selection, location suggest)
- [ ] Home screen UI — status card (with amber state), nearby areas list, report buttons

### Week 3–4: Core loop
- [ ] Report submission → Supabase insert
- [ ] PostgreSQL trigger for confidence score calculation
- [ ] 10-minute minimum threshold logic for Confirmed ON state
- [ ] Flash supply detection trigger → `flash_events` table insert
- [ ] area_status table update + Realtime sync to frontend
- [ ] Data staleness UI logic (colour fading, grey states, amber state)
- [ ] Streak logic (daily increment, midnight reset)
- [ ] Duplicate report guard (5-minute window)

### Week 5–6: Notifications + map
- [ ] Web push setup (VAPID keys, service worker)
- [ ] Notification scheduling (6am + 7pm WAT via Edge Function cron)
- [ ] One-tap report from notification (no app open required)
- [ ] Flash supply notification trigger
- [ ] In-app notification history drawer (bell icon, bottom sheet)
- [ ] Leaflet.js map view with area dots (green / amber / red / grey) + dark/light mode toggle
- [ ] Map dot colours driven by area_status Realtime subscription
- [ ] Map popup with fragmentation info per area

### Week 7: Analytics
- [ ] Collapsed analytics bar on home screen
- [ ] Expandable analytics panel (accordion)
- [ ] 7-day supply hours bar chart
- [ ] Fragmentation score per day (Stable / Moderate / Fragmented / Highly Fragmented)
- [ ] Flash supply count display with appliance warning
- [ ] Overnight stability insight display
- [ ] Outage frequency, current session duration queries
- [ ] Minimum data threshold guard ("not enough data yet" state)

### Week 8: Soft launch
- [ ] Seed all 8 Magboro areas in database
- [ ] Distribute via CDA WhatsApp groups
- [ ] Monitor report quality, flash event frequency, reliability scores
- [ ] Fix bugs, tune confidence thresholds and flash detection window based on real data

### Phase 2 (post-launch, ~4 weeks after):
- [ ] Pattern computation per area (cron job, weekly recalculation)
- [ ] Overnight stability score + daytime fragmentation index per area
- [ ] Prediction display on home screen (with honest variance acknowledgement)
- [ ] Probabilistic language engine for prediction copy
- [ ] Grid zone clustering overlay on map (computed from report correlation)
- [ ] DISCO partnership pitch deck using aggregated anonymised Up NEPA data

---

*Document version: MVP v1.2*  
*Last updated: June 2026*  
*Product: Up NEPA — Magboro, Ogun State*  
*Key update in v1.2: Nigerian grid reality section added, flash supply detection system, notification timing adjusted, amber UI state, fragmentation analytics, overnight stability metric — all informed by real 30-day Igodo Community IBEDC supply log*
