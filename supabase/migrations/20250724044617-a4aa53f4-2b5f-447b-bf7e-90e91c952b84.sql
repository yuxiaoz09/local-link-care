-- Create businesses table
CREATE TABLE public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for businesses
CREATE POLICY "Users can view their own business" ON public.businesses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business" ON public.businesses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business" ON public.businesses
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for customers
CREATE POLICY "Users can view customers from their business" ON public.customers
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create customers for their business" ON public.customers
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update customers from their business" ON public.customers
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete customers from their business" ON public.customers
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for appointments
CREATE POLICY "Users can view appointments from their business" ON public.appointments
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create appointments for their business" ON public.appointments
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update appointments from their business" ON public.appointments
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete appointments from their business" ON public.appointments
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create RLS policies for tasks
CREATE POLICY "Users can view tasks from their business" ON public.tasks
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create tasks for their business" ON public.tasks
  FOR INSERT WITH CHECK (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update tasks from their business" ON public.tasks
  FOR UPDATE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks from their business" ON public.tasks
  FOR DELETE USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();