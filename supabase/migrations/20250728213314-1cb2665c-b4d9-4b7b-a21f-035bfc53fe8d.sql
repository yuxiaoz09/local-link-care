-- Phase 1: Clean up duplicate business records and add unique constraint

-- First, let's delete duplicate business records, keeping only the most recent one per user
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM public.businesses
)
DELETE FROM public.businesses 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.businesses 
ADD CONSTRAINT businesses_user_id_unique UNIQUE (user_id);