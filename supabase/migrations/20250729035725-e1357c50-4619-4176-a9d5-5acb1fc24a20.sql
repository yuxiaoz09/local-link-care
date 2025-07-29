-- Create user roles system for enhanced access control
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee', 'owner');

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _business_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Function to get user's highest role in a business
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _business_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND business_id = _business_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'employee' THEN 4
    END
  LIMIT 1;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Business owners can manage all roles in their business"
ON public.user_roles
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced password policy table for tracking password requirements
CREATE TABLE public.password_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_numbers BOOLEAN NOT NULL DEFAULT true,
  require_special_chars BOOLEAN NOT NULL DEFAULT true,
  password_expiry_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for password policies
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage password policies"
ON public.password_policies
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE user_id = auth.uid()
  )
);

-- Enhanced security audit log with more fields
ALTER TABLE public.security_audit_log 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS location_data JSONB;

-- Function to log security events with enhanced data
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_resource TEXT,
  p_details JSONB DEFAULT NULL,
  p_risk_score INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Validate inputs
  IF p_action IS NULL OR LENGTH(TRIM(p_action)) = 0 THEN
    RAISE EXCEPTION 'Action cannot be null or empty';
  END IF;

  IF p_resource IS NULL OR LENGTH(TRIM(p_resource)) = 0 THEN
    RAISE EXCEPTION 'Resource cannot be null or empty';
  END IF;

  -- Insert with improved logging
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    details,
    risk_score,
    created_at
  ) VALUES (
    auth.uid(),
    TRIM(p_action),
    TRIM(p_resource),
    p_details,
    COALESCE(p_risk_score, 0),
    NOW()
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;