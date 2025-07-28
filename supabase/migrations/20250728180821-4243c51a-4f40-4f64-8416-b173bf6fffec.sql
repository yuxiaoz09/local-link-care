-- Drop existing SECURITY DEFINER views that bypass RLS
DROP VIEW IF EXISTS public.customer_analytics;
DROP VIEW IF EXISTS public.revenue_analytics;

-- Recreate customer_analytics as a regular view with proper RLS inheritance
CREATE VIEW public.customer_analytics AS
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
    COALESCE(EXTRACT(days FROM (NOW() - MAX(a.start_time))), 365) AS days_since_last_visit,
    COUNT(a.id) AS total_appointments,
    COALESCE(SUM(a.price), 0) AS total_spent,
    CASE 
        WHEN COUNT(a.id) > 0 THEN COALESCE(SUM(a.price), 0) / COUNT(a.id)
        ELSE 0 
    END AS avg_order_value,
    COALESCE(SUM(a.price), 0) AS customer_lifetime_value,
    CASE 
        WHEN COALESCE(EXTRACT(days FROM (NOW() - MAX(a.start_time))), 365) <= 30 THEN 5
        WHEN COALESCE(EXTRACT(days FROM (NOW() - MAX(a.start_time))), 365) <= 90 THEN 4
        WHEN COALESCE(EXTRACT(days FROM (NOW() - MAX(a.start_time))), 365) <= 180 THEN 3
        WHEN COALESCE(EXTRACT(days FROM (NOW() - MAX(a.start_time))), 365) <= 365 THEN 2
        ELSE 1
    END AS recency_score,
    CASE 
        WHEN COUNT(a.id) >= 10 THEN 5
        WHEN COUNT(a.id) >= 5 THEN 4
        WHEN COUNT(a.id) >= 3 THEN 3
        WHEN COUNT(a.id) >= 2 THEN 2
        WHEN COUNT(a.id) >= 1 THEN 1
        ELSE 1
    END AS frequency_score,
    CASE 
        WHEN COALESCE(SUM(a.price), 0) >= 1000 THEN 5
        WHEN COALESCE(SUM(a.price), 0) >= 500 THEN 4
        WHEN COALESCE(SUM(a.price), 0) >= 200 THEN 3
        WHEN COALESCE(SUM(a.price), 0) >= 100 THEN 2
        WHEN COALESCE(SUM(a.price), 0) > 0 THEN 1
        ELSE 1
    END AS monetary_score
FROM customers c
LEFT JOIN appointments a ON c.id = a.customer_id
GROUP BY c.id, c.business_id, c.name, c.email, c.phone, c.address, c.notes, c.tags, c.created_at, c.updated_at;

-- Recreate revenue_analytics as a regular view with proper RLS inheritance
CREATE VIEW public.revenue_analytics AS
SELECT 
    a.business_id,
    DATE_TRUNC('month', a.start_time) AS month,
    COALESCE(SUM(a.price), 0) AS total_revenue,
    COUNT(DISTINCT a.id) AS total_appointments,
    COUNT(DISTINCT a.customer_id) AS unique_customers,
    CASE 
        WHEN COUNT(DISTINCT a.id) > 0 THEN COALESCE(SUM(a.price), 0) / COUNT(DISTINCT a.id)
        ELSE 0 
    END AS avg_transaction_value
FROM appointments a
WHERE a.status = 'completed'
GROUP BY a.business_id, DATE_TRUNC('month', a.start_time);

-- Add RLS policies for customer_analytics view
ALTER VIEW public.customer_analytics SET (security_barrier = true);

CREATE POLICY "Users can view customer analytics from their business" 
ON public.customers 
FOR SELECT 
USING (business_id IN (
    SELECT businesses.id
    FROM businesses
    WHERE businesses.user_id = auth.uid()
));

-- Add RLS policies for revenue_analytics view  
ALTER VIEW public.revenue_analytics SET (security_barrier = true);

CREATE POLICY "Users can view revenue analytics from their business" 
ON public.appointments 
FOR SELECT 
USING (business_id IN (
    SELECT businesses.id
    FROM businesses
    WHERE businesses.user_id = auth.uid()
));

-- Add audit logging for sensitive analytics access
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to log analytics access
CREATE OR REPLACE FUNCTION public.log_analytics_access(
    p_action TEXT,
    p_resource TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action,
        resource,
        details,
        created_at
    ) VALUES (
        auth.uid(),
        p_action,
        p_resource,
        p_details,
        now()
    );
END;
$$;