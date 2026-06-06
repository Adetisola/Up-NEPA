-- Enable RLS on patterns table
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

-- Allow public read access to patterns so the client can query them for analytics
CREATE POLICY "Allow public read access to patterns"
ON public.patterns FOR SELECT
USING (true);
