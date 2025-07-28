-- Create chat history table
CREATE TABLE public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_query TEXT NOT NULL,
  parsed_intent TEXT,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their business chat history" 
ON public.chat_history 
FOR SELECT 
USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can create chat history for their business" 
ON public.chat_history 
FOR INSERT 
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Create query analytics table
CREATE TABLE public.query_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL,
  success_rate DECIMAL(5,2),
  avg_response_time INTEGER, -- milliseconds
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.query_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their business query analytics" 
ON public.query_analytics 
FOR SELECT 
USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can create query analytics for their business" 
ON public.query_analytics 
FOR INSERT 
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their business query analytics" 
ON public.query_analytics 
FOR UPDATE 
USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));

-- Create function to get best customer for a period
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  SET search_path = public;
  
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
$$;

-- Create function to get revenue for period
CREATE OR REPLACE FUNCTION public.get_revenue_period(
  business_uuid UUID,
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  total_revenue NUMERIC,
  appointment_count BIGINT,
  avg_transaction_value NUMERIC,
  unique_customers BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  SET search_path = public;
  
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
$$;

-- Create function to get appointments for period
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  SET search_path = public;
  
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
$$;

-- Create function to get at-risk customers
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  SET search_path = public;
  
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
  HAVING MAX(a.start_time::DATE) < CURRENT_DATE - INTERVAL '%s days' OR MAX(a.start_time::DATE) IS NULL
  ORDER BY days_since_last_visit DESC NULLS FIRST;
END;
$$;

-- Add trigger for updated_at columns
CREATE TRIGGER update_chat_history_updated_at
BEFORE UPDATE ON public.chat_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_query_analytics_updated_at
BEFORE UPDATE ON public.query_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();