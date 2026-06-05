# ⚡ UP NEPA — Full Product Spec (MVP)
> Stack: Antigravity (Frontend) · Supabase (Backend)  
> Scope: Magboro, Ogun State — MVP launch area  
> Team: Solo / 2-person student project

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Core Problem](#2-core-problem)
3. [MVP Scope](#3-mvp-scope)
4. [Data Strategy](#4-data-strategy)
5. [Push Notification System](#5-push-notification-system)
6. [Home Screen UI](#6-home-screen-ui)
7. [Reporting Flow](#7-reporting-flow)
8. [Backend Logic — Status Calculation](#8-backend-logic--status-calculation)
9. [Prediction Engine](#9-prediction-engine-phase-2)
10. [Onboarding Flow](#10-onboarding-flow)
11. [Streak & Engagement Logic](#11-streak--engagement-logic)
12. [Data Staleness Handling](#12-data-staleness-handling)
13. [Supabase Schema](#13-supabase-schema)
14. [Full User Loop Summary](#14-full-user-loop-summary)
15. [Build Order](#15-build-order)

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

### Grid zone mapping:
- Do NOT attempt to pre-map transformer zones
- Let user reports reveal natural clustering over time
- Streets that consistently report power together = same transformer zone
- The data tells you the map

---

## 5. Push Notification System

### When notifications are sent (backend trigger logic):

| Trigger | Condition |
|---|---|
| Morning window | 6:00am – 7:00am daily |
| Evening window | 6:00pm – 7:00pm daily |
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

---

## 6. Home Screen UI

### Layout (top to bottom):

```
┌─────────────────────────────────┐
│  UP NEPA              🔔  👤   │
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

## 7. Reporting Flow

### In-app reporting:
- Report button is the **single most visible element** on home screen
- One tap. No confirmation screen. No form.
- Haptic feedback on tap
- Report count increments visibly in real time

### Duplicate report guard:
If user tries to report same status twice within 30 minutes:
> "You already confirmed this — we'll ask again later 👍"

### Conflicting report handling:
If user reports a status that conflicts with majority consensus (e.g. 5 say ON, they say OFF):
> "Noted — your report has been recorded. Might be a partial outage in your street."

This keeps conflicting reporters feeling heard while protecting data integrity.

---

## 8. Backend Logic — Status Calculation

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

---

## 9. Prediction Engine (Phase 2)

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

## 10. Onboarding Flow

**Maximum 4 screens. No account creation at MVP.**

| Screen | Content |
|---|---|
| 1 | "Welcome to Up NEPA" · "Know when light is coming — before it arrives" · `[Get Started]` |
| 2 | "Where do you stay?" · Dropdown: select area within Magboro (street / estate level) |
| 3 | "Allow notifications" · "We'll ping you twice a day — you just tap Yes or No. That's it." · `[Allow]` · `[Maybe later]` |
| 4 | "You're in." · Goes straight to home screen with live status |

**No email. No password. No friction.**  
Device ID is sufficient to track reports and streaks at MVP stage.

---

## 11. Streak & Engagement Logic

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

## 12. Data Staleness Handling

| Age of last report | UI behaviour |
|---|---|
| 0 – 90 minutes | Full colour, shown as current |
| 90 min – 3 hours | Slight visual fade, "last updated X ago" label |
| 3 – 6 hours | Grey, labelled "Unconfirmed — tap to update" |
| Over 6 hours | "No recent data for this area" |

The UI communicates data confidence visually. Users never have to think about it.

---

## 13. Supabase Schema

### `users`
```sql
id            uuid primary key default gen_random_uuid()
device_id     text unique not null
area_id       uuid references areas(id)
reliability   float default 0.5        -- 0.0 to 1.0
streak        int default 0
last_reported timestamp
created_at    timestamp default now()
```

### `areas`
```sql
id            uuid primary key default gen_random_uuid()
name          text not null             -- e.g. "Magboro — Pipeline Road"
city          text default 'Magboro'
state         text default 'Ogun'
lat           float
lng           float
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
area_id          uuid references areas(id)
current_status   text check (current_status in ('ON', 'OFF', 'LIKELY_ON', 'LIKELY_OFF', 'UNCONFIRMED'))
confidence       float                   -- 0.0 to 1.0
report_count     int
last_updated     timestamp
```

### `patterns` (Phase 2 — prediction engine)
```sql
id              uuid primary key default gen_random_uuid()
area_id         uuid references areas(id)
day_of_week     int                      -- 0 = Sunday, 6 = Saturday
avg_on_time     time                     -- average time power comes ON
avg_off_time    time                     -- average time power goes OFF
avg_duration_on float                   -- average hours of supply
avg_duration_off float                  -- average hours of outage
sample_size     int                     -- number of data points used
last_computed   timestamp
```

### Supabase features to use:
- **Realtime** — subscribe to `area_status` changes so home screen updates live without refresh
- **Edge Functions** — run confidence score calculation on new report insert
- **Row Level Security** — users can only write their own reports
- **Push notifications** — use Supabase Edge Functions + web push (VAPID keys) for notification delivery

---

## 14. Full User Loop Summary

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
Edge Function fires
      ↓
Confidence score
recalculated for area
      ↓
area_status table updated
      ↓
All users in that area
see updated status via
Supabase Realtime
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

## 15. Build Order

### Week 1–2: Foundation
- [ ] Supabase project setup — schema, RLS policies, Realtime enabled
- [ ] PWA scaffold in Antigravity — installable, works on mobile browser
- [ ] Onboarding flow (4 screens, device ID, area selection)
- [ ] Home screen UI — status card, nearby areas list, report buttons

### Week 3–4: Core loop
- [ ] Report submission → Supabase insert
- [ ] Confidence score calculation (Edge Function)
- [ ] area_status table update + Realtime sync to frontend
- [ ] Data staleness UI logic (colour fading, grey states)
- [ ] Streak logic (daily increment, midnight reset)

### Week 5–6: Notifications
- [ ] Web push setup (VAPID keys, service worker)
- [ ] Notification scheduling (6am / 6pm triggers via Edge Function cron)
- [ ] One-tap report from notification (no app open required)
- [ ] Neighbour trigger notification logic

### Week 7–8: Soft launch
- [ ] Seed 3–4 areas in Magboro manually
- [ ] Distribute via CDA WhatsApp groups
- [ ] Monitor report quality and reliability scores
- [ ] Fix bugs, tune confidence thresholds based on real data

### Phase 2 (post-launch, ~4 weeks after):
- [ ] Pattern computation per area (cron job, weekly recalculation)
- [ ] Prediction display on home screen
- [ ] Probabilistic language engine for prediction copy

---

*Document version: MVP v1.0*  
*Last updated: June 2026*  
*Product: Up NEPA — Magboro, Ogun State*
