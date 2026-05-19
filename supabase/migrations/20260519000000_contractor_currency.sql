ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NZD'
  CHECK (currency = ANY (ARRAY['NZD','USD','AUD','CAD','GBP']));
