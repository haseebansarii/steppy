-- Test if position columns exist in users_pets table
-- Run this in your Supabase SQL Editor to check if the migration is needed

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users_pets' 
  AND table_schema = 'public'
  AND column_name IN ('position_x', 'position_y');

-- If this returns no rows, you need to run the migration:
-- Copy and paste the contents of add_pet_positions.sql into Supabase SQL Editor