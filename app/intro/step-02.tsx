import { View, StyleSheet, Text, ImageBackground, Dimensions } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import appStyles from '@/assets/stylesheets/appStyles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/supabase';
import { useStreakPetSystem } from '@/hooks/useStreakPetSystem';
import BottomMenuBar from '@/components/BottomMenuBar';
import { useHealthData, HealthDataSource } from '@/hooks/useHealthData';

const PetImage = require('@/assets/images/stork.png');
const BackgroundImage = require('@/assets/images/step-02-background.jpg');

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Index() {
  const navigation = useNavigation();
  const { 
    canEarnPet, 
    streakData, 
    recordGoalCompletion, 
    hasCompletedGoalToday,
    awardNewPet,
    getNextPetRequirement,
    loading: streakLoading 
  } = useStreakPetSystem();
  
  // Progress bar configuration
  const [requiredSteps, setRequiredSteps] = useState(1000);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [healthSource, setHealthSource] = useState<HealthDataSource>('pedometer');
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [hasPetToday, setHasPetToday] = useState(false);
  
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
        setLoading(false);
        router.push('/account');
        return;
      }
      
      setIsAuthenticated(true);

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
      } else {
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
      } else {
        setHealthSource('pedometer');
      }
      
      setSourceLoaded(true);
      
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError('Failed to load user preferences');
      setSourceLoaded(true);
    } finally {
      setLoading(false);
    }
  };
  //-----------------------------------


  // Check if user has already earned a pet today
  useEffect(() => {
    const checkPetToday = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('users_pets')
          .select('id')
          .eq('user_id', session.user.id)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
          .limit(1)
          .single();

        setHasPetToday(!!data);
      } catch (err) {
        console.error('Error checking pet today:', err);
      }
    };

    if (isAuthenticated) {
      checkPetToday();
    }
  }, [isAuthenticated]);





  
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

  // Calculate progress and record completion when steps or goal changes
  useEffect(() => {
    if (requiredSteps > 0) {
      const progress = Math.min((currentSteps / requiredSteps) * 100, 100);
      setProgressPercentage(progress);
      
      if (progress >= 100) {
        recordGoalCompletion(currentSteps, requiredSteps);
      }
    }
  }, [currentSteps, requiredSteps, recordGoalCompletion]);
  

  
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: screenHeight * 0.08 }]}>
          <View style={[appStyles.imageContainerTop, { marginTop: screenHeight * 0.02 }]}>
            <ImageViewer imgSource={PetImage} style={{ 
              width: screenWidth * 0.2, 
              height: screenHeight * 0.14,
              resizeMode: 'contain'
            }} />
          </View>
          <View style={appStyles.imageContainerBottom}>
            {loading || streakLoading ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Loading..." />
                <Text style={styles.authErrorText}>Setting up your challenge...</Text>
              </View>
            ) : !isAuthenticated ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Please sign in to start your step challenge!" />
                <Text style={styles.authErrorText}>You need to be signed in to track your steps and earn pets.</Text>
                <View style={styles.authButtonContainer}>
                  <Button 
                    theme="primary" 
                    label="Sign In" 
                    onPress={() => router.push('/account')} 
                  />
                </View>
              </View>
            ) : streakData.totalPetsEarned === 0 ? (
              <>
                <BaseText text="Welcome to Steppy! You get your first pet just for joining! Click continue to meet your new companion." />
                <Animatable.View animation="fadeIn" duration={800}>
                  <Button 
                    theme="primary" 
                    label="GET YOUR FIRST PET!" 
                    onPress={() => router.push('/intro/step-03')} 
                  />
                </Animatable.View>
              </>
            ) : hasPetToday ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="You've already earned your pet today! Come back tomorrow to continue building your streak and earn more pets." />
                <View style={styles.authButtonContainer}>
                  <Button 
                    theme="primary" 
                    label="VIEW MY PETS" 
                    onPress={() => router.push('/(tabs)/pets')} 
                  />
                </View>
              </View>
            ) : progressPercentage < 100 ? (
              <>
                {streakData.currentStreak >= 0 && (
                  <View style={styles.streakContainer}>
                    <Text style={styles.streakText}>
                      Current Streak: {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
                      {!canEarnPet && ` • ${getNextPetRequirement(streakData.totalPetsEarned) - streakData.currentStreak} more needed`}
                    </Text>
                    <View style={styles.flamesContainer}>
                      {Array.from({ length: Math.min(streakData.currentStreak, 10) }, (_, index) => (
                        <Animatable.Text
                          key={`active-${index}`}
                          animation="pulse"
                          iterationCount="infinite"
                          duration={1000 + (index * 100)}
                          style={styles.flameEmoji}
                        >
                          🔥
                        </Animatable.Text>
                      ))}
                      {!canEarnPet && streakData.currentStreak < 10 && (() => {
                        const remainingNeeded = getNextPetRequirement(streakData.totalPetsEarned) - streakData.currentStreak;
                        const flamesToShow = Math.min(remainingNeeded, 10 - streakData.currentStreak);
                        return Array.from({ length: flamesToShow }, (_, index) => (
                          <Text key={`remaining-${index}`} style={styles.dimFlameEmoji}>🔥</Text>
                        ));
                      })()}
                      {streakData.currentStreak > 10 && (
                        <Text style={styles.flameCount}>+{streakData.currentStreak - 10}</Text>
                      )}
                    </View>
                  </View>
                )}
                <Text style={styles.progressText}>
                  Walking... {Math.round(progressPercentage)}% complete ({currentSteps}/{requiredSteps} steps)
                </Text>
                <View style={styles.progressBarOuter}>
                  <Animatable.View 
                    animation="slideInLeft" 
                    duration={1000} 
                    style={[styles.progressBarInner, { width: `${progressPercentage}%` }]} 
                  />
                </View>
                <BaseText text={`Stork is ${requiredSteps} steps away. Keep building your ${streakData.currentStreak}-day streak!`} />
              </>
            ) : canEarnPet ? (
              <>
                <Text style={styles.progressText}>Challenge complete! 🎉</Text>
                <BaseText text="Congratulations! You've earned a new pet!" />
                <Animatable.View animation="fadeIn" duration={800}>
                  <Button 
                    theme="primary" 
                    label="GET YOUR NEW PET!" 
                    onPress={() => router.push('/intro/step-03')} 
                  />
                </Animatable.View>
              </>
            ) : (
              <>
                <Text style={styles.progressText}>Challenge complete! 🎉</Text>
                <View style={styles.streakContainer}>
                  <Text style={styles.streakText}>
                    Current Streak: {streakData.currentStreak} day{streakData.currentStreak !== 1 ? 's' : ''}
                    {!canEarnPet && ` • ${getNextPetRequirement(streakData.totalPetsEarned) - streakData.currentStreak} more needed`}
                  </Text>
                  <View style={styles.flamesContainer}>
                    {Array.from({ length: Math.min(streakData.currentStreak, 10) }, (_, index) => (
                      <Animatable.Text
                        key={`active-${index}`}
                        animation="pulse"
                        iterationCount="infinite"
                        duration={1000 + (index * 100)}
                        style={styles.flameEmoji}
                      >
                        🔥
                      </Animatable.Text>
                    ))}
                    {!canEarnPet && streakData.currentStreak < 10 && (() => {
                      const remainingNeeded = getNextPetRequirement(streakData.totalPetsEarned) - streakData.currentStreak;
                      const flamesToShow = Math.min(remainingNeeded, 10 - streakData.currentStreak);
                      return Array.from({ length: flamesToShow }, (_, index) => (
                        <Text key={`remaining-${index}`} style={styles.dimFlameEmoji}>🔥</Text>
                      ));
                    })()}
                    {streakData.currentStreak > 10 && (
                      <Text style={styles.flameCount}>+{streakData.currentStreak - 10}</Text>
                    )}
                  </View>
                </View>
                <BaseText text={`Great job! Keep building your streak. ${getNextPetRequirement(streakData.totalPetsEarned) - streakData.currentStreak} more days until your next pet.`} />
                <Animatable.View animation="fadeIn" duration={800}>
                  <Button 
                    theme="primary" 
                    label={`GREAT JOB! (${streakData.currentStreak} day streak)`} 
                    onPress={() => router.push('/(tabs)/pets')} 
                  />
                </Animatable.View>
              </>
            )}
            
            {error && isAuthenticated && (
              <Text style={styles.errorText}>Error: {error}</Text>
            )}
            
            {healthError && isAuthenticated && (
              <Text style={styles.errorText}>Health Data Error: {healthError}</Text>
            )}
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}

const styles = StyleSheet.create({
  streakContainer: {
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  streakText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  flamesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  flameEmoji: {
    fontSize: 18,
    marginHorizontal: 2,
  },
  dimFlameEmoji: {
    fontSize: 18,
    marginHorizontal: 2,
    opacity: 0.3,
  },
  flameCount: {
    color: '#ffa500',
    fontFamily: 'SourGummy',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dimFlameCount: {
    color: '#ffa500',
    fontFamily: 'SourGummy',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
    opacity: 0.4,
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
});
