-- Enable Row Level Security
ALTER TABLE public.politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create Policies for public read access
-- Since this is a public platform, all data in the 'public' schema should be readable by anyone.
CREATE POLICY "Allow public read access on politicians" ON public.politicians FOR SELECT USING (true);
CREATE POLICY "Allow public read access on integrity_scores" ON public.integrity_scores FOR SELECT USING (true);
CREATE POLICY "Allow public read access on bills" ON public.bills FOR SELECT USING (true);
CREATE POLICY "Allow public read access on votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow public read access on expenses" ON public.expenses FOR SELECT USING (true);

-- Ensure internal_data is also protected (even if not exposed via PostgREST)
ALTER TABLE internal_data.politician_identifiers ENABLE ROW LEVEL SECURITY;
-- No public policies for internal_data — only accessible via service_role or pipeline_admin
