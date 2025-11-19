import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

export function useStepTracking() {
  const [todaysSteps, setTodaysSteps] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateStepCount = async (stepCount: number, stepGoal: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const today = new Date().toISOString().split('T')[0];
      const isGoalReached = stepCount >= stepGoal;

      const { error } = await supabase
        .from('daily_steps')
        .upsert({
          user_id: session.user.id,
          date: today,
          step_count: stepCount,
          goal_reached: isGoalReached,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        throw error;
      }

      setTodaysSteps(stepCount);
      setGoalReached(isGoalReached);
      
      return { success: true, goalReached: isGoalReached };
    } catch (err) {
      console.error('Error updating step count:', err);
      setError(err instanceof Error ? err.message : 'Failed to update steps');
      return { success: false, error: err };
    }
  };

  const getTodaysSteps = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_steps')
        .select('step_count, goal_reached')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setTodaysSteps(data.step_count);
        setGoalReached(data.goal_reached);
      } else {
        setTodaysSteps(0);
        setGoalReached(false);
      }

    } catch (err) {
      console.error('Error fetching today\'s steps:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch steps');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTodaysSteps();
  }, []);

  return {
    todaysSteps,
    goalReached,
    loading,
    error,
    updateStepCount,
    refreshSteps: getTodaysSteps
  };
}