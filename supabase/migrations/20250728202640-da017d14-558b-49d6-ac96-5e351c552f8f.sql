-- Security Fix Migration: Remove SECURITY DEFINER and fix SQL injection
-- Phase 1: Critical Database Security Fixes

-- Drop existing SECURITY DEFINER functions
DROP FUNCTION IF EXISTS public.get_best_customer_period(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_revenue_period(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_appointments_period(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_at_risk_customers(uuid, integer);

-- Recreate functions without SECURITY DEFINER, using proper RLS
CREATE OR REPLACE FUNCTION public.get_best_customer_period(
  business_uuid UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_spent NUMERIC,
  appointment_count BIGINT,
  last_visit DATE
) AS $$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
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
  FROM customers c
  LEFT JOIN appointments a ON c.id = a.customer_id 
    AND a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
    AND a.status = 'completed'
  WHERE c.business_id = business_uuid
  GROUP BY c.id, c.name, c.email, c.phone
  ORDER BY total_spent DESC, appointment_count DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_revenue_period(
  business_uuid UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  total_revenue NUMERIC,
  appointment_count BIGINT,
  avg_transaction_value NUMERIC,
  unique_customers BIGINT
) AS $$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
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
  FROM appointments a
  WHERE a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
    AND a.status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_appointments_period(
  business_uuid UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  appointment_id UUID,
  customer_name TEXT,
  appointment_title TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT,
  price NUMERIC
) AS $$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
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
  FROM appointments a
  LEFT JOIN customers c ON a.customer_id = c.id
  WHERE a.business_id = business_uuid
    AND a.start_time::DATE BETWEEN start_date AND end_date
  ORDER BY a.start_time ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fixed SQL injection vulnerability with proper parameterization
CREATE OR REPLACE FUNCTION public.get_at_risk_customers(
  business_uuid UUID,
  days_threshold INTEGER DEFAULT 30
) RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  days_since_last_visit INTEGER,
  total_spent NUMERIC,
  last_visit_date DATE
) AS $$
BEGIN
  -- Validate business ownership through RLS
  IF NOT EXISTS (
    SELECT 1 FROM businesses 
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
  FROM customers c
  LEFT JOIN appointments a ON c.id = a.customer_id 
    AND a.business_id = business_uuid
    AND a.status = 'completed'
  WHERE c.business_id = business_uuid
  GROUP BY c.id, c.name, c.email, c.phone
  HAVING MAX(a.start_time::DATE) < CURRENT_DATE - (days_threshold || ' days')::INTERVAL 
    OR MAX(a.start_time::DATE) IS NULL
  ORDER BY days_since_last_visit DESC NULLS FIRST;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enhanced security audit logging function
CREATE OR REPLACE FUNCTION public.log_analytics_access(
  p_action TEXT,
  p_resource TEXT,
  p_details JSONB DEFAULT NULL::JSONB
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;