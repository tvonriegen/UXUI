-- Allow students to describe real technical skills without polluting the
-- canonical skills catalogue. Canonical and custom skills are returned
-- together to the owner and both participate in opportunity matching.

CREATE TABLE IF NOT EXISTS public.user_custom_skills (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  normalized_name TEXT GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, normalized_name)
);

ALTER TABLE public.user_custom_skills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_custom_skills FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_own_technical_skills()
RETURNS TABLE(name TEXT, source TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT sk.name, 'catalog'::TEXT
  FROM public.user_skills us
  JOIN public.skills sk ON sk.id = us.skill_id
  WHERE us.user_id = auth.uid()
  UNION ALL
  SELECT ucs.name, 'custom'::TEXT
  FROM public.user_custom_skills ucs
  WHERE ucs.user_id = auth.uid()
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.replace_own_technical_skills(p_names TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_names TEXT[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND account_type = 'student' AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'only active student accounts can edit technical skills';
  END IF;

  SELECT COALESCE(array_agg(clean_name ORDER BY first_position), ARRAY[]::TEXT[])
  INTO v_names
  FROM (
    SELECT min(ord) AS first_position, min(btrim(raw_name)) AS clean_name
    FROM unnest(COALESCE(p_names, ARRAY[]::TEXT[])) WITH ORDINALITY AS n(raw_name, ord)
    WHERE raw_name IS NOT NULL AND btrim(raw_name) <> ''
    GROUP BY lower(btrim(raw_name))
  ) deduplicated;

  IF cardinality(v_names) > 50 OR EXISTS (
    SELECT 1 FROM unnest(v_names) AS n(name) WHERE char_length(name) > 80
  ) THEN
    RAISE EXCEPTION 'technical skills must contain at most 50 names of 80 characters each';
  END IF;

  DELETE FROM public.user_skills WHERE user_id = v_user_id;
  DELETE FROM public.user_custom_skills WHERE user_id = v_user_id;

  INSERT INTO public.user_skills (user_id, skill_id)
  SELECT v_user_id, sk.id
  FROM unnest(v_names) AS requested(name)
  JOIN public.skills sk ON lower(btrim(sk.name)) = lower(btrim(requested.name))
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_custom_skills (user_id, name)
  SELECT v_user_id, requested.name
  FROM unnest(v_names) AS requested(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.skills sk
    WHERE lower(btrim(sk.name)) = lower(btrim(requested.name))
  )
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_technical_skills() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_own_technical_skills(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_own_technical_skills() TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_own_technical_skills(TEXT[]) TO authenticated;

