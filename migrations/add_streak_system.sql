-- Migration: Add goal completions tracking for streak-based pet system
-- This migration adds a table to track daily goal completions for streak calculation

-- Create goal_completions table to track daily goal achievements
CREATE TABLE IF NOT EXISTS public.goal_completions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  completion_date date NOT NULL,
  steps_achieved integer NOT NULL,
  goal_steps integer NOT NULL,
  goal_met boolean NOT NULL DEFAULT false,
  
  CONSTRAINT goal_completions_pkey PRIMARY KEY (id),
  CONSTRAINT goal_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT goal_completions_user_date_unique UNIQUE (user_id, completion_date)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.goal_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own goal completions
CREATE POLICY "Users can view own goal completions" ON public.goal_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own goal completions  
CREATE POLICY "Users can insert own goal completions" ON public.goal_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own goal completions
CREATE POLICY "Users can update own goal completions" ON public.goal_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add index for efficient streak queries
CREATE INDEX IF NOT EXISTS goal_completions_user_date_idx 
  ON public.goal_completions (user_id, completion_date DESC);

-- Add index for goal completion queries
CREATE INDEX IF NOT EXISTS goal_completions_user_goal_met_idx 
  ON public.goal_completions (user_id, goal_met, completion_date DESC);

-- Add streak tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_update date;

-- Function to calculate and update user streaks
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid uuid)
RETURNS void AS $$
DECLARE
  current_streak_count integer := 0;
  temp_date date;
  temp_goal_met boolean;
BEGIN
  -- Calculate current streak by counting consecutive days from today backwards
  FOR temp_date, temp_goal_met IN 
    SELECT completion_date, goal_met 
    FROM goal_completions 
    WHERE user_id = user_uuid 
    ORDER BY completion_date DESC
  LOOP
    IF temp_goal_met THEN
      current_streak_count := current_streak_count + 1;
    ELSE
      EXIT; -- Break streak on first day goal wasn't met
    END IF;
  END LOOP;
  
  -- Update the user's profile with new streak info
  UPDATE profiles 
  SET 
    current_streak = current_streak_count,
    longest_streak = GREATEST(longest_streak, current_streak_count),
    last_streak_update = CURRENT_DATE
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update streaks when goal completions are inserted/updated
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_streak(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic streak updates
DROP TRIGGER IF EXISTS update_streak_on_goal_completion ON public.goal_completions;
CREATE TRIGGER update_streak_on_goal_completion
  AFTER INSERT OR UPDATE ON public.goal_completions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_streak();

-- Add pet earning tracking to users_pets table
ALTER TABLE public.users_pets 
ADD COLUMN IF NOT EXISTS earned_via_streak boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS streak_requirement integer DEFAULT 0;

COMMENT ON TABLE public.goal_completions IS 'Tracks daily goal completions for streak-based pet earning system';
COMMENT ON COLUMN public.profiles.current_streak IS 'Current consecutive days of goal completion';
COMMENT ON COLUMN public.profiles.longest_streak IS 'Longest streak ever achieved by user';
COMMENT ON COLUMN public.users_pets.earned_via_streak IS 'Whether this pet was earned through the streak system';
COMMENT ON COLUMN public.users_pets.streak_requirement IS 'How many consecutive days were required to earn this pet';