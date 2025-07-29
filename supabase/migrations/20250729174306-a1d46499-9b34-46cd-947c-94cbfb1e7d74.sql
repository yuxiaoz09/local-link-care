-- Create widget configurations table
CREATE TABLE public.widget_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Booking Widget',
  is_active BOOLEAN DEFAULT true,
  
  -- Styling configuration
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1F2937',
  font_family TEXT DEFAULT 'system-ui',
  button_style TEXT DEFAULT 'rounded',
  
  -- Widget settings
  show_prices BOOLEAN DEFAULT true,
  show_duration BOOLEAN DEFAULT true,
  require_phone BOOLEAN DEFAULT true,
  require_email BOOLEAN DEFAULT true,
  allow_notes BOOLEAN DEFAULT true,
  
  -- Domain restrictions
  allowed_domains TEXT[],
  
  -- Generated widget code
  widget_key TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create widget bookings table for tracking widget sources
CREATE TABLE public.widget_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  widget_id UUID NOT NULL,
  source_domain TEXT,
  source_page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create widget analytics table
CREATE TABLE public.widget_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'booking_start', 'booking_complete', 'booking_abandon'
  source_domain TEXT,
  source_page_url TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_configurations
CREATE POLICY "Users can manage widgets for their business" 
ON public.widget_configurations 
FOR ALL 
USING (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

-- RLS Policies for widget_bookings
CREATE POLICY "Users can view widget bookings for their business" 
ON public.widget_bookings 
FOR SELECT 
USING (widget_id IN (
  SELECT id FROM public.widget_configurations 
  WHERE business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  )
));

CREATE POLICY "System can create widget bookings" 
ON public.widget_bookings 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for widget_analytics
CREATE POLICY "Users can view widget analytics for their business" 
ON public.widget_analytics 
FOR SELECT 
USING (widget_id IN (
  SELECT id FROM public.widget_configurations 
  WHERE business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  )
));

CREATE POLICY "System can create widget analytics" 
ON public.widget_analytics 
FOR INSERT 
WITH CHECK (true);

-- Add widget_source to appointments table
ALTER TABLE public.appointments ADD COLUMN widget_source UUID REFERENCES public.widget_configurations(id);

-- Create trigger for updated_at
CREATE TRIGGER update_widget_configurations_updated_at
  BEFORE UPDATE ON public.widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();