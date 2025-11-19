import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

export function useDailyPetLimit() {
  const [canEarnPet, setCanEarnPet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakInfo, setStreakInfo] = useState({ 
    currentStreak: 0, 
    requiredStreak: 1, // Start with 1 for first pet
    petCount: 0 
  });

  useEffect(() => {
    const checkPetEligibility = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('No session found');
          setLoading(false);
          return;
        }

        // Get user's profile and pet count
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('step_goal')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to fetch user profile');
          return;
        }

        // Get user's pet count
        const { data: pets, error: petsError } = await supabase
          .from('users_pets')
          .select('id, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (petsError) {
          console.error('Error fetching pets:', petsError);
          setError('Failed to fetch pets');
          return;
        }

        const petCount = pets?.length || 0;
        
        // Determine required streak based on pet count
        let requiredStreak;
        if (petCount === 0) {
          requiredStreak = 1; // First pet - just need to reach goal once
        } else if (petCount === 1) {
          requiredStreak = 3; // Second pet - need 3-day streak
        } else {
          requiredStreak = 7; // All subsequent pets - need 7-day streak
        }

        // Check current streak by examining recent step data
        // This is a simplified check - you may need to implement actual step tracking
        const currentStreak = await calculateCurrentStreak(session.user.id, profile.step_goal);
        
        setStreakInfo({
          currentStreak,
          requiredStreak,
          petCount
        });

        // User can earn a pet if their current streak meets or exceeds required streak
        setCanEarnPet(currentStreak >= requiredStreak);
        
      } catch (err) {
        console.error('Error in checkPetEligibility:', err);
        setError('Failed to check pet eligibility');
      } finally {
        setLoading(false);
      }
    };

    checkPetEligibility();
  }, []);

  // Helper function to calculate current streak
  const calculateCurrentStreak = async (userId: string, stepGoal: number): Promise<number> => {
    try {
      // Get the last 30 days of step data to calculate streak
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: stepData, error } = await supabase
        .from('daily_steps')
        .select('date, step_count, goal_reached')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching step data:', error);
        return 0;
      }

      if (!stepData || stepData.length === 0) {
        return 0;
      }

      // Calculate current streak by counting consecutive days with goal reached
      let currentStreak = 0;
      for (const day of stepData) {
        if (day.goal_reached || day.step_count >= stepGoal) {
          currentStreak++;
        } else {
          break; // Streak is broken
        }
      }

      return currentStreak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  return {
    canEarnPet,
    streakInfo,
    loading,
    error
  };
}