
-- 1) Role enum + table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- 2) has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Grant admin trigger — only for the fixed verified admin email
CREATE OR REPLACE FUNCTION public.grant_admin_for_fixed_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'tnskillsbatch2025@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_for_fixed_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_fixed_email();

-- Seed if the admin already exists & is verified
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'tnskillsbatch2025@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) login_events
CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL DEFAULT 'login',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own login insert" ON public.login_events;
CREATE POLICY "own login insert" ON public.login_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own login read" ON public.login_events;
CREATE POLICY "own login read" ON public.login_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS login_events_created_at_idx ON public.login_events (created_at DESC);

-- 5) error_logs
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  stack text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert own errors" ON public.error_logs;
CREATE POLICY "insert own errors" ON public.error_logs FOR INSERT
  TO authenticated WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "admin read errors" ON public.error_logs;
CREATE POLICY "admin read errors" ON public.error_logs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs (created_at DESC);

-- 6) suspended flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- 7) Admin analytics functions (SECURITY DEFINER, gated by has_role)
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _today date := (now() AT TIME ZONE 'utc')::date; _res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'new_users_today', (SELECT count(*) FROM auth.users WHERE created_at::date = _today),
    'dau', (SELECT count(DISTINCT user_id) FROM public.login_events WHERE created_at::date = _today),
    'logins_today', (SELECT count(*) FROM public.login_events WHERE created_at::date = _today),
    'chats_today', (SELECT count(*) FROM public.messages WHERE role='user' AND created_at::date = _today),
    'image_gen_today', (SELECT coalesce(sum(count),0) FROM public.usage_counters WHERE kind='image_gen' AND day = _today),
    'image_edit_today', (SELECT coalesce(sum(count),0) FROM public.usage_counters WHERE kind='image_edit' AND day = _today),
    'errors_today', (SELECT count(*) FROM public.error_logs WHERE created_at::date = _today)
  ) INTO _res;
  RETURN _res;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_daily_series(_days int DEFAULT 30)
RETURNS TABLE(day date, users int, logins int, chats int, image_gen int, image_edit int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH d AS (
    SELECT generate_series(((now() AT TIME ZONE 'utc')::date - (_days-1)), (now() AT TIME ZONE 'utc')::date, interval '1 day')::date AS day
  )
  SELECT d.day,
    (SELECT count(*)::int FROM auth.users u WHERE u.created_at::date = d.day),
    (SELECT count(*)::int FROM public.login_events l WHERE l.created_at::date = d.day),
    (SELECT count(*)::int FROM public.messages m WHERE m.role='user' AND m.created_at::date = d.day),
    (SELECT coalesce(sum(count),0)::int FROM public.usage_counters WHERE kind='image_gen' AND usage_counters.day = d.day),
    (SELECT coalesce(sum(count),0)::int FROM public.usage_counters WHERE kind='image_edit' AND usage_counters.day = d.day)
  FROM d ORDER BY d.day;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_daily_series(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_daily_series(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_model_usage(_days int DEFAULT 30)
RETURNS TABLE(kind text, total int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT usage_counters.kind, coalesce(sum(count),0)::int
  FROM public.usage_counters
  WHERE day >= ((now() AT TIME ZONE 'utc')::date - (_days-1))
  GROUP BY usage_counters.kind ORDER BY 2 DESC;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_model_usage(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_model_usage(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE(id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz, suspended boolean, is_admin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at,
         coalesce(p.suspended,false),
         public.has_role(u.id, 'admin')
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE _search IS NULL OR u.email ILIKE '%'||_search||'%' OR p.display_name ILIKE '%'||_search||'%'
  ORDER BY u.created_at DESC LIMIT _limit;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_suspended(_user_id uuid, _suspended boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET suspended = _suspended, updated_at = now() WHERE id = _user_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recent_logins(_limit int DEFAULT 50)
RETURNS TABLE(id uuid, user_id uuid, email text, event text, user_agent text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT l.id, l.user_id, u.email::text, l.event, l.user_agent, l.created_at
  FROM public.login_events l JOIN auth.users u ON u.id = l.user_id
  ORDER BY l.created_at DESC LIMIT _limit;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_recent_logins(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_logins(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recent_errors(_limit int DEFAULT 50)
RETURNS TABLE(id uuid, user_id uuid, source text, message text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT e.id, e.user_id, e.source, e.message, e.created_at
  FROM public.error_logs e ORDER BY e.created_at DESC LIMIT _limit;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_recent_errors(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_errors(int) TO authenticated;
