import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';

export function useDailyPetLimit() {
  const [hasEarnedPetToday, setHasEarnedPetToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkDailyPetLimit = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('No session found');
          setLoading(false);
          return;
        }

        // // TESTING MODE: Disable daily pet limit check
        // console.log('TESTING MODE: Daily pet limit is disabled - allowing multiple pets per day');
        // setHasEarnedPetToday(false); // Always return false to allow unlimited pets
        
        // ORIGINAL CODE - UNCOMMENT FOR PRODUCTION:
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Check if user has earned a pet today
        const { data, error } = await supabase
          .from('users_pets')
          .select('id, created_at')
          .eq('user_id', session.user.id)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`);

        if (error) {
          console.error('Error checking daily pet limit:', error);
          setError('Failed to check daily limit');
          return;
        }

        // If any pets were earned today, set the limit
        setHasEarnedPetToday(data && data.length > 0);
        
        
      } catch (err) {
        console.error('Error in useDailyPetLimit:', err);
        setError('Failed to check daily limit');
      } finally {
        setLoading(false);
      }
    };

    checkDailyPetLimit();
  }, []);

  return {
    hasEarnedPetToday,
    loading,
    error
  };
}