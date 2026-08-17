CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  allow_direct_messages BOOLEAN NOT NULL DEFAULT TRUE,
  show_gpa BOOLEAN NOT NULL DEFAULT FALSE,
  internship_fair_visible BOOLEAN NOT NULL DEFAULT TRUE,
  notify_matches BOOLEAN NOT NULL DEFAULT TRUE,
  notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
  notify_badges BOOLEAN NOT NULL DEFAULT TRUE,
  notify_social BOOLEAN NOT NULL DEFAULT FALSE,
  notify_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_email BOOLEAN NOT NULL DEFAULT FALSE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  compact_view BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
CREATE POLICY user_preferences_select_own ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
CREATE POLICY user_preferences_insert_own ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
CREATE POLICY user_preferences_update_own ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

REVOKE ALL ON public.user_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

CREATE OR REPLACE FUNCTION private.allows_direct_messages(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT COALESCE((SELECT allow_direct_messages FROM public.user_preferences WHERE user_id = p_user_id), TRUE);
$$;
REVOKE ALL ON FUNCTION private.allows_direct_messages(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.allows_direct_messages(UUID) TO authenticated;

ALTER POLICY conversations_insert_participant ON public.conversations
  WITH CHECK (((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id)
    AND private.can_converse(user1_id, user2_id)
    AND private.allows_direct_messages(user1_id)
    AND private.allows_direct_messages(user2_id));

ALTER POLICY messages_insert_participant ON public.messages
  WITH CHECK ((select auth.uid()) = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.user1_id = (select auth.uid()) OR c.user2_id = (select auth.uid()))
      AND private.can_converse(c.user1_id, c.user2_id)
      AND private.allows_direct_messages(c.user1_id)
      AND private.allows_direct_messages(c.user2_id)
  ));

ALTER POLICY interviews_insert_company ON public.interviews
  WITH CHECK (
    (select auth.uid()) = company_id AND status = 'proposed'
    AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.id = interviews.application_id AND ja.applicant_id = interviews.student_id
        AND (EXISTS (SELECT 1 FROM public.job_postings jp WHERE jp.id = ja.job_id AND jp.company_id = (select auth.uid()) AND jp.company_id = interviews.company_id)
          OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = ja.opportunity_id AND o.publisher_type = 'company' AND o.publisher_id = (select auth.uid()) AND o.publisher_id = interviews.company_id))
    )
    AND private.can_converse(company_id, student_id)
    AND private.allows_direct_messages(company_id)
    AND private.allows_direct_messages(student_id)
  );
NOTIFY pgrst, 'reload schema';
