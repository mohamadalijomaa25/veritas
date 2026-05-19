CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_preview TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  classical_verdict TEXT NOT NULL,
  classical_confidence NUMERIC NOT NULL,
  ml_verdict TEXT NOT NULL,
  ml_confidence NUMERIC NOT NULL,
  transformer_verdict TEXT NOT NULL,
  transformer_confidence NUMERIC NOT NULL,
  suspicious_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read analyses" ON public.analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert analyses" ON public.analyses FOR INSERT WITH CHECK (true);

CREATE INDEX analyses_created_at_idx ON public.analyses (created_at DESC);