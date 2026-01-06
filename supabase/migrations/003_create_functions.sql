-- Migration 003: Helper Functions

CREATE OR REPLACE FUNCTION update_contact_stage(p_contact_id UUID, p_new_stage funnel_stage, p_user_id UUID)
RETURNS public.contacts AS $$
DECLARE v_contact public.contacts;
BEGIN
  UPDATE public.contacts SET funnel_stage = p_new_stage, updated_at = NOW()
  WHERE id = p_contact_id AND user_id = p_user_id RETURNING * INTO v_contact;
  RETURN v_contact;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_touchpoint(p_contact_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.contacts SET total_touchpoints = total_touchpoints + 1, last_contact_date = NOW(), updated_at = NOW()
  WHERE id = p_contact_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_contact_with_history(p_contact_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'contact', (SELECT row_to_json(c.*) FROM public.contacts c WHERE c.id = p_contact_id AND c.user_id = p_user_id),
    'communications', (SELECT json_agg(row_to_json(comm.*) ORDER BY comm.sent_at DESC) FROM public.communications comm WHERE comm.contact_id = p_contact_id AND comm.user_id = p_user_id),
    'generated_messages', (SELECT json_agg(row_to_json(gm.*) ORDER BY gm.created_at DESC) FROM public.generated_messages gm WHERE gm.contact_id = p_contact_id AND gm.user_id = p_user_id),
    'journey_plan', (SELECT row_to_json(jp.*) FROM public.journey_plans jp WHERE jp.contact_id = p_contact_id AND jp.user_id = p_user_id AND jp.is_active = TRUE LIMIT 1)
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_contacts', (SELECT COUNT(*) FROM public.contacts WHERE user_id = p_user_id AND is_archived = FALSE),
    'contacts_by_stage', (SELECT json_object_agg(funnel_stage, count) FROM (SELECT funnel_stage, COUNT(*) as count FROM public.contacts WHERE user_id = p_user_id AND is_archived = FALSE GROUP BY funnel_stage) sc),
    'contacts_by_goal', (SELECT json_object_agg(relationship_goal, count) FROM (SELECT relationship_goal, COUNT(*) as count FROM public.contacts WHERE user_id = p_user_id AND is_archived = FALSE GROUP BY relationship_goal) gc),
    'messages_this_month', (SELECT COUNT(*) FROM public.generated_messages WHERE user_id = p_user_id AND created_at >= DATE_TRUNC('month', NOW())),
    'followups_due', (SELECT COUNT(*) FROM public.contacts WHERE user_id = p_user_id AND is_archived = FALSE AND next_action_date IS NOT NULL AND next_action_date <= NOW())
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_limits(p_user_id UUID, p_check_type TEXT)
RETURNS JSON AS $$
DECLARE v_user public.users; v_current_count INTEGER; v_limit INTEGER; v_can_create BOOLEAN;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF p_check_type = 'contacts' THEN
    SELECT COUNT(*) INTO v_current_count FROM public.contacts WHERE user_id = p_user_id AND is_archived = FALSE;
    v_limit := v_user.contacts_limit;
  ELSIF p_check_type = 'messages' THEN
    v_current_count := v_user.messages_used_this_month;
    v_limit := v_user.messages_limit;
  END IF;
  v_can_create := v_current_count < v_limit;
  RETURN json_build_object('can_create', v_can_create, 'current_count', v_current_count, 'limit', v_limit, 'remaining', v_limit - v_current_count, 'subscription_tier', v_user.subscription_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_message_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users SET messages_used_this_month = messages_used_this_month + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_contacts(p_user_id UUID, p_query TEXT, p_stage funnel_stage DEFAULT NULL, p_goal relationship_goal DEFAULT NULL, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS SETOF public.contacts AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.contacts
  WHERE user_id = p_user_id AND is_archived = FALSE
    AND (p_query IS NULL OR name ILIKE '%' || p_query || '%' OR company ILIKE '%' || p_query || '%' OR email ILIKE '%' || p_query || '%')
    AND (p_stage IS NULL OR funnel_stage = p_stage)
    AND (p_goal IS NULL OR relationship_goal = p_goal)
  ORDER BY updated_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
