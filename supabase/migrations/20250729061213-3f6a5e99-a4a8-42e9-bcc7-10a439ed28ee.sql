-- Add debugging function to test auth.uid() directly
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
 RETURNS TABLE(auth_user_id uuid, auth_role text, session_info jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as auth_user_id,
    auth.role() as auth_role,
    jsonb_build_object(
      'current_setting_user_id', current_setting('request.jwt.claims', true)::jsonb->>'sub',
      'current_setting_role', current_setting('request.jwt.claims', true)::jsonb->>'role',
      'current_setting_email', current_setting('request.jwt.claims', true)::jsonb->>'email'
    ) as session_info;
END;
$function$;