
CREATE TABLE public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, day)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own usage read"
  ON public.usage_counters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_usage(_kind text, _limit integer)
RETURNS TABLE(used integer, remaining integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'utc')::date;
  _new_count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.usage_counters(user_id, kind, day, count)
  VALUES (_uid, _kind, _today, 0)
  ON CONFLICT (user_id, kind, day) DO NOTHING;

  SELECT c.count INTO _new_count
  FROM public.usage_counters c
  WHERE c.user_id = _uid AND c.kind = _kind AND c.day = _today
  FOR UPDATE;

  IF _new_count >= _limit THEN
    RAISE EXCEPTION 'DAILY_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.usage_counters
    SET count = count + 1, updated_at = now()
    WHERE user_id = _uid AND kind = _kind AND day = _today
    RETURNING count INTO _new_count;

  RETURN QUERY SELECT _new_count, GREATEST(0, _limit - _new_count), _limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_usage(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_usage(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_usage(_kind text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT count FROM public.usage_counters
    WHERE user_id = auth.uid()
      AND kind = _kind
      AND day = (now() AT TIME ZONE 'utc')::date
  ), 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_usage(text) TO authenticated;
