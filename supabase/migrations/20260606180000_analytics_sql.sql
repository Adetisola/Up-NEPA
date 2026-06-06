-- Migration to update recalculate_patterns with exact chronological uptime calculation

CREATE OR REPLACE FUNCTION public.recalculate_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Create a temporary view of the reports ordered chronologically
  -- We use LEAD to find the timestamp of the NEXT report in the same area.
  -- If there is no next report, we assume the state lasts until NOW() if it was ON, or just stops.
  WITH ordered_reports AS (
    SELECT 
      area_id,
      status,
      created_at,
      created_at::date as report_date,
      extract(dow from created_at)::int as day_of_week,
      LEAD(created_at) OVER (PARTITION BY area_id ORDER BY created_at) as next_report_time
    FROM public.reports
  ),
  durations AS (
    SELECT 
      area_id,
      report_date,
      day_of_week,
      status,
      -- Calculate hours between this report and the next. 
      -- If this is the latest report and it's ON, assume it's ON until NOW().
      EXTRACT(EPOCH FROM (
        COALESCE(next_report_time, CASE WHEN status = 'ON' THEN NOW() ELSE created_at END) - created_at
      ))/3600.0 AS duration_hours
    FROM ordered_reports
  ),
  -- 2. Aggregate the total ON duration for each specific calendar date
  daily_totals AS (
    SELECT 
      area_id,
      report_date,
      day_of_week,
      SUM(duration_hours) FILTER (WHERE status = 'ON' OR status = 'LIKELY_ON') as on_hours,
      SUM(duration_hours) FILTER (WHERE status = 'OFF' OR status = 'LIKELY_OFF') as off_hours,
      COUNT(*) as reports_on_day
    FROM durations
    GROUP BY area_id, report_date, day_of_week
  ),
  -- 3. Average the daily totals across days of the week (e.g. average of all Mondays)
  pattern_averages AS (
    SELECT
      area_id,
      day_of_week,
      AVG(on_hours) as avg_on,
      AVG(off_hours) as avg_off,
      SUM(reports_on_day) as total_samples
    FROM daily_totals
    GROUP BY area_id, day_of_week
  )
  -- 4. Upsert into the patterns table
  INSERT INTO public.patterns (area_id, day_of_week, avg_duration_on, avg_duration_off, sample_size, last_computed)
  SELECT 
    area_id, 
    day_of_week, 
    avg_on, 
    avg_off, 
    total_samples, 
    now()
  FROM pattern_averages
  ON CONFLICT (area_id, day_of_week) 
  DO UPDATE SET 
    avg_duration_on = EXCLUDED.avg_duration_on,
    avg_duration_off = EXCLUDED.avg_duration_off,
    sample_size = EXCLUDED.sample_size,
    last_computed = EXCLUDED.last_computed;
END;
$$;
