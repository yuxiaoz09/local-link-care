-- Fix critical security issues with views and add missing constraints

-- Drop the problematic views that bypass RLS
DROP VIEW IF EXISTS public.customer_analytics;
DROP VIEW IF EXISTS public.revenue_analytics;

-- Create secure RLS-compliant functions to replace the views
CREATE OR REPLACE FUNCTION public.get_customer_analytics(business_uuid uuid)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  name text,
  email text,
  phone text,
  address text,
  notes text,
  tags text[],
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_spent numeric,
  total_appointments bigint,
  avg_order_value numeric,
  days_since_last_visit numeric,
  customer_lifetime_value numeric,
  recency_score integer,
  frequency_score integer,
  monetary_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    COALESCE(EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE)), 999) as days_since_last_visit,
    COALESCE(SUM(a.price), 0) as customer_lifetime_value,
    -- RFM Score calculations
    CASE 
      WHEN COALESCE(EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE)), 999) <= 30 THEN 5
      WHEN COALESCE(EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE)), 999) <= 60 THEN 4
      WHEN COALESCE(EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE)), 999) <= 90 THEN 3
      WHEN COALESCE(EXTRACT(DAY FROM CURRENT_DATE - MAX(a.start_time::DATE)), 999) <= 180 THEN 2
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

-- Add database constraints for data integrity
ALTER TABLE public.businesses 
ADD CONSTRAINT check_business_name_length CHECK (length(name) <= 200),
ADD CONSTRAINT check_business_email_format CHECK (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_business_address_length CHECK (length(address) <= 500);

ALTER TABLE public.customers
ADD CONSTRAINT check_customer_name_length CHECK (length(name) <= 100),
ADD CONSTRAINT check_customer_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_customer_notes_length CHECK (length(notes) <= 2000);

-- Enhance password policies with stronger defaults
ALTER TABLE public.password_policies 
ALTER COLUMN min_length SET DEFAULT 12,
ALTER COLUMN require_uppercase SET DEFAULT true,
ALTER COLUMN require_lowercase SET DEFAULT true,
ALTER COLUMN require_numbers SET DEFAULT true,
ALTER COLUMN require_special_chars SET DEFAULT true,
ALTER COLUMN password_expiry_days SET DEFAULT 60;

-- Add rate limiting table for enhanced security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for rate_limits
CREATE POLICY "Users can manage their own rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_time timestamp with time zone := now();
  window_start timestamp with time zone := current_time - (p_window_minutes || ' minutes')::interval;
  existing_record record;
BEGIN
  -- Get existing rate limit record
  SELECT * INTO existing_record
  FROM public.rate_limits
  WHERE user_id = p_user_id 
    AND action_type = p_action_type
    AND window_start > window_start;

  -- If blocked, check if block period has expired
  IF existing_record.blocked_until IS NOT NULL AND existing_record.blocked_until > current_time THEN
    RETURN false;
  END IF;

  -- If no recent record or window expired, create new record
  IF existing_record IS NULL OR existing_record.window_start <= window_start THEN
    INSERT INTO public.rate_limits (user_id, action_type, attempt_count, window_start)
    VALUES (p_user_id, p_action_type, 1, current_time)
    ON CONFLICT (user_id, action_type) 
    DO UPDATE SET 
      attempt_count = 1,
      window_start = current_time,
      blocked_until = NULL,
      updated_at = current_time;
    RETURN true;
  END IF;

  -- Increment attempt count
  UPDATE public.rate_limits
  SET 
    attempt_count = attempt_count + 1,
    blocked_until = CASE 
      WHEN attempt_count + 1 >= p_max_attempts 
      THEN current_time + (p_window_minutes || ' minutes')::interval
      ELSE NULL
    END,
    updated_at = current_time
  WHERE user_id = p_user_id AND action_type = p_action_type;

  -- Return false if limit exceeded
  RETURN (existing_record.attempt_count + 1) < p_max_attempts;
END;
$function$;

-- Create trigger for updated_at on rate_limits
CREATE TRIGGER update_rate_limits_updated_at
BEFORE UPDATE ON public.rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();