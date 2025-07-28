-- Add input length constraints to prevent excessively long inputs
-- Business names should have reasonable length limits
ALTER TABLE public.businesses 
ADD CONSTRAINT business_name_length CHECK (LENGTH(name) <= 200);

-- Customer names should have reasonable length limits
ALTER TABLE public.customers 
ADD CONSTRAINT customer_name_length CHECK (LENGTH(name) <= 100);

-- Location names should have reasonable length limits
ALTER TABLE public.locations 
ADD CONSTRAINT location_name_length CHECK (LENGTH(name) <= 100);

-- Employee names should have reasonable length limits
ALTER TABLE public.employees 
ADD CONSTRAINT employee_name_length CHECK (LENGTH(name) <= 100);

-- Product names should have reasonable length limits
ALTER TABLE public.products 
ADD CONSTRAINT product_name_length CHECK (LENGTH(name) <= 200);

-- Appointment titles should have reasonable length limits
ALTER TABLE public.appointments 
ADD CONSTRAINT appointment_title_length CHECK (LENGTH(title) <= 200);

-- Task titles should have reasonable length limits
ALTER TABLE public.tasks 
ADD CONSTRAINT task_title_length CHECK (LENGTH(title) <= 200);

-- Add description length limits
ALTER TABLE public.customers 
ADD CONSTRAINT customer_notes_length CHECK (LENGTH(notes) <= 2000);

ALTER TABLE public.appointments 
ADD CONSTRAINT appointment_description_length CHECK (LENGTH(description) <= 1000);

ALTER TABLE public.tasks 
ADD CONSTRAINT task_description_length CHECK (LENGTH(description) <= 1000);

ALTER TABLE public.products 
ADD CONSTRAINT product_description_length CHECK (LENGTH(description) <= 1000);

-- Add email format validation constraints
ALTER TABLE public.businesses 
ADD CONSTRAINT business_email_format CHECK (owner_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.customers 
ADD CONSTRAINT customer_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.employees 
ADD CONSTRAINT employee_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');