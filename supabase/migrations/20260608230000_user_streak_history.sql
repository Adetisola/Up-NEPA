-- Migration: User Streak History
-- Creates an RPC to get a user's recent report dates to visualize their streak

CREATE OR REPLACE FUNCTION public.get_user_streak_history(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Get distinct dates the user has reported on in the last 7 days
  SELECT COALESCE(json_agg(DISTINCT created_at::date ORDER BY created_at::date DESC), '[]'::json)
  INTO v_result
  FROM public.reports
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  RETURN v_result;
END;
$$;
