-- Create comprehensive onboarding and service management system

-- 1. Add business type and onboarding tracking to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS industry_category TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{}';

-- 2. Create service templates table for industry-specific defaults
CREATE TABLE IF NOT EXISTS public.service_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_category TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  suggested_price NUMERIC,
  suggested_duration INTEGER, -- in minutes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create offerings table to separate services and products
CREATE TABLE IF NOT EXISTS public.offerings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('service', 'product')), -- service or product
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  
  -- Service-specific fields
  base_price NUMERIC,
  duration_minutes INTEGER,
  requires_booking BOOLEAN DEFAULT TRUE,
  deposit_required NUMERIC DEFAULT 0,
  allow_online_booking BOOLEAN DEFAULT TRUE,
  cancellation_policy TEXT,
  
  -- Product-specific fields
  sku TEXT,
  cost_price NUMERIC,
  retail_price NUMERIC,
  supplier TEXT,
  track_inventory BOOLEAN DEFAULT FALSE,
  
  -- Common fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create staff assignments for services
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  offering_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, offering_id)
);

-- 5. Update appointments table to reference offerings instead of products
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS offering_id UUID;

-- 6. Create onboarding progress tracking
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE,
  business_type_selected BOOLEAN DEFAULT FALSE,
  services_added_count INTEGER DEFAULT 0,
  staff_added_count INTEGER DEFAULT 0,
  first_appointment_created BOOLEAN DEFAULT FALSE,
  customers_added_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_templates (public read access for templates)
CREATE POLICY "Service templates are publicly readable" 
ON public.service_templates 
FOR SELECT 
USING (true);

-- RLS Policies for offerings
CREATE POLICY "Users can view offerings from their business" 
ON public.offerings 
FOR SELECT 
USING (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create offerings for their business" 
ON public.offerings 
FOR INSERT 
WITH CHECK (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update offerings from their business" 
ON public.offerings 
FOR UPDATE 
USING (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

CREATE POLICY "Users can delete offerings from their business" 
ON public.offerings 
FOR DELETE 
USING (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

-- RLS Policies for staff_assignments
CREATE POLICY "Users can manage staff assignments for their business" 
ON public.staff_assignments 
FOR ALL 
USING (employee_id IN (
  SELECT e.id FROM employees e
  JOIN businesses b ON e.business_id = b.id
  WHERE b.user_id = auth.uid()
));

-- RLS Policies for onboarding_progress
CREATE POLICY "Users can manage their business onboarding progress" 
ON public.onboarding_progress 
FOR ALL 
USING (business_id IN (
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
));

-- Insert industry-specific service templates
INSERT INTO public.service_templates (industry_category, name, category, description, suggested_price, suggested_duration) VALUES
-- Hair Salon/Barbershop
('hair_salon', 'Men''s Haircut', 'Haircuts', 'Professional men''s haircut and styling', 25, 30),
('hair_salon', 'Women''s Haircut & Style', 'Haircuts', 'Women''s cut, wash, and style', 45, 60),
('hair_salon', 'Hair Coloring', 'Coloring', 'Full hair color treatment', 75, 120),
('hair_salon', 'Highlights', 'Coloring', 'Professional highlights treatment', 95, 150),
('hair_salon', 'Beard Trim', 'Grooming', 'Beard shaping and trimming', 15, 15),
('hair_salon', 'Deep Conditioning', 'Treatments', 'Intensive hair conditioning treatment', 35, 45),

-- Auto Repair Shop
('auto_repair', 'Oil Change', 'Maintenance', 'Standard oil change service', 49, 30),
('auto_repair', 'Brake Service', 'Repairs', 'Brake inspection and repair', 125, 90),
('auto_repair', 'Tire Installation', 'Tires', 'Professional tire mounting and balancing', 35, 20),
('auto_repair', 'Engine Diagnostic', 'Diagnostics', 'Computer diagnostic scan', 95, 60),
('auto_repair', 'Air Filter Replacement', 'Maintenance', 'Engine air filter replacement', 25, 15),

-- Spa/Wellness Center
('spa_wellness', '60-Minute Massage', 'Massage', 'Full body relaxation massage', 85, 60),
('spa_wellness', 'Facial Treatment', 'Skincare', 'Deep cleansing facial treatment', 75, 75),
('spa_wellness', 'Manicure', 'Nails', 'Professional nail care and polish', 35, 45),
('spa_wellness', 'Pedicure', 'Nails', 'Foot care and nail treatment', 45, 60),
('spa_wellness', 'Body Wrap', 'Body Treatments', 'Detoxifying body wrap treatment', 95, 90),

-- Restaurant/Cafe
('restaurant', 'Table Service', 'Dining', 'Full table service dining experience', 0, 60),
('restaurant', 'Private Event Hosting', 'Events', 'Private party and event hosting', 200, 180),
('restaurant', 'Catering Service', 'Catering', 'Off-site catering service', 25, 30),

-- Fitness Studio/Gym
('fitness', 'Personal Training Session', 'Training', 'One-on-one fitness training', 75, 60),
('fitness', 'Group Fitness Class', 'Classes', 'Group workout session', 20, 45),
('fitness', 'Fitness Assessment', 'Consultation', 'Initial fitness evaluation', 50, 60),
('fitness', 'Nutrition Consultation', 'Consultation', 'Personalized nutrition planning', 85, 45),

-- Beauty Services
('beauty', 'Eyebrow Threading', 'Brows', 'Professional eyebrow shaping', 20, 20),
('beauty', 'Eyelash Extensions', 'Lashes', 'Full set lash extension application', 120, 120),
('beauty', 'Makeup Application', 'Makeup', 'Professional makeup service', 60, 60),
('beauty', 'Skin Consultation', 'Skincare', 'Personalized skincare assessment', 40, 30),

-- Home Services
('home_services', 'House Cleaning', 'Cleaning', 'Complete home cleaning service', 120, 180),
('home_services', 'Lawn Maintenance', 'Landscaping', 'Grass cutting and yard maintenance', 75, 90),
('home_services', 'Handyman Service', 'Repairs', 'General home repair services', 85, 120),
('home_services', 'Plumbing Service', 'Plumbing', 'Plumbing repair and installation', 95, 90);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offerings_updated_at
  BEFORE UPDATE ON public.offerings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_templates_updated_at
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();