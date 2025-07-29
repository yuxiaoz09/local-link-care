-- Fix the get_customer_tags_with_assignments function to return properly aliased columns
CREATE OR REPLACE FUNCTION public.get_customer_tags_with_assignments(p_customer_id uuid)
 RETURNS TABLE(tag_id uuid, tag_name text, tag_color text, tag_category text)
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
    ct.category as tag_category
  FROM public.customer_tags ct
  INNER JOIN public.customer_tag_assignments cta ON ct.id = cta.tag_id
  WHERE cta.customer_id = p_customer_id
  ORDER BY ct.name;
END;
$function$;

-- Fix the get_business_tags_with_usage function to return properly aliased columns
CREATE OR REPLACE FUNCTION public.get_business_tags_with_usage(p_business_id uuid)
 RETURNS TABLE(tag_id uuid, tag_name text, tag_color text, tag_category text, usage_count integer)
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
$function$;