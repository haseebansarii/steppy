import { View, StyleSheet, Text, ImageBackground } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import appStyles from '@/assets/stylesheets/appStyles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/supabase';
import { useDailyPetLimit } from '@/hooks/useDailyPetLimit';
import { useStepTracking } from '@/hooks/useStepTracking';
import BottomMenuBar from '@/components/BottomMenuBar';
import { useHealthData, HealthDataSource } from '@/hooks/useHealthData';

const PetImage = require('@/assets/images/stork.png');
const BackgroundImage = require('@/assets/images/step-02-background.jpg');

export default function Index() {
  const navigation = useNavigation();
  const { canEarnPet, streakInfo, loading: petLimitLoading } = useDailyPetLimit();
  const { updateStepCount, todaysSteps, goalReached } = useStepTracking();
  
  // Progress bar configuration
  const [requiredSteps, setRequiredSteps] = useState(1000);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingPet, setCheckingPet] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [healthSource, setHealthSource] = useState<HealthDataSource>('pedometer');
  const [sourceLoaded, setSourceLoaded] = useState(false);
  
  // Get real-time steps from useHealthData hook (only after source is loaded)
  const { steps: currentSteps, isAvailable, error: healthError, refreshSteps } = useHealthData(sourceLoaded ? healthSource : 'pedometer');
  
  // Manual refresh function
  const refreshData = async () => {
    // console.log('Step-02 screen focused, refreshing data...');
    await loadUserPreferences();
  };
  
  // Load user's step goal and health source from database
  const loadUserPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthenticated(false);
        setError('Please sign in to continue');
        setLoading(false);
        setAuthLoading(false);
    
        router.push('/account');
        return;
      }
      
      setIsAuthenticated(true);
      setAuthLoading(false);

      const { data, error } = await supabase
        .from('profiles')
        .select('step_goal, step_source')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error loading user preferences:', error);
        setError('Failed to load user preferences');
        return;
      }

      // Set step goal
      if (data.step_goal && data.step_goal > 0) {
        setRequiredSteps(data.step_goal);
        console.log('✅ Using step_goal from database:', data.step_goal);
      } else {
        console.log('⚠️ No step_goal found in database, using default 1000');
        setRequiredSteps(1000);
      }
      
      // Set health source (convert old sources to new format)
      if (data.step_source) {
        let newSource: HealthDataSource = 'pedometer';
        if (data.step_source === 'googleFit' || data.step_source === 'appleHealth' || data.step_source === 'healthIntegration') {
          newSource = 'healthIntegration';
        } else if (data.step_source === 'pedometer') {
          newSource = 'pedometer';
        }
        setHealthSource(newSource);
        console.log('✅ Using health source from database:', data.step_source, '-> converted to:', newSource);
      } else {
        console.log('⚠️ No step_source found in database, using default pedometer');
        setHealthSource('pedometer');
      }
      
      setSourceLoaded(true); // Mark source as loaded
      
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError('Failed to load user preferences');
      setSourceLoaded(true); // Still mark as loaded to prevent infinite loading
    } finally {
      setLoading(false);
    }
  };
  


  // Check if user has already earned a pet today
 useEffect(() => {
    const checkExistingPet = async () => {
      try {
        // TESTING MODE: Skip daily limit check
        // console.log('Testing mode: Skipping daily pet limit check');
        setCheckingPet(false);
        return;
        
        /* COMMENTED OUT FOR TESTING - UNCOMMENT FOR PRODUCTION
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('users_pets')
          .select('id')
          .eq('user_id', session.user.id)
          .gte('created_at', ${today}T00:00:00.000Z)
          .lt('created_at', ${today}T23:59:59.999Z)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          // User has already earned a pet today, redirect to congratulations
          console.log('User already earned a pet today, redirecting to congratulations');
          router.push(/intro/step-05?id=${data.id});
          return;
        }
        */
      } catch (err) {
        console.error('Error checking existing pet:', err);
      } finally {
        setCheckingPet(false);
      }
    };

    checkExistingPet();
  }, []);





  
  // Load user preferences on component mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // console.log('Step-02 screen focused, refreshing data...');
      refreshData();
    }, [])
  );

  // Calculate progress when steps or goal changes
  useEffect(() => {
    if (requiredSteps > 0) {
      const progress = Math.min((currentSteps / requiredSteps) * 100, 100);
      setProgressPercentage(progress);
      // console.log(`Progress calculation: ${currentSteps} steps / ${requiredSteps} goal = ${progress.toFixed(1)}%`);
      
      if (progress >= 100) {
        setShowContinueButton(true);
        // Update step count in database when goal is reached
        updateStepCount(currentSteps, requiredSteps);
      } else {
        setShowContinueButton(false);
      }
    }
  }, [currentSteps, requiredSteps]);
  
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
          <View style={appStyles.imageContainerTop}>
            <ImageViewer imgSource={PetImage} style={{ width: 80, height: 110 }} />
          </View>
          <View style={appStyles.imageContainerBottom}>
            <View style={styles.progressBarContainer}>
              <Text style={styles.progressText}>
                {authLoading 
                  ? "Loading..." 
                  : checkingPet 
                    ? "Checking your progress..." 
                    : loading 
                      ? "Loading progress..." 
                      : progressPercentage < 100 
                        ? `Walking... ${Math.round(progressPercentage)}% complete (${currentSteps}/${requiredSteps} steps)` 
                        : canEarnPet 
                          ? "Challenge complete! You can earn a pet!" 
                          : "Goal reached! Keep your streak going!"}
              </Text>

              <View style={styles.progressBarOuter}>
                <Animatable.View 
                  animation="slideInLeft" 
                  duration={1000} 
                  style={[styles.progressBarInner, { width: `${progressPercentage}%` }]} 
                />
              </View>
            </View>
            {authLoading ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Loading..." />
                <Text style={styles.authErrorText}>
                  Checking your authentication status...
                </Text>
              </View>
            ) : !isAuthenticated ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Please sign in to start your step challenge!" />
                <Text style={styles.authErrorText}>
                  You need to be signed in to track your steps and earn pets.
                </Text>
                <View style={styles.authButtonContainer}>
                  <Button 
                    theme="primary" 
                    label="Sign In" 
                    onPress={() => router.push('/account')} 
                  />
                </View>
              </View>
            ) : checkingPet ? (
              <BaseText text="Please wait while we check your progress..." />
            ) : !canEarnPet ? (
              <View style={styles.streakInfoContainer}>
                <BaseText text={`You need a ${streakInfo.requiredStreak}-day streak to earn your ${streakInfo.petCount === 0 ? 'first' : 'next'} pet!`} />
                <Text style={styles.streakText}>
                  Current streak: {streakInfo.currentStreak}/{streakInfo.requiredStreak} days
                </Text>
                <Text style={styles.streakText}>
                  {streakInfo.petCount === 0 
                    ? "Complete your daily goal to start your journey!" 
                    : streakInfo.petCount === 1 
                      ? "Keep going! You need a 3-day streak for your second pet."
                      : "Maintain your 7-day streak to earn another pet!"}
                </Text>
              </View>
            ) : (
              <View style={styles.streakInfoContainer}>
                <BaseText text={`Great job! You can earn a pet today!`} />
                <Text style={styles.streakText}>
                  Streak: {streakInfo.currentStreak}/{streakInfo.requiredStreak} days ✅
                </Text>
                <BaseText text={`Stork is ${requiredSteps} steps away. Can you walk ${requiredSteps} steps to reach him?`} />
              </View>
            )}
            
            {error && isAuthenticated && (
              <Text style={styles.errorText}>
                Error: {error}
              </Text>
            )}
            
            {healthError && isAuthenticated && (
              <Text style={styles.errorText}>
                Health Data Error: {healthError}
              </Text>
            )}
            
            {showContinueButton && canEarnPet && (
              <Animatable.View 
                animation="fadeIn" 
                duration={800}
              >
                <Button theme="primary" label="CONTINUE" onPress={() => router.push('/intro/step-03')} />
              </Animatable.View>
            )}
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}

const styles = StyleSheet.create({
  progressBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBarOuter: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#b94ea5',
    borderRadius: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  warningText: {
    color: '#ffa500',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  authErrorContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authErrorText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    opacity: 0.8,
  },
  authButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  streakInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  streakText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 5,
    opacity: 0.9,
  },
});
