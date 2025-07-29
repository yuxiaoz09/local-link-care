-- Create product analytics function
CREATE OR REPLACE FUNCTION public.get_product_analytics(business_uuid uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  product_sku text,
  product_category text,
  supplier text,
  cost_price numeric,
  retail_price numeric,
  total_stock bigint,
  total_sales_quantity bigint,
  total_sales_revenue numeric,
  profit_margin numeric,
  inventory_turnover numeric,
  days_since_last_sale integer,
  locations_in_stock bigint,
  average_sale_price numeric,
  total_profit numeric
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
    p.id as product_id,
    p.name as product_name,
    p.sku as product_sku,
    p.category as product_category,
    p.supplier,
    p.cost_price,
    p.retail_price,
    COALESCE(SUM(i.current_stock), 0) as total_stock,
    COALESCE(SUM(ps.quantity), 0) as total_sales_quantity,
    COALESCE(SUM(ps.total_amount), 0) as total_sales_revenue,
    CASE 
      WHEN p.cost_price > 0 AND p.retail_price > 0 
      THEN ((p.retail_price - p.cost_price) / p.retail_price * 100)
      ELSE 0
    END as profit_margin,
    CASE 
      WHEN COALESCE(SUM(i.current_stock), 0) > 0 AND COALESCE(SUM(ps.quantity), 0) > 0
      THEN COALESCE(SUM(ps.quantity), 0)::numeric / NULLIF(COALESCE(SUM(i.current_stock), 0), 0)
      ELSE 0
    END as inventory_turnover,
    CASE 
      WHEN MAX(ps.sale_date) IS NOT NULL 
      THEN EXTRACT(DAY FROM (CURRENT_DATE - MAX(ps.sale_date::DATE)))::INTEGER
      ELSE NULL
    END as days_since_last_sale,
    COUNT(DISTINCT CASE WHEN i.current_stock > 0 THEN i.location_id END) as locations_in_stock,
    CASE 
      WHEN COUNT(ps.id) > 0 
      THEN COALESCE(SUM(ps.total_amount), 0) / COUNT(ps.id)
      ELSE p.retail_price
    END as average_sale_price,
    COALESCE(SUM(ps.total_amount - (ps.quantity * p.cost_price)), 0) as total_profit
  FROM public.products p
  LEFT JOIN public.inventory i ON p.id = i.product_id
  LEFT JOIN public.locations l ON i.location_id = l.id AND l.business_id = business_uuid
  LEFT JOIN public.product_sales ps ON p.id = ps.product_id
  WHERE p.business_id = business_uuid
  GROUP BY p.id, p.name, p.sku, p.category, p.supplier, p.cost_price, p.retail_price
  ORDER BY total_sales_revenue DESC;
END;
$function$;

-- Create inventory alerts function
CREATE OR REPLACE FUNCTION public.get_inventory_alerts(business_uuid uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  location_id uuid,
  location_name text,
  current_stock integer,
  minimum_stock integer,
  stock_shortage integer,
  alert_level text
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
    p.id as product_id,
    p.name as product_name,
    l.id as location_id,
    l.name as location_name,
    i.current_stock,
    i.minimum_stock,
    (i.minimum_stock - i.current_stock) as stock_shortage,
    CASE 
      WHEN i.current_stock = 0 THEN 'critical'
      WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 'urgent'
      WHEN i.current_stock <= i.minimum_stock THEN 'warning'
      ELSE 'normal'
    END as alert_level
  FROM public.inventory i
  JOIN public.products p ON i.product_id = p.id
  JOIN public.locations l ON i.location_id = l.id
  WHERE p.business_id = business_uuid 
    AND l.business_id = business_uuid
    AND i.current_stock <= i.minimum_stock
  ORDER BY 
    CASE 
      WHEN i.current_stock = 0 THEN 1
      WHEN i.current_stock <= (i.minimum_stock * 0.5) THEN 2
      WHEN i.current_stock <= i.minimum_stock THEN 3
      ELSE 4
    END,
    i.current_stock ASC;
END;
$function$;

-- Create top products function
CREATE OR REPLACE FUNCTION public.get_top_products(business_uuid uuid, metric text DEFAULT 'revenue', limit_count integer DEFAULT 10)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  product_category text,
  metric_value numeric,
  rank_position integer
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

  -- Validate metric parameter
  IF metric NOT IN ('revenue', 'quantity', 'profit', 'margin') THEN
    RAISE EXCEPTION 'Invalid metric: must be revenue, quantity, profit, or margin';
  END IF;

  IF metric = 'revenue' THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category as product_category,
      COALESCE(SUM(ps.total_amount), 0) as metric_value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ps.total_amount), 0) DESC)::integer as rank_position
    FROM public.products p
    LEFT JOIN public.product_sales ps ON p.id = ps.product_id
    WHERE p.business_id = business_uuid
    GROUP BY p.id, p.name, p.category
    ORDER BY metric_value DESC
    LIMIT limit_count;
  
  ELSIF metric = 'quantity' THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category as product_category,
      COALESCE(SUM(ps.quantity), 0)::numeric as metric_value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ps.quantity), 0) DESC)::integer as rank_position
    FROM public.products p
    LEFT JOIN public.product_sales ps ON p.id = ps.product_id
    WHERE p.business_id = business_uuid
    GROUP BY p.id, p.name, p.category
    ORDER BY metric_value DESC
    LIMIT limit_count;
  
  ELSIF metric = 'profit' THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category as product_category,
      COALESCE(SUM(ps.total_amount - (ps.quantity * p.cost_price)), 0) as metric_value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ps.total_amount - (ps.quantity * p.cost_price)), 0) DESC)::integer as rank_position
    FROM public.products p
    LEFT JOIN public.product_sales ps ON p.id = ps.product_id
    WHERE p.business_id = business_uuid AND p.cost_price IS NOT NULL
    GROUP BY p.id, p.name, p.category, p.cost_price
    ORDER BY metric_value DESC
    LIMIT limit_count;
  
  ELSIF metric = 'margin' THEN
    RETURN QUERY
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category as product_category,
      CASE 
        WHEN p.cost_price > 0 AND p.retail_price > 0 
        THEN ((p.retail_price - p.cost_price) / p.retail_price * 100)
        ELSE 0
      END as metric_value,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE 
            WHEN p.cost_price > 0 AND p.retail_price > 0 
            THEN ((p.retail_price - p.cost_price) / p.retail_price * 100)
            ELSE 0
          END DESC
      )::integer as rank_position
    FROM public.products p
    WHERE p.business_id = business_uuid 
      AND p.cost_price IS NOT NULL 
      AND p.retail_price IS NOT NULL
      AND p.cost_price > 0 
      AND p.retail_price > 0
    ORDER BY metric_value DESC
    LIMIT limit_count;
  END IF;
END;
$function$;