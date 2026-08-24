CREATE TYPE public.app_role AS ENUM ('admin', 'player');

CREATE TABLE public.member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, role)
);

GRANT ALL ON public.member_roles TO service_role;

ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to member roles"
  ON public.member_roles FOR SELECT TO authenticated
  USING (false);

INSERT INTO public.member_roles (member_id, role)
SELECT id, 'admin'::public.app_role FROM public.members WHERE discord_username = 'IDom'
ON CONFLICT DO NOTHING;