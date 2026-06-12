# ⚡ UP NEPA — Full Product Spec (MVP)
> Stack: Antigravity (Frontend) · Supabase (Backend)  
> Scope: Magboro, Ogun State — MVP launch area  
> Team: Solo student project  
> Status: Live on web — active development

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Core Problem](#2-core-problem)
3. [Nigerian Grid Reality](#3-nigerian-grid-reality)
4. [MVP Scope](#4-mvp-scope)
5. [What Constitutes an "Area"](#5-what-constitutes-an-area)
6. [Core Product Principle](#6-core-product-principle)
7. [Data Strategy](#7-data-strategy)
8. [User Identity & Authentication](#8-user-identity--authentication)
9. [Onboarding Flow](#9-onboarding-flow)
10. [Home Area Management](#10-home-area-management)
11. [App Structure & Navigation](#11-app-structure--navigation)
12. [Home Tab](#12-home-tab)
13. [Explore Tab](#13-explore-tab)
14. [Analytics Tab](#14-analytics-tab)
15. [Push Notification System](#15-push-notification-system)
16. [Reporting Flow](#16-reporting-flow)
17. [Flash Supply Detection](#17-flash-supply-detection)
18. [Backend Logic — Status Calculation](#18-backend-logic--status-calculation)
19. [Prediction Engine](#19-prediction-engine-phase-2)
20. [Streak & Engagement Logic](#20-streak--engagement-logic)
21. [Data Staleness Handling](#21-data-staleness-handling)
22. [Hardware Node Tier](#22-hardware-node-tier)
23. [Supabase Schema](#23-supabase-schema)
24. [Full User Loop Summary](#24-full-user-loop-summary)
25. [Build Order](#25-build-order)

---

## 1. Product Vision

Up NEPA is a community-powered, Nigeria-focused web app that tells users:
- Whether power is currently ON or OFF in their sub-feeder area
- When power is likely to return, based on historical patterns

> **"NEPA"** = local Nigerian slang for the electricity authority  
> **"Up"** = light is back / restored

**Long-term vision:**
Up NEPA is building the first community-owned, feeder-level electricity performance database in Nigeria. Over time it becomes a source of structured accountability data — feeder report cards, outage pattern tracking, DISCO performance analysis — that communities, journalists, researchers, and regulators can use. Everything else is a feature on top of that foundation.

---

## 2. Core Problem

Nigerians have no reliable way to know:
- Whether power is currently on in their area
- When it is likely to return after an outage

Current workarounds: asking neighbours, checking WhatsApp groups, physically observing appliances.

**Up NEPA replaces all of that with one tap.**

---

## 3. Nigerian Grid Reality

> **Grounded in a real 30-day supply log from Igodo Community, Magboro — the exact MVP target area.**

### Key data points

| Metric | Value |
|---|---|
| Grid availability | 29.4% |
| Total supply in 30 days | 211 hours, 49 minutes (out of 720 possible) |
| Average daily supply | ~7 hours, 3 minutes |
| Total interruptions | 58 over 30 days |
| Performance rating | E — Critically Deficient |

### Key patterns
- **Extreme daily variance** — 0 hours to 15+ hours. No consistent schedule.
- **Peak stability is nocturnal** — overnight spans of 6–15 continuous hours are common. Daytime is heavily fragmented.
- **Flash supplies** — power events of 1–6 minutes caused by feeder tripping. Damage appliances. Create false positive signals.
- **High fragmentation days** — good total hours but delivered in tiny unusable bursts.

These patterns directly inform flash supply detection, notification timing, prediction honesty requirements, and analytics fragmentation scoring throughout this spec.

---

## 4. MVP Scope

**Target area:** Magboro, Ogun State  
**Platform:** Progressive Web App (PWA) — distributable via WhatsApp link, installable from browser

**MVP feature set:**
- Sub-feeder based live power status
- Lightweight account system (Name + Email + Password or Google OAuth)
- One-tap reporting (notification or in-app)
- Flash supply detection
- Push notifications with fatigue protection
- In-app notification history
- Coverage health indicator
- Sharing trigger (banner card + settings share button)
- 3-tab navigation: Home, Explore, Analytics
- Analytics tab with fragmentation scoring and community benchmarking
- Monthly feeder report cards (Phase 2)
- Prediction engine (Phase 2)
- Hardware node tier (Phase 2)

**Not in MVP:**
- WhatsApp bot
- Charging detection
- Points leaderboard
- Multi-city active reporting (Explore map is viewable anywhere, reporting locked to Magboro at launch)
- Native mobile app

---

## 5. What Constitutes an "Area"

### The definitive answer: an 11kV sub-feeder

```
GenCo (Power Station)
        ↓  330kV / 132kV
TCN Transmission Lines
        ↓  132kV → 33kV
TCN/IBEDC Injection Substation (e.g. Oke-Aro)
        ↓  33kV
IBEDC Primary Feeder (e.g. "IBAFO 33KV")  ← IBEDC's switching/control point
        ↓  33kV → 11kV
IBEDC Distribution Substation
        ↓  11kV
11kV Sub-feeder (e.g. "IGODO II C")  ← Up NEPA's "Area"
        ↓  11kV → 415V
Pole-mounted Distribution Transformer
        ↓  240V
Individual home / meter
```

IBEDC's intentional load-shedding control sits at the 33kV primary feeder level — one switch at Oke-Aro cuts the whole Magboro-Ibafo-Mowe corridor. But the **11kV sub-feeder is where users' lived experience diverges** — a fault on IGODO II C cuts Igodo while a different sub-feeder still has power two streets away.

### Feeder naming in the UI
Use **"Feeder"** in all UI copy. "Sub-feeder" is the internal technical term only. Regular users know the word feeder from their bills.

### How feeder names are discovered
Sub-feeder codes appear on every IBEDC customer bill next to the word "FEEDER" — e.g. `IBAFO 33KV/IGODO II C`. Not published publicly. Discovered by asking residents to check and share the feeder line from their bill — distributed via CDA WhatsApp groups.

### Definition of "neighbour"
> A **neighbour** in Up NEPA is any other user on the **exact same sub-feeder**. All neighbour-triggered notifications, confidence calculations, and analytics are scoped strictly to this definition.

### Test seed data for Magboro (unconfirmed — for development only)

| Feeder Code | Display Name | Likely Streets / Estates |
|---|---|---|
| `IGODO_II_C` | IGODO II C ✓ | Igodo Road, Bankole Estate *(confirmed from real bill)* |
| `IGODO_I` | IGODO I | Igodo Road (eastern section) |
| `MAGBORO_I` | MAGBORO I | Pipeline Road, Oke-Afa Road |
| `MAGBORO_II` | MAGBORO II | Magboro town centre, market area |
| `IBAFO_I` | IBAFO I | Ibafo Road, Asese junction |
| `PREMIER_JCT` | PREMIER JUNCTION | Premier Junction, Kosoko area |
| `OPIC_EST` | OPIC ESTATE | OPIC Estate |
| `LIKOSI_RD` | LIKOSI ROAD | Likosi Road corridor |

> ⚠️ Only `IGODO_II_C` is confirmed. All others are educated guesses. Replace with real confirmed codes before production launch via CDA WhatsApp bill crowdsourcing.

---

## 6. Core Product Principle

> **Live status accuracy is the highest priority in Up NEPA. Always.**

Everything downstream — analytics, predictions, map, hardware — is worthless if the status card on the Home tab is not trusted by users.

If live status becomes unreliable:
- Analytics become unreliable
- Predictions become unreliable
- Maps become unreliable
- User retention drops

This principle governs all build order and prioritisation decisions. When resources are constrained, protect status accuracy first. Delay everything else.

The biggest threat to Up NEPA is not engineering. It is **insufficient reporting density**. Without enough reports per feeder, nothing works. Every product decision should ask: does this increase or protect reporting participation?

---

## 7. Data Strategy

### Primary: Community reports
Users are the sensor network. No passive automatic alternative exists at this budget.

### Cold start: CDA Network
CDA chairman's WhatsApp groups covering Magboro. One message asking residents to share their feeder code from their bill simultaneously recruits users and maps the sub-feeder structure.

**WhatsApp message template:**
> "My son is building a free community app called Up NEPA that will help everyone in Magboro know when light is back in their area — before you even check your switches. To make it work accurately, we need to know which IBEDC feeder each street is on. Please check your IBEDC bill, look for the word FEEDER, and reply with: 1. Your street/estate name 2. What it says after FEEDER. Example: 'Pipeline Road — IGODO II C'. Takes 2 minutes. Thank you 🙏⚡"

### Secondary: DISCO outage schedules
IBEDC occasionally publishes outage notices publicly. Monitor and layer as supplementary signal.

### Long-term: DISCO partnership
Up NEPA's aggregated feeder-level data becomes a credible accountability dataset. Position as community infrastructure, not just a notification app.

### Manual seeding (pre-launch)
Founders log their own street's power status daily for 2–4 weeks. First thin historical dataset for prediction engine.

### Hardware nodes (Phase 2)
ESP32-based devices detecting grid restoration automatically. See Section 22.

---

## 8. User Identity & Authentication

### Account system

**Sign up options:**
- Name + Email + Password
- Continue with Google (OAuth)

**Sign in options:**
- Email + Password
- Continue with Google

**Password recovery:**
- Forgot password → reset link to email
- Google users recover via Google account naturally

### Signup screen:
```
┌─────────────────────────────────┐
│  Create your account            │
│                                 │
│  [ Continue with Google    G  ] │
│                                 │
│  ────────── or ──────────       │
│                                 │
│  Display name                   │
│  [ Timi                       ] │
│                                 │
│  Email                          │
│  [ timi@email.com             ] │
│                                 │
│  Password                       │
│  [ ••••••••                   ] │
│                                 │
│  [ Create Account ]             │
│                                 │
│  Already have one? [ Sign in ]  │
└─────────────────────────────────┘
```

### Implementation
Supabase Auth handles email/password and Google OAuth natively. Google OAuth requires Google Cloud Console credentials + Supabase provider config. Minimal custom code.

### Browser fingerprinting (session persistence layer)
Fingerprinting is retained as a **convenience layer only** — not primary identity. When a returning user opens the app on a device where they are not actively signed in, the fingerprint checks for a matching account and prompts:
> "Welcome back, Timi — sign in to continue?"

Fingerprinting does not replace authentication. It surfaces it.

### UUID
Generated automatically by Supabase Auth on account creation. Never shown to user. Ties all data permanently to the account.

---

## 9. Onboarding Flow

**Triggered immediately after account creation.**  
**4 screens maximum.**

### Screen 1 — Find Your Area

**Step A: Request precise location (one-time)**
> "To find your area, we need your location once. We don't store or track it."  
> `[Allow Location]` · `[Enter Manually]`

**Step B: Auto-detect state and city**
Reverse geocode coordinates. Pre-fill State and City fields. User can correct if wrong.

**Step C: Cascading dropdown selection**

Three dropdowns, each filtered by the previous:

```
State           City / Town        Feeder
┌──────────┐   ┌──────────────┐   ┌──────────────────┐
│ Ogun   ▼ │ → │ Magboro    ▼ │ → │ Select feeder.. ▼│
└──────────┘   └──────────────┘   └──────────────────┘
```

At MVP launch: **Ogun State → Magboro only.** All other states/cities visible but show "Coming soon."

**Feeder dropdown — with street hints:**
```
┌─────────────────────────────────┐
│  Select your feeder             │
│                                 │
│  ○ IGODO II C                   │
│    Igodo Road, Bankole Estate   │
│                                 │
│  ○ MAGBORO I                    │
│    Pipeline Road, Oke-Afa Rd    │
│                                 │
│  ○ MAGBORO II                   │
│    Town centre, market area     │
└─────────────────────────────────┘
```

Streets listed as subtitle under each feeder. User picks by recognising their street. No separate street dropdown.

**If user doesn't know their feeder:**
> "Not sure? Check your IBEDC electricity bill — look for the word FEEDER and see what comes after it."  
> *(Show cropped example bill image with feeder field highlighted)*

**If location denied → manual flow:**
State → City → Feeder dropdowns. No GPS required.

### Screen 2 — Notifications
> "We'll ping you twice a day — you just tap Yes or No. That's it."  
> `[Allow Notifications]` · `[Maybe Later]`

### Screen 3 — You're In
Confirmation screen. Transitions to Home tab.

---

## 10. Home Area Management

### Structure
A user's home area is always three levels:
- **State** (e.g. Ogun)
- **City/Town** (e.g. Magboro)
- **Feeder** (e.g. IGODO II C)

All three together constitute the home area. Changing any one counts as a home area change.

### Changing home area
Accessible via Settings. Used when a user moves to a new location.

### Area history preservation
When a user changes their home area, the previous area is **never deleted**. It is written to the `area_history` table with a timestamp. The backend maintains the full sequence of areas a user has ever been assigned to. The user never sees this history — it is backend-only, used for analytics integrity and future data research value.

### Change friction — progressive cooldown + streak reset

| Change number | Cooldown before next change | Streak impact |
|---|---|---|
| 1st change | 7 days | Resets to 0 |
| 2nd change | 30 days | Resets to 0 |
| 3rd change | 90 days | Resets to 0 |
| 4th+ change | 180 days | Resets to 0 |

### Transparency UI — shown before confirming change:
```
┌─────────────────────────────────┐
│  Change Home Area               │
│                                 │
│  ⚠️ Before you continue:        │
│                                 │
│  · Your streak of 🔥 12 days    │
│    will reset to zero           │
│                                 │
│  · You won't be able to change  │
│    your area again for 30 days  │
│                                 │
│  [ Cancel ]    [ Yes, Change ]  │
└─────────────────────────────────┘
```
Cooldown duration shown is dynamic — reflects which tier applies to that specific user.

---

## 11. App Structure & Navigation

### 3-tab bottom navigation:
```
┌──────────────────────────────────┐
│         [ App Content ]          │
├──────────┬───────────┬───────────┤
│  🏠 Home │ 🔍 Explore│ 📊 Analytics│
└──────────┴───────────┴───────────┘
```

| Tab | Purpose | Area scope |
|---|---|---|
| Home | Daily use — status, reporting | Home feeder only, permanent |
| Explore | Map, search, discover any area | Any area, read-only |
| Analytics | Deep historical data | Home feeder only, permanent |

### Navigation rules:
- Tapping the analytics teaser card on Home **switches to the Analytics tab** — does not open a new screen
- Explore tab never affects home area assignment
- Analytics tab is always locked to home area regardless of what was browsed in Explore

---

## 12. Home Tab

### Header:
```
⚡ UP NEPA        🔥 5    🔔    ⚙️
                (streak) (notifs) (settings)
```

### Cards (top to bottom):

**Card 1 — Live power status:**
```
┌─────────────────────────────────┐
│  YOUR AREA · IGODO II C         │
│                                 │
│  ⚡ LIGHT IS UP                 │
│  Reported by 6 people           │
│  Last update: 8 mins ago        │
│                                 │
│  [ ✅ Confirm ON ]  [❌ It's off]│
└─────────────────────────────────┘
```

**Card 2 — Analytics teaser:**
```
┌─────────────────────────────────┐
│  📊 Today: 4h supply  ↑ vs yday │
│  Tap for full analytics →       │
└─────────────────────────────────┘
```
Tapping switches to Analytics tab.

**Card 3 — Coverage health indicator:**
```
┌─────────────────────────────────┐
│  👥 2 active reporters on your  │
│  feeder. Invite neighbours to   │
│  improve accuracy.              │
│  [ Invite a neighbour ]         │
└─────────────────────────────────┘
```
Shows when active reporter count for the feeder is below 5. Hidden when coverage is sufficient.

**Card 4 — Sharing banner (permanent, last card):**
```
┌─────────────────────────────────┐
│  ⚡ Know someone in Magboro?    │
│  Share Up NEPA — help your      │
│  community track light.         │
│  [ Share the app ]              │
└─────────────────────────────────┘
```
Always visible as the last card. Feels like a natural part of the feed, not an intrusive popup. Share button opens native share sheet with app link.

### Colour language:

| State | Colour | Icon |
|---|---|---|
| Confirmed ON (stable, 10+ min) | Green | ⚡ |
| Likely ON (unconfirmed / possible flash) | Amber | ⚡ |
| Power OFF | Red | 🔴 |
| Unconfirmed / stale | Grey | — |
| Unstable (2+ flash supplies in last hour) | Amber pulsing | ⚡ |

### Status card behaviour:
- Pulses gently on fresh update
- Fades to grey as data gets stale
- Amber auto-resolves to green or red after 10-minute window
- Never shows data older than 6 hours as current

---

## 13. Explore Tab

### Layout:
Full-screen map with floating search bar at top and reactive bottom sheet at bottom.

### Map layer:
- **Base:** Leaflet.js + OpenStreetMap (free, no billing)
- **Dark/light toggle** — top-right corner
- **User dots:** each dot = one user's approximate location, coloured by last report
- **Fuzzy positioning:** plotted within ~200m radius of actual location — clusters visible, individual homes not identifiable
- **Dot colours:** green (ON), amber (unconfirmed), red (OFF), grey (stale)
- **Dot size:** scales with reporter reliability score
- **No drawn boundaries** — feeder zones emerge naturally from dot clustering
- **My Area button:** floating home icon — recentres map on user's home feeder instantly

### Search bar:
```
┌─────────────────────────────────┐
│  🔍  Where do you want to explore? │
└─────────────────────────────────┘
```
Autocomplete suggestions as user types — states, cities, feeder names. Selecting a suggestion animates map zoom to that location.

### Bottom sheet — 3 states:

**Collapsed:**
```
│  📍 Magboro, Ogun State  · 3 feeders in view  ▲  │
```

**Partially expanded — feeder list:**
```
│  📍 Magboro, Ogun State                          │
│  IGODO II C          ⚡ ON    92%  2 reporters   │
│  MAGBORO I           🔴 OFF   87%  5 reporters   │
│  MAGBORO II          ⚪ No data                  │
```
Updates automatically as map viewport changes.

**Fully expanded — single feeder detail:**
Triggered by tapping a feeder row.
```
│  IGODO II C                                  ✕  │
│  Magboro, Ogun State                            │
│  ⚡ LIGHT IS UP · 6 reports · 8 mins ago        │
│  Confidence: 92%                                │
│  ─────────────────────────────────────────────  │
│  📊 Today: 4h · Fragmentation: Moderate         │
│  Outages today: 2 · Most stable: 10pm–7am       │
│  ─────────────────────────────────────────────  │
│  7-day bar chart (mini)                         │
│  [▇][▅][▇][▃][▇][▇][▅]                         │
```
Read-only. No reporting from Explore.

### Browse mode rules:
- Read-only — no reports, no streak impact
- No coverage: "No coverage here yet — share Up NEPA to bring it here"
- Ongoing approximate location: prompted on first Explore open (separate from onboarding). If denied, defaults to home area.

### Location permission model:

| Permission | When | Purpose | Required? |
|---|---|---|---|
| Precise, one-time | Onboarding | Detect home feeder | No — manual fallback |
| Approximate, ongoing | First Explore open | Centre map on current location | No — defaults to home area |

---

## 14. Analytics Tab

**Permanently locked to home feeder. Never changes based on Explore.**

### Header:
```
📊 Analytics — IGODO II C · Magboro, Ogun State
```

### Content:

**1. Current session status**
- ON: "Power has been on for 1h 15min"
- OFF: "Power has been out for 2h 40min"
- Unstable: "⚠️ Unstable — 3 interruptions in the last hour"

**2. Daily supply hours — 7-day bar chart**
- Bar colour: green if above area average, amber if below

**3. Fragmentation score per day**

| Label | Condition |
|---|---|
| Stable | ≤1 interruption, 1–2 continuous blocks |
| Moderate | 2–3 interruptions |
| Fragmented | 4+ interruptions |
| Highly Fragmented | 4+ interruptions with multiple spans under 15 minutes |

**4. Community benchmarking (NEW)**
- "Your feeder received 23% more power than last week"
- "Your feeder performed better than the Magboro average this week"
- Adds social context and accountability framing beyond raw numbers

**5. Average daily supply**
- "Averaging 6.2h/day this week · ↓ 1.4h vs last week"

**6. Most stable time window**
- "Power is most stable overnight (10pm – 7am)"

**7. Outage frequency**
- "3 outages today · Average: 2/day this week"

**8. Flash supply count**
- "3 flash supplies this week (under 10 min each)"
- "⚠️ Short bursts can damage appliances"

**9. Longest uninterrupted supply streak**
- "Longest stretch this month: 8 hours (last Tuesday)"

**10. Prediction (Phase 2)**
- Probabilistic only. Never exact times. See Section 19.

**11. Monthly feeder report card (Phase 2)**
- "IGODO II C received 132 hours of electricity in June — 18.3% availability"
- Shareable card format
- Valuable for CDA presentations to IBEDC

### Minimum data threshold:
< 10 reports for area:
> "Not enough data yet — keep reporting and analytics will appear here 📊"

---

## 15. Push Notification System

### Timing:

| Trigger | Condition |
|---|---|
| Morning window | 6:00am – 7:00am WAT daily |
| Evening window | 7:00pm – 8:00pm WAT daily |
| Stale data | Last confirmed report > 3 hours old |
| Neighbour trigger | Another user on **same feeder** reports status change |
| Flash supply | ON → OFF within 10 minutes on home feeder |

### Notification fatigue protection (NEW):
**Maximum 3 notifications per user per 6-hour window**, regardless of trigger count. If a feeder is highly unstable and flickering, the user receives at most 3 notifications in any 6-hour period. Beyond that, notifications are queued and suppressed until the window resets. This prevents unstable feeders from causing app uninstalls.

### Notification copy:

**Morning check:**
> "Abi light dey your side? Help your neighbours know 👀"  
> `[YES it's up]` · `[NO it's out]`

**Stale data:**
> "Light still dey? Quick confirm for your area 🙏"  
> `[Still ON]` · `[It went off]`

**Neighbour on same feeder reported power:**
> "Someone on your feeder just got light — has it reached you?"  
> `[Yes it has]` · `[Not yet]`

**Flash supply detected:**
> "Quick flash or stable supply? Help your neighbours know 👀"  
> `[Still on]` · `[Went off again]`

### Key rule:
Tapping either button reports directly from notification. **No app open required.**

### Notification performance tracking:
Track per notification type: delivery rate, open rate, response rate, report conversion rate. Use this data to tune timing and copy over time. User behaviour — not assumptions — determines future notification strategy.

### In-app notification history:
- Written to `notifications` table for **all users** including those who declined push
- Bell icon → bottom sheet drawer on Home tab
- Max 30 per user · Purged after 60 days
- Realtime badge update via Supabase subscription

---

## 16. Reporting Flow

### In-app:
- Report button is the most visible element on Home tab
- One tap, no form, no confirmation screen
- Haptic feedback + report count increments visibly

### Duplicate guard (5-minute window):
> "You already confirmed this — we'll ask again soon 👍"

### Conflicting report:
> "Noted — your report has been recorded. Might be a partial outage in your street."

---

## 17. Flash Supply Detection

### What is a flash supply?
Power-on event lasting fewer than 10 minutes before cutting out. Caused by feeder tripping / auto-recloser malfunctions. Damages appliances. Creates false positive ON signals if not filtered.

### Detection logic:
```
ON report received
    ↓
Start 10-minute observation window
    ↓
Within 10 minutes:
    ├── Second ON from different user → promote to Confirmed ON
    ├── OFF report received → log as FLASH_SUPPLY in flash_events
    └── No further reports → hold at LIKELY_ON (amber)
```

### On flash detection:
1. Log to `flash_events` table
2. Exclude from supply duration analytics
3. Exclude from pattern calculations
4. Trigger flash supply notification (subject to fatigue cap)

---

## 18. Backend Logic — Status Calculation

### Weighted confidence formula:
```
Confidence = Weighted ON Reports / Total Weighted Reports

Where:
weight = recency_multiplier × reliability_multiplier × source_multiplier

source_multiplier:
  hardware report = 2.0
  community report = 1.0

recency_multiplier:
  < 30 min = 1.0
  30–60 min = 0.7
  60–90 min = 0.4

reliability_multiplier:
  0.0–1.0 (user's reliability score)
```

This explicit mathematical formula enables easier debugging, tuning, and analytics validation.

### Minimum supply duration threshold:
Single ON report only gets full weight after **10 minutes without a contradicting OFF report**. Before that: `LIKELY_ON`, confidence capped at 0.4.

### Output states:

| State | Condition |
|---|---|
| Confirmed ON | 3+ weighted reports, ON sustained 10+ min, within 90 min |
| Confirmed OFF | 3+ weighted reports agreeing OFF, within 90 min |
| Likely ON | ON reports present but under threshold |
| Likely OFF | Fewer than 3 OFF reports, leaning that way |
| Unstable | 2+ flash events in last hour |
| Unconfirmed | No reports in 2 hours OR conflicting |

### Reporter reliability score (backend only):
Increases with consensus-matching and consistent reporting. Decreases with conflict and suspicious frequency.

### Implementation:
PostgreSQL trigger `recalculate_area_status()` fires `AFTER INSERT` on `reports`. Server-side. No Edge Function latency.

---

## 19. Prediction Engine (Phase 2)

> **Unlocks ~4 weeks post-launch per feeder**

### Honest constraint:
Igodo data shows zero adherence to a recognisable schedule. Probabilistic language is a product integrity requirement.

### Reliability ratings:
Every prediction shown with an explicit confidence label:
- **High confidence** — large sample size, low variance, consistent pattern
- **Medium confidence** — moderate sample, some variance
- **Low confidence** — small sample or high variance

### What the engine tracks:
- Average ON time by day of week
- Average outage/supply duration
- Outage frequency per week
- Overnight stability score
- Daytime fragmentation index

### Display rules:
- "Usually comes back around 7–8pm on weekdays." *(High confidence)*
- "Power in your area doesn't follow a consistent pattern yet." *(Low confidence)*
- "Overnight after 10pm is your most reliable window."

### Hard rule:
❌ `"Power returns at 18:00"`  
✅ `"Usually comes back around evening — roughly 7–8pm"`

---

## 20. Streak & Engagement Logic

### Rules:
- Increments if user reports at least once in 24-hour window
- Resets at midnight if no report
- Resets to 0 on home area change
- Displayed in header passively

### Milestones:

| Streak | Message |
|---|---|
| 3 days | "You're helping your whole street 🙌" |
| 7 days | "One week strong 🔥 Magboro thanks you" |
| 30 days | "You're an Up NEPA legend for this area ⚡" |

---

## 21. Data Staleness Handling

| Age | UI behaviour |
|---|---|
| 0 – 90 min | Full colour, current |
| 90 min – 3 hrs | Slight fade, "last updated X ago" |
| 3 – 6 hrs | Grey, "Unconfirmed — tap to update" |
| 6+ hrs | "No recent data for this area" |

---

## 22. Hardware Node Tier

> **Phase 2 — after software validation is confirmed**

Hardware should amplify a working system, not rescue a struggling one. Before hardware deployment, validate: Are users reporting? Are notifications working? Is retention healthy?

### What it is:
ESP32-based device detecting grid power restoration at mains entry point. Pings Up NEPA backend automatically. No human action required.

### Why grid-specific:
Installed at mains entry point — before generator changeover switch. Same principle as existing NEPA alarm sirens common in Nigerian homes: they only trigger on grid restoration because they're dead during outages.

### Flash supply filtering (firmware):
```
Grid power returns → ESP32 boots
    ↓
Wait 10 seconds
    ↓
Mains still HIGH?
    ├── YES → connect Wi-Fi → POST to Supabase
    └── NO → flash supply, do nothing
```

### Components:

| Component | Cost (NGN) |
|---|---|
| NEPA alarm unit (gutted) OR relay/optocoupler module | ₦2,000–₦4,000 |
| ESP32 development board | ₦3,000–₦6,000 |
| 240V to 5V DC converter | ₦1,500–₦3,000 |
| Wires + PCB strip | ₦500–₦1,000 |
| Plastic enclosure | ₦1,000–₦2,500 |
| **Total per unit** | **₦8,000–₦16,500** |

### Feeder configuration:
Feeder code hardcoded into firmware pre-distribution. Wi-Fi credentials via captive portal on first boot.

### API payload:
```json
{
  "source": "hardware",
  "feeder_code": "IGODO_II_C",
  "status": "ON",
  "device_id": "NODE_001",
  "timestamp": "2026-06-10T18:42:00"
}
```

### Heartbeat:
Pings every 15 minutes while power is on. Powers hardware-confirmed supply hour calculations in Analytics.

### MVP deployment:
Founders deploy one node each in their own homes. Two anchor nodes at launch for under ₦35,000 total.

---

## 23. Supabase Schema

### `users` (managed by Supabase Auth)
```sql
id                uuid primary key        -- Supabase Auth UUID
display_name      text
email             text unique
area_id           uuid references areas(id)   -- current home feeder
reliability       float default 0.5
streak            int default 0
change_count      int default 0               -- home area change number
last_area_change  timestamp                   -- for cooldown calculation
push_subscription jsonb
fingerprint_hash  text                        -- session persistence only
created_at        timestamp default now()
```

### `areas`
```sql
id            uuid primary key default gen_random_uuid()
name          text not null               -- e.g. "IGODO II C"
display_name  text                        -- e.g. "Igodo — Magboro"
feeder_code   text                        -- e.g. "IGODO_II_C"
streets       text[]                      -- known streets on this feeder
city          text
state         text
lat           float
lng           float
created_at    timestamp default now()
```

### `area_history`
```sql
id            uuid primary key default gen_random_uuid()
user_id       uuid references users(id)
area_id       uuid references areas(id)   -- previous area
changed_at    timestamp default now()     -- when they left
change_number int                         -- which change this was (1st, 2nd...)
```

### `reports`
```sql
id            uuid primary key default gen_random_uuid()
user_id       uuid references users(id)   -- null if hardware
area_id       uuid references areas(id)
status        text check (status in ('ON','OFF'))
source        text default 'community'    -- 'community' or 'hardware'
device_id     text                        -- hardware node ID if applicable
created_at    timestamp default now()
```

### `area_status`
```sql
id               uuid primary key default gen_random_uuid()
area_id          uuid references areas(id) unique
current_status   text check (current_status in ('ON','OFF','LIKELY_ON','LIKELY_OFF','UNSTABLE','UNCONFIRMED'))
confidence       float
report_count     int
active_reporters int                      -- reporters active in last 24h
last_updated     timestamp
```

### `flash_events`
```sql
id              uuid primary key default gen_random_uuid()
area_id         uuid references areas(id)
started_at      timestamp
ended_at        timestamp
duration_mins   float
created_at      timestamp default now()
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
> Purge: 60 days. Fetch limit: 30 per user.

### `patterns` (Phase 2)
```sql
id                    uuid primary key default gen_random_uuid()
area_id               uuid references areas(id)
day_of_week           int
avg_on_time           time
avg_off_time          time
avg_duration_on       float
avg_duration_off      float
overnight_stability   float
daytime_frag_index    float
confidence_level      text check (confidence_level in ('high','medium','low'))
sample_size           int
last_computed         timestamp
```

---

## 24. Full User Loop Summary

```
User wakes up
      ↓
6am notification on home feeder
(subject to 3-per-6hr fatigue cap)
      ↓
User taps YES/NO from notification
(no app open required)
      ↓
Report → Supabase
PostgreSQL trigger fires
      ↓
Flash supply check (10-min window)
Weighted confidence score recalculated
      ↓
area_status updated
active_reporters count updated
      ↓
Notification → notifications table
(all users on same feeder)
      ↓
Home tab updates via Realtime
Coverage health indicator updates
Explore dot updates colour
      ↓
Analytics recalculates
supply hours + fragmentation + benchmarking
      ↓
Prediction recalibrates (Phase 2)
      ↓
7pm notification cycle repeats
      ↓
Streak increments if reported today
```

---

## 25. Build Order

### Priority principle:
Status accuracy → Reporting participation → Notifications → Analytics → Predictions → Explore → Hardware

### Week 1–2: Foundation
- [ ] Supabase Auth — email/password + Google OAuth
- [ ] Supabase schema — all tables, RLS, Realtime, seed Magboro feeders
- [ ] PWA scaffold — installable, mobile-first
- [ ] Onboarding — account creation/sign in, location detect, cascading dropdowns, notification permission
- [ ] 3-tab navigation structure

### Week 3–4: Core loop
- [ ] Home tab — status card (amber state), analytics teaser, coverage health indicator, sharing banner
- [ ] Report submission → Supabase
- [ ] PostgreSQL trigger — weighted confidence score + flash detection
- [ ] 10-minute minimum threshold for Confirmed ON
- [ ] area_status + active_reporters Realtime sync
- [ ] Data staleness UI
- [ ] Streak logic (header, increment, midnight reset, area-change reset)
- [ ] Duplicate report guard (5-minute window)

### Week 5–6: Notifications + Explore
- [ ] Web push (VAPID keys, service worker)
- [ ] Notification scheduling (6am + 7pm WAT cron)
- [ ] Notification fatigue cap (3 per 6-hour window)
- [ ] One-tap report from notification
- [ ] Notification performance tracking (delivery/open/response rates)
- [ ] Notification history drawer
- [ ] Explore tab — Leaflet map, fuzzy dot plotting
- [ ] Search autocomplete
- [ ] Viewport-reactive bottom sheet (3 states)
- [ ] My Area snap-back button
- [ ] Dark/light map toggle
- [ ] No coverage state

### Week 7: Analytics + Settings
- [ ] Analytics tab — full content
- [ ] 7-day bar chart
- [ ] Fragmentation score labels
- [ ] Community benchmarking
- [ ] Flash supply count + appliance warning
- [ ] Overnight stability insight
- [ ] Minimum data threshold state
- [ ] Settings — home area change with transparency UI + cooldown logic
- [ ] area_history table writes on change
- [ ] Share button in settings

### Week 8: Soft launch
- [ ] Seed confirmed Magboro feeders (replace test data with real)
- [ ] Distribute via CDA WhatsApp groups
- [ ] Monitor: report density per feeder, notification response rates, retention
- [ ] Tune confidence thresholds and notification timing from real data

### Phase 2 (post-launch):
- [ ] Prediction engine + reliability ratings
- [ ] Monthly feeder report cards (shareable)
- [ ] Hardware node prototype + deployment
- [ ] Hardware heartbeat endpoint + weighting
- [ ] Grid zone clustering overlay on Explore map
- [ ] DISCO partnership pitch using aggregated feeder data

---

*Document version: MVP v1.4*  
*Last updated: June 2026*  
*Product: Up NEPA — Magboro, Ogun State*  
*Key updates in v1.4: Full account system (Name + Email + Password + Google OAuth), home area change system with progressive cooldown + area_history, Core Product Principle section, notification fatigue cap, coverage health indicator, sharing trigger (banner + settings), community benchmarking in analytics, monthly report cards as Phase 2, explicit weighted confidence formula, prediction reliability ratings, test feeder seed data for Magboro, cascading dropdown with street hints, Explore map with active reporter count*
