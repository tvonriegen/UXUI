-- Select one freelance proposal atomically, close the opportunity and reject
-- all remaining pending proposals. The authenticated publisher is the only
-- caller allowed to perform the transition.

CREATE OR REPLACE FUNCTION public.accept_freelance_proposal(p_proposal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.opportunity_proposals%ROWTYPE;
  v_opportunity public.opportunities%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal
  FROM public.opportunity_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_proposal.id IS NULL OR v_proposal.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'La propuesta ya fue procesada o no existe.');
  END IF;

  SELECT * INTO v_opportunity
  FROM public.opportunities
  WHERE id = v_proposal.opportunity_id
  FOR UPDATE;

  IF v_opportunity.id IS NULL
     OR v_opportunity.publisher_id <> auth.uid()
     OR v_opportunity.publisher_type <> 'external'
     OR v_opportunity.opportunity_type <> 'freelance'
     OR v_opportunity.status <> 'open' THEN
    RETURN jsonb_build_object('error', 'Encargo no disponible o acceso denegado.');
  END IF;

  UPDATE public.opportunity_proposals
  SET status = 'accepted', updated_at = now()
  WHERE id = v_proposal.id AND status = 'pending';

  WITH rejected AS (
    UPDATE public.opportunity_proposals
    SET status = 'rejected', updated_at = now()
    WHERE opportunity_id = v_opportunity.id
      AND id <> v_proposal.id
      AND status = 'pending'
    RETURNING applicant_id
  )
  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT applicant_id, 'Propuesta revisada',
    'El cliente seleccionó otra propuesta para "' || v_opportunity.title || '".',
    'application', '/freelance'
  FROM rejected;

  UPDATE public.opportunities
  SET status = 'closed', updated_at = now()
  WHERE id = v_opportunity.id;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (v_proposal.applicant_id, '¡Tu propuesta fue aceptada!',
    'Tu propuesta para "' || v_opportunity.title || '" fue seleccionada.',
    'application', '/freelance');

  RETURN jsonb_build_object('success', true, 'opportunity_id', v_opportunity.id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_freelance_proposal(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_freelance_proposal(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
