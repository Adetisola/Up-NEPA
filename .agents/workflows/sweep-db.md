---
description: Sweep Database
---

# Sweep Database

**Description**: Wipes all user-generated mock data (reports, users, notifications) and resets the area statuses back to their default state.

## Instructions
When the user invokes this workflow, execute the following SQL script against the database to reset the app data. 

If you have access to the Supabase MCP server (`execute_sql`), run this directly. If not, guide the user to paste this exact snippet into their Supabase Dashboard SQL Editor.

```sql
-- 1. Wipe out all test reports, notifications, users, patterns, and analytics
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE auth.users CASCADE;
TRUNCATE TABLE area_history CASCADE;
TRUNCATE TABLE patterns CASCADE;
TRUNCATE TABLE daily_analytics CASCADE;
TRUNCATE TABLE flash_events CASCADE;

-- 2. Reset the area statuses to their default state
UPDATE area_status 
SET current_status = 'UNCONFIRMED', 
    confidence = 0, 
    report_count = 0, 
    last_updated = NOW();
```

**Post-Sweep Actions:**
- Remind the user that because the database was wiped, they will need to go into their app Settings and toggle Push Notifications off and on again to re-register their device's `push_subscription`.
