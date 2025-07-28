-- Phase 1: Create locations, employees, and products tables

-- Locations table
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID,
  operating_hours JSONB, -- {"monday": {"open": "09:00", "close": "17:00"}}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create policies for locations
CREATE POLICY "Users can view locations from their business" 
ON public.locations 
FOR SELECT 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can create locations for their business" 
ON public.locations 
FOR INSERT 
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update locations from their business" 
ON public.locations 
FOR UPDATE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete locations from their business" 
ON public.locations 
FOR DELETE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Employees table
CREATE TABLE public.employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  location_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT, -- 'manager', 'stylist', 'receptionist', etc.
  hourly_rate DECIMAL(10,2),
  commission_rate DECIMAL(5,2), -- percentage
  hire_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees
CREATE POLICY "Users can view employees from their business" 
ON public.employees 
FOR SELECT 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can create employees for their business" 
ON public.employees 
FOR INSERT 
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update employees from their business" 
ON public.employees 
FOR UPDATE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete employees from their business" 
ON public.employees 
FOR DELETE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Products table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  description TEXT,
  cost_price DECIMAL(10,2), -- what you pay supplier
  retail_price DECIMAL(10,2), -- what customer pays
  supplier TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Users can view products from their business" 
ON public.products 
FOR SELECT 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can create products for their business" 
ON public.products 
FOR INSERT 
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can update products from their business" 
ON public.products 
FOR UPDATE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete products from their business" 
ON public.products 
FOR DELETE 
USING (business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()));

-- Inventory levels by location
CREATE TABLE public.inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  location_id UUID NOT NULL,
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5, -- reorder point
  maximum_stock INTEGER DEFAULT 100,
  last_restocked DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- Enable RLS on inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory
CREATE POLICY "Users can view inventory from their business locations" 
ON public.inventory 
FOR SELECT 
USING (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

CREATE POLICY "Users can create inventory for their business locations" 
ON public.inventory 
FOR INSERT 
WITH CHECK (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

CREATE POLICY "Users can update inventory from their business locations" 
ON public.inventory 
FOR UPDATE 
USING (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete inventory from their business locations" 
ON public.inventory 
FOR DELETE 
USING (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

-- Product sales tracking
CREATE TABLE public.product_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  location_id UUID,
  employee_id UUID,
  customer_id UUID,
  quantity INTEGER NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on product_sales
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

-- Create policies for product_sales
CREATE POLICY "Users can view product sales from their business" 
ON public.product_sales 
FOR SELECT 
USING (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

CREATE POLICY "Users can create product sales for their business" 
ON public.product_sales 
FOR INSERT 
WITH CHECK (location_id IN (SELECT id FROM public.locations WHERE business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())));

-- Update existing tables to include location_id and employee_id
ALTER TABLE public.appointments ADD COLUMN location_id UUID;
ALTER TABLE public.appointments ADD COLUMN employee_id UUID;
ALTER TABLE public.customers ADD COLUMN preferred_location_id UUID;
ALTER TABLE public.tasks ADD COLUMN location_id UUID;

-- Add triggers for updated_at columns
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();