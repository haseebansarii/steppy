import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

interface StreakData {
  currentStreak: number;
  totalPetsEarned: number;
  lastGoalDate: string | null;
  nextPetRequirement: number;
}

export function useStreakPetSystem() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    totalPetsEarned: 0,
    lastGoalDate: null,
    nextPetRequirement: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEarnPet, setCanEarnPet] = useState(false);

  // Calculate what streak requirement is needed for the next pet
  const getNextPetRequirement = (totalPetsEarned: number): number => {
    if (totalPetsEarned === 0) {
      // First pet: immediate on joining (no streak required)
      return 0;
    } else if (totalPetsEarned === 1) {
      // Second pet: 3 consecutive days
      return 3;
    } else {
      // All subsequent pets: 7 consecutive days
      return 7;
    }
  };

  // Record a goal completion for today
  const recordGoalCompletion = async (stepsAchieved: number, goalSteps: number): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const today = new Date().toISOString().split('T')[0];
      const goalMet = stepsAchieved >= goalSteps;

      // Insert or update today's goal completion
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
        console.error('Error recording goal completion:', error);
        return false;
      }

      return goalMet;
    } catch (err) {
      console.error('Error recording goal completion:', err);
      return false;
    }
  };

  // Check if user has completed their goal today
  const hasCompletedGoalToday = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const today = new Date().toISOString().split('T')[0];

      // Check if goal was completed today
      const { data: completion } = await supabase
        .from('goal_completions')
        .select('goal_met')
        .eq('user_id', session.user.id)
        .eq('completion_date', today)
        .single();

      return completion?.goal_met || false;
    } catch (err) {
      console.error('Error checking goal completion:', err);
      return false;
    }
  };

  // Get current streak from profile
  const getCurrentStreak = async (userId: string): Promise<{ streak: number, lastGoalDate: string | null }> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, last_streak_update')
        .eq('id', userId)
        .single();

      const streak = profile?.current_streak || 0;
      const lastGoalDate = profile?.last_streak_update || null;

      return { streak, lastGoalDate };
    } catch (err) {
      console.error('Error getting current streak:', err);
      return { streak: 0, lastGoalDate: null };
    }
  };

  // Check if user is eligible to earn a new pet
  const checkPetEligibility = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('No session found');
        return;
      }

      // Get total pets earned by user
      const { data: userPets, error: petsError } = await supabase
        .from('users_pets')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (petsError) {
        setError('Failed to load pet data');
        return;
      }

      const totalPetsEarned = userPets?.length || 0;
      const nextRequirement = getNextPetRequirement(totalPetsEarned);

      // Get current streak
      const { streak, lastGoalDate } = await getCurrentStreak(session.user.id);

      // Check if user has completed goal today
      const completedToday = await hasCompletedGoalToday();

      // Calculate streak since last pet was earned
      let streakSinceLastPet = streak;
      
      if (totalPetsEarned > 0) {
        // Get the date when the last pet was earned
        const lastPet = userPets?.[userPets.length - 1];
        if (lastPet) {
          const lastPetDate = new Date(lastPet.created_at).toISOString().split('T')[0];
          
          // Count consecutive goal completions since the last pet was earned (excluding the day the pet was earned)
          const { data: goalsSinceLastPet } = await supabase
            .from('goal_completions')
            .select('completion_date, goal_met')
            .eq('user_id', session.user.id)
            .gt('completion_date', lastPetDate)
            .order('completion_date', { ascending: false });

          // Calculate consecutive streak from today backwards
          streakSinceLastPet = 0;
          if (goalsSinceLastPet) {
            const today = new Date().toISOString().split('T')[0];
            let currentDate = new Date(today);
            
            for (const goal of goalsSinceLastPet) {
              const goalDate = goal.completion_date;
              const expectedDate = currentDate.toISOString().split('T')[0];
              
              if (goalDate === expectedDate && goal.goal_met) {
                streakSinceLastPet++;
                currentDate.setDate(currentDate.getDate() - 1); // Move to previous day
              } else if (goalDate === expectedDate && !goal.goal_met) {
                break; // Streak broken
              } else {
                // Gap in dates, streak broken
                break;
              }
            }
          }
        }
      }

      // Determine if user can earn a pet
      let canEarn = false;
      
      if (totalPetsEarned === 0) {
        // First pet: can earn immediately upon joining
        canEarn = true;
      } else if (completedToday && streakSinceLastPet >= nextRequirement) {
        // Subsequent pets: need to meet streak requirement since last pet and complete goal today
        canEarn = true;
      }

      setStreakData({
        currentStreak: totalPetsEarned === 0 ? streak : streakSinceLastPet,
        totalPetsEarned,
        lastGoalDate,
        nextPetRequirement: nextRequirement
      });

      setCanEarnPet(canEarn);

    } catch (err) {
      console.error('Error checking pet eligibility:', err);
      setError('Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  };

  // Award a new pet to the user
  const awardNewPet = async (): Promise<{ success: boolean, petId?: number, error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'No session found' };
      }

      // Check if user is eligible
      if (!canEarnPet) {
        return { success: false, error: 'User is not eligible to earn a pet' };
      }

      // Get a random pet that user doesn't already have
      const { data: userPetIds } = await supabase
        .from('users_pets')
        .select('pet_id')
        .eq('user_id', session.user.id);

      const ownedPetIds = userPetIds?.map(up => up.pet_id) || [];

      let randomPetQuery = supabase.from('pets').select('*');
      
      if (ownedPetIds.length > 0) {
        randomPetQuery = randomPetQuery.not('id', 'in', `(${ownedPetIds.join(',')})`);
      }

      const { data: randomPet, error: petError } = await randomPetQuery
        .order('random()')
        .limit(1)
        .single();

      if (petError || !randomPet) {
        return { success: false, error: 'Failed to get random pet' };
      }

      const currentRequirement = getNextPetRequirement(streakData.totalPetsEarned);

      // Award the pet to the user with streak metadata
      const { data: userPet, error: awardError } = await supabase
        .from('users_pets')
        .insert({
          user_id: session.user.id,
          pet_id: randomPet.id,
          earned_via_streak: streakData.totalPetsEarned > 0, // First pet is not streak-based
          streak_requirement: currentRequirement
        })
        .select('id')
        .single();

      if (awardError || !userPet) {
        return { success: false, error: 'Failed to award pet' };
      }

      // Refresh eligibility after awarding pet
      await checkPetEligibility();

      return { success: true, petId: userPet.id };

    } catch (err) {
      console.error('Error awarding pet:', err);
      return { success: false, error: 'Failed to award pet' };
    }
  };

  useEffect(() => {
    checkPetEligibility();
  }, []);

  return {
    streakData,
    canEarnPet,
    loading,
    error,
    checkPetEligibility,
    awardNewPet,
    recordGoalCompletion,
    hasCompletedGoalToday,
    getNextPetRequirement
  };
}