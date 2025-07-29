-- Fix NULL handling in get_customer_analytics function
CREATE OR REPLACE FUNCTION public.get_customer_analytics(business_uuid uuid)
 RETURNS TABLE(id uuid, business_id uuid, name text, email text, phone text, address text, notes text, tags text[], created_at timestamp with time zone, updated_at timestamp with time zone, total_spent numeric, total_appointments bigint, avg_order_value numeric, days_since_last_visit numeric, customer_lifetime_value numeric, recency_score integer, frequency_score integer, monetary_score integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate business ownership through RLS - fix ambiguous column references
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = business_uuid AND businesses.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid business access';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.business_id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.notes,
    c.tags,
    c.created_at,
    c.updated_at,
    COALESCE(SUM(a.price), 0) as total_spent,
    COUNT(a.id) as total_appointments,
    CASE 
      WHEN COUNT(a.id) > 0 THEN COALESCE(SUM(a.price), 0) / COUNT(a.id)
      ELSE 0
    END as avg_order_value,
    -- Fix EXTRACT function - handle NULL values properly
    CASE 
      WHEN MAX(a.start_time::DATE) IS NULL THEN 999 
      ELSE EXTRACT(DAY FROM (CURRENT_DATE - MAX(a.start_time::DATE)))::numeric 
    END as days_since_last_visit,
    COALESCE(SUM(a.price), 0) as customer_lifetime_value,
    -- RFM Score calculations - fix EXTRACT usage with NULL handling
    CASE 
      WHEN MAX(a.start_time::DATE) IS NULL THEN 1
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - MAX(a.start_time::DATE)))::numeric <= 30 THEN 5
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - MAX(a.start_time::DATE)))::numeric <= 60 THEN 4
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - MAX(a.start_time::DATE)))::numeric <= 90 THEN 3
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - MAX(a.start_time::DATE)))::numeric <= 180 THEN 2
      ELSE 1
    END as recency_score,
    CASE 
      WHEN COUNT(a.id) >= 10 THEN 5
      WHEN COUNT(a.id) >= 7 THEN 4
      WHEN COUNT(a.id) >= 5 THEN 3
      WHEN COUNT(a.id) >= 3 THEN 2
      WHEN COUNT(a.id) >= 1 THEN 1
      ELSE 0
    END as frequency_score,
    CASE 
      WHEN COALESCE(SUM(a.price), 0) >= 1000 THEN 5
      WHEN COALESCE(SUM(a.price), 0) >= 500 THEN 4
      WHEN COALESCE(SUM(a.price), 0) >= 250 THEN 3
      WHEN COALESCE(SUM(a.price), 0) >= 100 THEN 2
      WHEN COALESCE(SUM(a.price), 0) > 0 THEN 1
      ELSE 0
    END as monetary_score
  FROM public.customers c
  LEFT JOIN public.appointments a ON c.id = a.customer_id 
    AND a.business_id = business_uuid
    AND a.status = 'completed'
  WHERE c.business_id = business_uuid
  GROUP BY c.id, c.business_id, c.name, c.email, c.phone, c.address, c.notes, c.tags, c.created_at, c.updated_at
  ORDER BY total_spent DESC;
END;
$function$;