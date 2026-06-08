-- Update Heavy detailed analytics RPC for expanded dashboard to include intervals and monthly stats
CREATE OR REPLACE FUNCTION public.get_expanded_analytics(p_area_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  WITH ordered_reports AS (
    SELECT 
      status, created_at, created_at::date as report_date,
      LEAD(created_at) OVER (ORDER BY created_at) as next_report_time
    FROM public.reports
    WHERE area_id = p_area_id
  ),
  durations AS (
    SELECT 
      report_date, status, created_at,
      EXTRACT(EPOCH FROM (COALESCE(next_report_time, NOW()) - created_at))/3600.0 AS duration_hours
    FROM ordered_reports
  ),
  daily_stats AS (
    SELECT 
      report_date,
      SUM(duration_hours) FILTER (WHERE status IN ('ON', 'LIKELY_ON')) as on_hours,
      SUM(duration_hours) FILTER (WHERE status IN ('OFF', 'LIKELY_OFF', 'UNSTABLE')) as off_hours,
      COUNT(*) FILTER (WHERE status IN ('OFF', 'LIKELY_OFF', 'UNSTABLE')) as interruptions,
      json_agg(json_build_object(
        'status', status,
        'start_time', created_at,
        'duration_hours', duration_hours
      ) ORDER BY created_at ASC) as intervals
    FROM durations
    WHERE report_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY report_date
  ),
  monthly_stats AS (
    SELECT
      date_trunc('month', report_date)::date as report_month,
      SUM(duration_hours) FILTER (WHERE status IN ('ON', 'LIKELY_ON')) as on_hours,
      SUM(duration_hours) FILTER (WHERE status IN ('OFF', 'LIKELY_OFF', 'UNSTABLE')) as off_hours,
      COUNT(*) FILTER (WHERE status IN ('OFF', 'LIKELY_OFF', 'UNSTABLE')) as interruptions
    FROM durations
    WHERE report_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 year')
    GROUP BY date_trunc('month', report_date)::date
    ORDER BY report_month ASC
  ),
  current_session AS (
    SELECT status, duration_hours
    FROM durations
    ORDER BY created_at DESC
    LIMIT 1
  ),
  longest_streak AS (
    SELECT report_date as streak_date, duration_hours
    FROM durations
    WHERE status IN ('ON', 'LIKELY_ON') AND report_date >= date_trunc('month', CURRENT_DATE)
    ORDER BY duration_hours DESC
    LIMIT 1
  ),
  flash_count AS (
    SELECT COUNT(*) as count
    FROM public.flash_events
    WHERE area_id = p_area_id AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  ),
  total_reports AS (
    SELECT COUNT(*) as count
    FROM public.reports
    WHERE area_id = p_area_id
  )
  SELECT json_build_object(
    'daily_stats', COALESCE((SELECT json_agg(row_to_json(daily_stats)) FROM daily_stats), '[]'::json),
    'monthly_stats', COALESCE((SELECT json_agg(row_to_json(monthly_stats)) FROM monthly_stats), '[]'::json),
    'current_session', (SELECT row_to_json(current_session) FROM current_session),
    'longest_streak', (SELECT row_to_json(longest_streak) FROM longest_streak),
    'flash_count', COALESCE((SELECT count FROM flash_count), 0),
    'total_reports', COALESCE((SELECT count FROM total_reports), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
