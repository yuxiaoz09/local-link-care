-- Security Hardening Migration: Fix Security Definer Functions and Search Paths

-- Fix search_path for existing functions that were flagged by the linter
-- These functions need explicit search_path settings to prevent privilege escalation

-- Update get_customer_segment function with secure search_path
CREATE OR REPLACE FUNCTION public.get_customer_segment(r_score integer, f_score integer, m_score integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Explicit search_path already set in function signature for security
  
  -- RFM Segmentation logic
  IF r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN
    RETURN 'Champions';
  ELSIF r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN
    RETURN 'Loyal';
  ELSIF r_score >= 3 AND f_score <= 2 THEN
    RETURN 'At-Risk';
  ELSIF r_score <= 2 AND f_score <= 2 THEN
    RETURN 'Lost';
  ELSIF r_score >= 4 AND f_score <= 1 THEN
    RETURN 'New';
  ELSE
    RETURN 'Potential';
  END IF;
END;
$function$;

-- Update get_best_customer_period function with secure search_path
CREATE OR REPLACE FUNCTION public.get_best_customer_period(business_uuid uuid, start_date date, end_date date)
 RETURNS TABLE(customer_id uuid, customer_name text, customer_email text, customer_phone text, total_spent numeric, appointment_count bigint, last_visit date)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid business access';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    COALESCE(SUM(a.price), 0) as total_spent,
    COUNT(a.id) as appointment_count,
    MAX(a.start_time::DATE) as last_visit
  FROM public.customers c
  LEFT JOIN public.appointments a ON c.id = a.customer_id 
    AND a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
    AND a.status = 'completed'
  WHERE c.business_id = business_uuid
  GROUP BY c.id, c.name, c.email, c.phone
  ORDER BY total_spent DESC, appointment_count DESC
  LIMIT 1;
END;
$function$;

-- Update get_revenue_period function with secure search_path
CREATE OR REPLACE FUNCTION public.get_revenue_period(business_uuid uuid, start_date date, end_date date)
 RETURNS TABLE(total_revenue numeric, appointment_count bigint, avg_transaction_value numeric, unique_customers bigint)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid business access';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(a.price), 0) as total_revenue,
    COUNT(a.id) as appointment_count,
    CASE 
      WHEN COUNT(a.id) > 0 THEN COALESCE(SUM(a.price), 0) / COUNT(a.id)
      ELSE 0
    END as avg_transaction_value,
    COUNT(DISTINCT a.customer_id) as unique_customers
  FROM public.appointments a
  WHERE a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
    AND a.status = 'completed';
END;
$function$;

-- Update get_appointments_period function with secure search_path
CREATE OR REPLACE FUNCTION public.get_appointments_period(business_uuid uuid, start_date date, end_date date)
 RETURNS TABLE(appointment_id uuid, customer_name text, appointment_title text, start_time timestamp with time zone, end_time timestamp with time zone, status text, price numeric)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid business access';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    c.name,
    a.title,
    a.start_time,
    a.end_time,
    a.status,
    a.price
  FROM public.appointments a
  LEFT JOIN public.customers c ON a.customer_id = c.id
  WHERE a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
  ORDER BY a.start_time ASC;
END;
$function$;

-- Update get_at_risk_customers function with secure search_path
CREATE OR REPLACE FUNCTION public.get_at_risk_customers(business_uuid uuid, days_threshold integer DEFAULT 30)
 RETURNS TABLE(customer_id uuid, customer_name text, customer_email text, customer_phone text, days_since_last_visit integer, total_spent numeric, last_visit_date date)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid business access';
  END IF;

  -- Validate days_threshold parameter
  IF days_threshold < 1 OR days_threshold > 365 THEN
    RAISE EXCEPTION 'Invalid days_threshold: must be between 1 and 365';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE))::INTEGER as days_since_last_visit,
    COALESCE(SUM(a.price), 0) as total_spent,
    MAX(a.start_time::DATE) as last_visit_date
  FROM public.customers c
  LEFT JOIN public.appointments a ON c.id = a.customer_id 
    AND a.business_id = business_uuid
    AND a.status = 'completed'
  WHERE c.business_id = business_uuid
  GROUP BY c.id, c.name, c.email, c.phone
  HAVING MAX(a.start_time::DATE) < CURRENT_DATE - (days_threshold || ' days')::INTERVAL 
    OR MAX(a.start_time::DATE) IS NULL
  ORDER BY days_since_last_visit DESC NULLS FIRST;
END;
$function$;

-- Update log_analytics_access function with secure search_path
CREATE OR REPLACE FUNCTION public.log_analytics_access(p_action text, p_resource text, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate inputs
  IF p_action IS NULL OR LENGTH(TRIM(p_action)) = 0 THEN
    RAISE EXCEPTION 'Action cannot be null or empty';
  END IF;

  IF p_resource IS NULL OR LENGTH(TRIM(p_resource)) = 0 THEN
    RAISE EXCEPTION 'Resource cannot be null or empty';
  END IF;

  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    TRIM(p_action),
    TRIM(p_resource),
    p_details,
    NOW()
  );
END;
$function$;

-- Update update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Explicit search_path already set in function signature for security
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add security comment for documentation
COMMENT ON FUNCTION public.get_customer_segment(integer, integer, integer) IS 'Security hardened: explicit search_path set to prevent privilege escalation';
COMMENT ON FUNCTION public.get_best_customer_period(uuid, date, date) IS 'Security hardened: explicit search_path and business ownership validation';
COMMENT ON FUNCTION public.get_revenue_period(uuid, date, date) IS 'Security hardened: explicit search_path and business ownership validation';
COMMENT ON FUNCTION public.get_appointments_period(uuid, date, date) IS 'Security hardened: explicit search_path and business ownership validation';
COMMENT ON FUNCTION public.get_at_risk_customers(uuid, integer) IS 'Security hardened: explicit search_path and business ownership validation';
COMMENT ON FUNCTION public.log_analytics_access(text, text, jsonb) IS 'Security hardened: explicit search_path for secure audit logging';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Security hardened: explicit search_path for secure timestamp updates';