-- Drop and recreate the get_business_tags_with_usage function with correct return types
DROP FUNCTION IF EXISTS public.get_business_tags_with_usage(uuid);

CREATE OR REPLACE FUNCTION public.get_business_tags_with_usage(p_business_id uuid)
 RETURNS TABLE(tag_id uuid, tag_name character varying, tag_color character varying, tag_category character varying, usage_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id as tag_id,
    ct.name as tag_name,
    ct.color as tag_color,
    ct.category as tag_category,
    ct.usage_count
  FROM public.customer_tags ct
  WHERE ct.business_id = p_business_id
  ORDER BY ct.usage_count DESC, ct.name;
END;
$function$