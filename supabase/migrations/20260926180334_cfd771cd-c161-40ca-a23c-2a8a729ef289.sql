REVOKE EXECUTE ON FUNCTION public.governance_guard() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.governance_audit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.version_guard() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_roles() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_transition(uuid, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_created_by() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_action_for(text, text) FROM public, anon;