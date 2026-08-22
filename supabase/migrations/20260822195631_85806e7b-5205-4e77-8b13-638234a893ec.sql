CREATE TABLE public.coinflips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  creator_side text NOT NULL CHECK (creator_side IN ('heads','tails')),
  amount numeric NOT NULL CHECK (amount > 0),
  joiner_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  result text CHECK (result IN ('heads','tails')),
  winner_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.coinflips TO service_role;
ALTER TABLE public.coinflips ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.jackpot_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed')),
  total numeric NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.jackpot_rounds TO service_role;
ALTER TABLE public.jackpot_rounds ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.jackpot_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.jackpot_rounds(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.jackpot_entries TO service_role;
ALTER TABLE public.jackpot_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  kind text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_transactions_member ON public.transactions(member_id, created_at DESC);
CREATE INDEX idx_jackpot_entries_round ON public.jackpot_entries(round_id);
CREATE INDEX idx_coinflips_status ON public.coinflips(status, created_at DESC);

CREATE TRIGGER coinflips_set_updated_at BEFORE UPDATE ON public.coinflips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jackpot_rounds_set_updated_at BEFORE UPDATE ON public.jackpot_rounds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.adjust_balance(_member_id uuid, _delta numeric, _kind text, _note text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.members
     SET balance = balance + _delta
   WHERE id = _member_id
     AND balance + _delta >= 0
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.transactions (member_id, amount, kind, note)
  VALUES (_member_id, _delta, _kind, _note);

  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_balance(uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_balance(uuid, numeric, text, text) TO service_role;