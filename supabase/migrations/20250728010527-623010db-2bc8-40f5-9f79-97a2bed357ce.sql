-- Customer Analytics View
CREATE OR REPLACE VIEW customer_analytics AS
SELECT 
  c.*,
  COALESCE(DATE_PART('day', NOW() - MAX(a.start_time)), 999) as days_since_last_visit,
  COUNT(a.id) as total_appointments,
  COALESCE(SUM(a.price), 0) as total_spent,
  COALESCE(AVG(a.price), 0) as avg_order_value,
  -- CLV calculation (simplified: avg_order_value * total_appointments * estimated_lifespan_factor)
  COALESCE(AVG(a.price) * COUNT(a.id) * 2.5, 0) as customer_lifetime_value,
  -- RFM scoring components
  CASE 
    WHEN DATE_PART('day', NOW() - MAX(a.start_time)) <= 30 THEN 5
    WHEN DATE_PART('day', NOW() - MAX(a.start_time)) <= 60 THEN 4
    WHEN DATE_PART('day', NOW() - MAX(a.start_time)) <= 90 THEN 3
    WHEN DATE_PART('day', NOW() - MAX(a.start_time)) <= 180 THEN 2
    ELSE 1
  END as recency_score,
  CASE 
    WHEN COUNT(a.id) >= 10 THEN 5
    WHEN COUNT(a.id) >= 7 THEN 4
    WHEN COUNT(a.id) >= 4 THEN 3
    WHEN COUNT(a.id) >= 2 THEN 2
    ELSE 1
  END as frequency_score,
  CASE 
    WHEN COALESCE(SUM(a.price), 0) >= 1000 THEN 5
    WHEN COALESCE(SUM(a.price), 0) >= 500 THEN 4
    WHEN COALESCE(SUM(a.price), 0) >= 200 THEN 3
    WHEN COALESCE(SUM(a.price), 0) >= 50 THEN 2
    ELSE 1
  END as monetary_score
FROM customers c
LEFT JOIN appointments a ON c.id = a.customer_id AND a.status = 'completed'
GROUP BY c.id, c.name, c.email, c.phone, c.address, c.notes, c.tags, c.business_id, c.created_at, c.updated_at;

-- Function to calculate customer segment
CREATE OR REPLACE FUNCTION get_customer_segment(r_score INTEGER, f_score INTEGER, m_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  -- RFM Segmentation logic
  IF r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN
    RETURN 'Champions';
  ELSIF r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN
    RETURN 'Loyal';
  ELSIF r_score >= 3 AND f_score <= 2 THEN
    RETURN 'At-Risk';
  ELSIF r_score <= 2 AND f_score <= 2 THEN
    RETURN 'Lost';
  ELSIF r_score >= 4 AND f_score <= 1 THEN
    RETURN 'New';
  ELSE
    RETURN 'Potential';
  END IF;
END;
$$ LANGUAGE plpgsql;