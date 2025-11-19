import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

interface FurnitureGiftData {
  hasEarnedFurnitureToday: boolean;
  totalFurnitureEarned: number;
  lastFurnitureDate: string | null;
}

export const useFurnitureGiftSystem = () => {
  const [furnitureData, setFurnitureData] = useState<FurnitureGiftData>({
    hasEarnedFurnitureToday: false,
    totalFurnitureEarned: 0,
    lastFurnitureDate: null
  });
  const [canEarnFurniture, setCanEarnFurniture] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has reached their daily goal and is eligible for furniture
  const checkFurnitureEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No session found');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if user has already earned furniture today
      const { data: todaysFurniture } = await supabase
        .from('users_furniture')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const hasEarnedToday = (todaysFurniture?.length || 0) > 0;

      // Get total furniture count
      const { data: allFurniture } = await supabase
        .from('users_furniture')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      const totalFurniture = allFurniture?.length || 0;

      // Get last furniture date
      const lastDate = allFurniture?.[0]?.created_at 
        ? new Date(allFurniture[0].created_at).toISOString().split('T')[0]
        : null;

      // Check if user completed their goal today
      const { data: goalCompletion } = await supabase
        .from('goal_completions')
        .select('goal_met')
        .eq('user_id', session.user.id)
        .eq('completion_date', today)
        .single();

      const completedGoalToday = goalCompletion?.goal_met || false;

      // User can earn furniture if they completed goal today and haven't earned furniture today
      const canEarn = completedGoalToday && !hasEarnedToday;

      setFurnitureData({
        hasEarnedFurnitureToday: hasEarnedToday,
        totalFurnitureEarned: totalFurniture,
        lastFurnitureDate: lastDate
      });

      setCanEarnFurniture(canEarn);

    } catch (err) {
      console.error('Error checking furniture eligibility:', err);
      setError('Failed to check furniture eligibility');
    } finally {
      setLoading(false);
    }
  };

  // Award a new furniture item to the user
  const awardNewFurniture = async (): Promise<{ success: boolean, furnitureId?: number, error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'No session found' };
      }

      if (!canEarnFurniture) {
        return { success: false, error: 'User is not eligible to earn furniture' };
      }

      // Get a random furniture item
      console.log('Fetching random furniture from database...');
      
      // First get all furniture items
      const { data: allFurniture, error: fetchError } = await supabase
        .from('furniture')
        .select('*');

      if (fetchError || !allFurniture || allFurniture.length === 0) {
        console.error('No furniture found in database:', fetchError);
        return { success: false, error: `No furniture available in database. Please add furniture items first. Error: ${fetchError?.message}` };
      }

      // Select a random furniture item from the results
      const randomIndex = Math.floor(Math.random() * allFurniture.length);
      const randomFurniture = allFurniture[randomIndex];

      console.log('Random furniture result:', { randomFurniture, fetchError });

      // The error check is already handled above, this is just a safety check
      if (!randomFurniture) {
        console.error('No furniture selected');
        return { success: false, error: 'No furniture available' };
      }

      // Award the furniture to the user using the proper furniture_id
      const { data: userFurniture, error: awardError } = await supabase
        .from('users_furniture')
        .insert({
          user_id: session.user.id,
          furniture_id: randomFurniture.id
        })
        .select('id')
        .single();

      if (awardError || !userFurniture) {
        return { success: false, error: 'Failed to award furniture' };
      }

      // Update the profile's last furniture date
      await supabase
        .from('profiles')
        .update({ last_furniture_date: new Date().toISOString().split('T')[0] })
        .eq('id', session.user.id);

      // Refresh eligibility after awarding furniture
      await checkFurnitureEligibility();

      return { success: true, furnitureId: userFurniture.id };

    } catch (err) {
      console.error('Error awarding furniture:', err);
      return { success: false, error: 'Failed to award furniture' };
    }
  };

  // Record goal completion for furniture system (separate from pet system)
  const recordGoalCompletionForFurniture = async (stepsAchieved: number, goalSteps: number): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const today = new Date().toISOString().split('T')[0];
      const goalMet = stepsAchieved >= goalSteps;

      // Insert or update today's goal completion (this table is shared with pet system)
      const { error } = await supabase
        .from('goal_completions')
        .upsert({
          user_id: session.user.id,
          completion_date: today,
          steps_achieved: stepsAchieved,
          goal_steps: goalSteps,
          goal_met: goalMet
        }, {
          onConflict: 'user_id,completion_date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error recording goal completion for furniture:', error);
        return false;
      }

      // Refresh furniture eligibility after goal completion
      await checkFurnitureEligibility();

      return goalMet;
    } catch (err) {
      console.error('Error recording goal completion for furniture:', err);
      return false;
    }
  };

  useEffect(() => {
    checkFurnitureEligibility();
  }, []);

  return {
    furnitureData,
    canEarnFurniture,
    loading,
    error,
    checkFurnitureEligibility,
    awardNewFurniture,
    recordGoalCompletionForFurniture
  };
};