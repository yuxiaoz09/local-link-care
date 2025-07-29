-- Create employee analytics function
CREATE OR REPLACE FUNCTION public.get_employee_analytics(business_uuid uuid)
RETURNS TABLE(
  employee_id uuid,
  employee_name text,
  employee_role text,
  location_name text,
  hire_date date,
  hourly_rate numeric,
  commission_rate numeric,
  total_appointments bigint,
  completed_appointments bigint,
  total_revenue numeric,
  commission_earned numeric,
  avg_appointment_value numeric,
  last_appointment_date date,
  appointments_this_month bigint,
  revenue_this_month numeric
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
    e.id as employee_id,
    e.name as employee_name,
    e.role as employee_role,
    COALESCE(l.name, 'All Locations') as location_name,
    e.hire_date,
    e.hourly_rate,
    e.commission_rate,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN a.status = 'completed' AND e.commission_rate IS NOT NULL 
                     THEN a.price * (e.commission_rate / 100) ELSE 0 END), 0) as commission_earned,
    CASE 
      WHEN COUNT(CASE WHEN a.status = 'completed' THEN 1 END) > 0 
      THEN COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price ELSE 0 END), 0) / 
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END)
      ELSE 0
    END as avg_appointment_value,
    MAX(CASE WHEN a.status = 'completed' THEN a.start_time::DATE END) as last_appointment_date,
    COUNT(CASE WHEN a.status = 'completed' AND a.start_time >= date_trunc('month', CURRENT_DATE) 
               THEN 1 END) as appointments_this_month,
    COALESCE(SUM(CASE WHEN a.status = 'completed' AND a.start_time >= date_trunc('month', CURRENT_DATE)
                     THEN a.price ELSE 0 END), 0) as revenue_this_month
  FROM public.employees e
  LEFT JOIN public.locations l ON e.location_id = l.id
  LEFT JOIN public.appointments a ON e.id = a.employee_id AND a.business_id = business_uuid
  WHERE e.business_id = business_uuid
  GROUP BY e.id, e.name, e.role, l.name, e.hire_date, e.hourly_rate, e.commission_rate
  ORDER BY total_revenue DESC;
END;
$function$;

-- Create employee service specializations table
CREATE TABLE IF NOT EXISTS public.employee_services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  service_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(employee_id, service_id)
);

-- Enable RLS on employee_services
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_services
CREATE POLICY "Users can manage employee services for their business"
ON public.employee_services
FOR ALL
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE b.user_id = auth.uid()
  )
);

-- Create employee work schedules table
CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  date date NOT NULL,
  planned_hours numeric DEFAULT 8,
  actual_hours numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable RLS on employee_schedules
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_schedules
CREATE POLICY "Users can manage employee schedules for their business"
ON public.employee_schedules
FOR ALL
USING (
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.businesses b ON e.business_id = b.id
    WHERE b.user_id = auth.uid()
  )
);

-- Create trigger for updating updated_at on employee_schedules
CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();