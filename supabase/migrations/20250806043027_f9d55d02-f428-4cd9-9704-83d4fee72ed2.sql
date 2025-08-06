-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'yelp', 'facebook')),
  external_review_id TEXT NOT NULL,
  customer_name TEXT,
  customer_avatar_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  response_text TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  response_author TEXT, -- staff member who responded
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0 sentiment analysis
  keywords TEXT[], -- extracted keywords from review
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, external_review_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view reviews from their business" ON reviews
  FOR SELECT USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create reviews for their business" ON reviews
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update reviews from their business" ON reviews
  FOR UPDATE USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete reviews from their business" ON reviews
  FOR DELETE USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Review requests tracking
CREATE TABLE review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('email', 'sms')),
  platform_requested TEXT, -- which platform we asked them to review on
  sent_date TIMESTAMP WITH TIME ZONE NOT NULL,
  opened_date TIMESTAMP WITH TIME ZONE,
  clicked_date TIMESTAMP WITH TIME ZONE,
  review_completed BOOLEAN DEFAULT FALSE,
  review_id UUID REFERENCES reviews(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_requests
CREATE POLICY "Users can manage review requests for their business" ON review_requests
  FOR ALL USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Response templates
CREATE TABLE response_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
  template_text TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for response_templates
CREATE POLICY "Users can manage response templates for their business" ON response_templates
  FOR ALL USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Review settings
CREATE TABLE review_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  auto_request_enabled BOOLEAN DEFAULT TRUE,
  request_delay_hours INTEGER DEFAULT 2,
  follow_up_enabled BOOLEAN DEFAULT TRUE,
  follow_up_delay_days INTEGER DEFAULT 7,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  preferred_platforms TEXT[] DEFAULT ARRAY['google', 'yelp'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_settings
CREATE POLICY "Users can manage review settings for their business" ON review_settings
  FOR ALL USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_settings_updated_at
  BEFORE UPDATE ON review_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default response templates for new businesses
INSERT INTO response_templates (business_id, name, category, template_text) VALUES
(
  gen_random_uuid(), -- This will be replaced by actual business_id in application code
  'Positive Review Thank You',
  'positive',
  'Thank you {customer_name} for the wonderful review! We''re thrilled you enjoyed your {service_name}. We look forward to seeing you again soon!'
),
(
  gen_random_uuid(),
  'Negative Review Response',
  'negative',
  'Thank you for your feedback, {customer_name}. We take all concerns seriously and would love to discuss this further. Please contact us at {business_phone} so we can make this right.'
),
(
  gen_random_uuid(),
  'Neutral Review Response',
  'neutral',
  'Thanks for taking the time to review us, {customer_name}. We appreciate your feedback and are always looking to improve our services.'
);