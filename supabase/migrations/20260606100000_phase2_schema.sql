-- Phase 2 Schema Additions

-- 1. Identity & Recovery Code
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS recovery_code text UNIQUE;

-- 2. Map Coordinates
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS lat float;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS lng float;

-- Update mock coordinates for Magboro areas (roughly centered around 6.7214, 3.4243)
UPDATE public.areas SET lat = 6.7214 + (random() * 0.005 - 0.0025), lng = 3.4243 + (random() * 0.005 - 0.0025);

-- 3. Prediction Engine (Patterns table)
CREATE TABLE IF NOT EXISTS public.patterns (
    id uuid primary key default gen_random_uuid(),
    area_id uuid references public.areas(id) not null,
    day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6),
    avg_on_time time,
    avg_off_time time,
    avg_duration_on float,
    avg_duration_off float,
    sample_size int default 0,
    last_computed timestamp default now()
);

-- Unique constraint for area and day
CREATE UNIQUE INDEX IF NOT EXISTS unique_area_day ON public.patterns (area_id, day_of_week);

-- 4. Prediction Engine Cron Function
CREATE OR REPLACE FUNCTION public.recalculate_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.patterns (area_id, day_of_week, sample_size, last_computed)
  SELECT area_id, extract(dow from created_at)::int, count(*), now()
  FROM public.reports
  GROUP BY area_id, extract(dow from created_at)
  ON CONFLICT (area_id, day_of_week) 
  DO UPDATE SET sample_size = EXCLUDED.sample_size, last_computed = EXCLUDED.last_computed;
END;
$$;

-- Note: To fully automate recalculate_patterns(), we would run:
-- SELECT cron.schedule('0 0 * * *', $$SELECT public.recalculate_patterns()$$);
-- (We omit the pg_cron creation here to avoid permission issues, and will call this function via Edge Functions or manual triggers if pg_cron is unavailable).
