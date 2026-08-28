CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  invoice_id text,
  payment_id text UNIQUE,
  pay_currency text,
  price_amount numeric NOT NULL,
  tokens numeric NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tokens numeric NOT NULL,
  usd_amount numeric NOT NULL,
  currency text NOT NULL,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.deposits TO service_role;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE INDEX deposits_member_idx ON public.deposits(member_id);
CREATE INDEX withdrawals_member_idx ON public.withdrawals(member_id);

CREATE TRIGGER deposits_set_updated_at BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER withdrawals_set_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();