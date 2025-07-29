-- Create customer tags table for standardized tags per business
CREATE TABLE public.customer_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  category VARCHAR(30) DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT customer_tags_business_name_unique UNIQUE(business_id, name),
  CONSTRAINT customer_tags_name_length CHECK (LENGTH(TRIM(name)) >= 1 AND LENGTH(TRIM(name)) <= 50),
  CONSTRAINT customer_tags_category_length CHECK (LENGTH(TRIM(category)) >= 1 AND LENGTH(TRIM(category)) <= 30),
  CONSTRAINT customer_tags_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create customer tag assignments junction table
CREATE TABLE public.customer_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT customer_tag_assignments_unique UNIQUE(customer_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_tags
CREATE POLICY "Users can view tags from their business" 
ON public.customer_tags 
FOR SELECT 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create tags for their business" 
ON public.customer_tags 
FOR INSERT 
WITH CHECK (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update tags from their business" 
ON public.customer_tags 
FOR UPDATE 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete tags from their business" 
ON public.customer_tags 
FOR DELETE 
USING (business_id IN (
  SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
));

-- RLS policies for customer_tag_assignments
CREATE POLICY "Users can view tag assignments from their business customers" 
ON public.customer_tag_assignments 
FOR SELECT 
USING (customer_id IN (
  SELECT customers.id FROM customers 
  WHERE customers.business_id IN (
    SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
  )
));

CREATE POLICY "Users can create tag assignments for their business customers" 
ON public.customer_tag_assignments 
FOR INSERT 
WITH CHECK (customer_id IN (
  SELECT customers.id FROM customers 
  WHERE customers.business_id IN (
    SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
  )
));

CREATE POLICY "Users can delete tag assignments from their business customers" 
ON public.customer_tag_assignments 
FOR DELETE 
USING (customer_id IN (
  SELECT customers.id FROM customers 
  WHERE customers.business_id IN (
    SELECT businesses.id FROM businesses WHERE businesses.user_id = auth.uid()
  )
));

-- Create trigger for updating updated_at column
CREATE TRIGGER update_customer_tags_updated_at
  BEFORE UPDATE ON public.customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment usage count
    UPDATE public.customer_tags 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement usage count
    UPDATE public.customer_tags 
    SET usage_count = GREATEST(usage_count - 1, 0) 
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger to automatically update usage count
CREATE TRIGGER update_customer_tag_usage_count
  AFTER INSERT OR DELETE ON public.customer_tag_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tag_usage_count();

-- Function to get customer tags with details
CREATE OR REPLACE FUNCTION public.get_customer_tags_with_assignments(p_customer_id UUID)
RETURNS TABLE(
  tag_id UUID,
  tag_name TEXT,
  tag_color TEXT,
  tag_category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.color,
    ct.category
  FROM public.customer_tags ct
  INNER JOIN public.customer_tag_assignments cta ON ct.id = cta.tag_id
  WHERE cta.customer_id = p_customer_id
  ORDER BY ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Function to get business tags with usage stats
CREATE OR REPLACE FUNCTION public.get_business_tags_with_usage(p_business_id UUID)
RETURNS TABLE(
  tag_id UUID,
  tag_name TEXT,
  tag_color TEXT,
  tag_category TEXT,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.name,
    ct.color,
    ct.category,
    ct.usage_count
  FROM public.customer_tags ct
  WHERE ct.business_id = p_business_id
  ORDER BY ct.usage_count DESC, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';