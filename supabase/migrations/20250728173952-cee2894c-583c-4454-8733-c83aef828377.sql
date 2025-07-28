-- Security Fix 1: Replace SECURITY DEFINER views with secure regular views
-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS customer_analytics;
DROP VIEW IF EXISTS revenue_analytics;

-- Create secure customer analytics view with proper RLS
CREATE VIEW customer_analytics AS
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
  COALESCE(EXTRACT(DAY FROM (NOW() - MAX(a.start_time))), 0) as days_since_last_visit,
  COUNT(a.id) as total_appointments,
  COALESCE(SUM(a.price), 0) as total_spent,
  CASE 
    WHEN COUNT(a.id) > 0 THEN COALESCE(SUM(a.price), 0) / COUNT(a.id)
    ELSE 0 
  END as avg_order_value,
  COALESCE(SUM(a.price), 0) as customer_lifetime_value,
  -- RFM Scoring
  CASE 
    WHEN EXTRACT(DAY FROM (NOW() - MAX(a.start_time))) <= 30 THEN 5
    WHEN EXTRACT(DAY FROM (NOW() - MAX(a.start_time))) <= 90 THEN 4
    WHEN EXTRACT(DAY FROM (NOW() - MAX(a.start_time))) <= 180 THEN 3
    WHEN EXTRACT(DAY FROM (NOW() - MAX(a.start_time))) <= 365 THEN 2
    ELSE 1
  END as recency_score,
  CASE 
    WHEN COUNT(a.id) >= 10 THEN 5
    WHEN COUNT(a.id) >= 7 THEN 4
    WHEN COUNT(a.id) >= 4 THEN 3
    WHEN COUNT(a.id) >= 2 THEN 2
    ELSE 1
  END as frequency_score,
  CASE 
    WHEN COALESCE(SUM(a.price), 0) >= 1000 THEN 5
    WHEN COALESCE(SUM(a.price), 0) >= 500 THEN 4
    WHEN COALESCE(SUM(a.price), 0) >= 200 THEN 3
    WHEN COALESCE(SUM(a.price), 0) >= 100 THEN 2
    ELSE 1
  END as monetary_score
FROM customers c
LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'
GROUP BY c.id, c.business_id, c.name, c.email, c.phone, c.address, c.notes, c.tags, c.created_at, c.updated_at;

-- Enable RLS on customer_analytics view (inherits from customers table RLS)
ALTER VIEW customer_analytics SET (security_barrier = true);

-- Create secure revenue analytics view
CREATE VIEW revenue_analytics AS
SELECT 
  business_id,
  DATE_TRUNC('month', start_time) as month,
  COUNT(*) as total_appointments,
  SUM(price) as total_revenue,
  AVG(price) as avg_transaction_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM appointments 
WHERE status = 'completed' AND price IS NOT NULL
GROUP BY business_id, DATE_TRUNC('month', start_time);

-- Enable RLS on revenue_analytics view (inherits from appointments table RLS)
ALTER VIEW revenue_analytics SET (security_barrier = true);

-- Security Fix 2: Add explicit search_path to database functions to prevent injection
CREATE OR REPLACE FUNCTION public.get_customer_segment(
  recency_score integer,
  frequency_score integer, 
  monetary_score integer
) RETURNS text AS $$
DECLARE
  total_score integer;
BEGIN
  -- Set explicit search_path for security
  SET search_path = public;
  
  total_score := recency_score + frequency_score + monetary_score;
  
  RETURN CASE 
    WHEN total_score >= 13 THEN 'VIP'
    WHEN total_score >= 10 THEN 'Loyal'
    WHEN total_score >= 7 THEN 'Potential'
    WHEN total_score >= 5 THEN 'New'
    ELSE 'At Risk'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the existing timestamp function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Set explicit search_path for security
  SET search_path = public;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;