-- Migration: Add pet position tracking columns
-- Add position columns to users_pets table to store pet positions

ALTER TABLE public.users_pets 
ADD COLUMN IF NOT EXISTS position_x REAL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS position_y REAL DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN public.users_pets.position_x IS 'X coordinate of pet position in landscape mode';
COMMENT ON COLUMN public.users_pets.position_y IS 'Y coordinate of pet position in landscape mode';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_pets_positions ON public.users_pets(user_id, pet_id) WHERE position_x IS NOT NULL;