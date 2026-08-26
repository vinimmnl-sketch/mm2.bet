CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  author text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages (created_at DESC);

CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(_key text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cur integer;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start, updated_at)
  VALUES (_key, 1, now(), now())
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN public.rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN 1
          ELSE public.rate_limits.count + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN now()
          ELSE public.rate_limits.window_start
        END,
        updated_at = now()
  RETURNING count INTO cur;

  RETURN cur <= _limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;