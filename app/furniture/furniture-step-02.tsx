import { View, StyleSheet, Text, ImageBackground } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import appStyles from '@/assets/stylesheets/appStyles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { router } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/components/supabase';
import { useFurnitureGiftSystem } from '@/hooks/useFurnitureGiftSystem';
import BottomMenuBar from '@/components/BottomMenuBar';
import { useHealthData, HealthDataSource } from '@/hooks/useHealthData';

// Using existing stork image as gift box
const GiftBoxImage = require('@/assets/images/gift-box.png');
const BackgroundImage = require('@/assets/images/step-02-background.jpg');

export default function FurnitureStep02() {
  const navigation = useNavigation();
  const { 
    canEarnFurniture, 
    furnitureData, 
    recordGoalCompletionForFurniture,
    loading: furnitureLoading 
  } = useFurnitureGiftSystem();
  
  // Progress bar configuration
  const [requiredSteps, setRequiredSteps] = useState(1000);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingGift, setCheckingGift] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [healthSource, setHealthSource] = useState<HealthDataSource>('pedometer');
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [goalCompletedToday, setGoalCompletedToday] = useState(false);
  
  // Use ref to prevent multiple goal completion recordings
  const goalRecordedRef = useRef(false);
  
  // Get real-time steps from useHealthData hook (only after source is loaded)
  const { steps: currentSteps, isAvailable, error: healthError, refreshSteps } = useHealthData(sourceLoaded ? healthSource : 'pedometer');
  
  // Manual refresh function
  const refreshData = async () => {
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
      } else {
        setRequiredSteps(1000);
      }
      
      // Set health source
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

  // Check if user has already earned furniture today
  useEffect(() => {
    const checkExistingGift = async () => {
      try {
        setCheckingGift(false);
      } catch (err) {
        console.error('Error checking existing gift:', err);
      } finally {
        setCheckingGift(false);
      }
    };

    checkExistingGift();
  }, []);

  // Load user preferences on component mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Refresh data when screen focuses
  useFocusEffect(
    useCallback(() => {
      refreshData();
      refreshSteps();
    }, [])
  );

  // Calculate progress when steps or goal changes
  useEffect(() => {
    if (requiredSteps > 0) {
      const progress = Math.min((currentSteps / requiredSteps) * 100, 100);
      setProgressPercentage(progress);
      
      if (progress >= 100) {
        setShowContinueButton(true);
        // Record goal completion when reached (only once)
        if (!goalRecordedRef.current) {
          goalRecordedRef.current = true;
          recordGoalCompletionForFurniture(currentSteps, requiredSteps);
        }
      } else {
        setShowContinueButton(false);
        goalRecordedRef.current = false; // Reset if progress drops below 100%
      }
    }
  }, [currentSteps, requiredSteps]);

  // Check if goal was completed today on component mount
  useEffect(() => {
    const checkTodaysGoal = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: completion } = await supabase
        .from('goal_completions')
        .select('goal_met')
        .eq('user_id', session.user.id)
        .eq('completion_date', today)
        .single();

      setGoalCompletedToday(completion?.goal_met || false);
    };
    
    if (isAuthenticated && !authLoading) {
      checkTodaysGoal();
    }
  }, [isAuthenticated, authLoading]);
  
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
          <View style={appStyles.imageContainerTop}>
            <ImageViewer imgSource={GiftBoxImage} style={{ width: 80, height: 110 }} />
          </View>
          <View style={appStyles.imageContainerBottom}>
            {!authLoading && !checkingGift && !furnitureLoading && !loading && isAuthenticated && (
              <View style={styles.progressBarContainer}>
                <Text style={styles.progressText}>
                  {progressPercentage < 100 
                    ? `Walking... ${Math.round(progressPercentage)}% complete (${currentSteps}/${requiredSteps} steps)` 
                    : "Challenge complete!"}
                </Text>

                <View style={styles.progressBarOuter}>
                  <Animatable.View 
                    animation="slideInLeft" 
                    duration={1000} 
                    style={[styles.progressBarInner, { width: `${progressPercentage}%` }]} 
                  />
                </View>
              </View>
            )}
            
            {authLoading || checkingGift || furnitureLoading || loading ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Loading..." />
                <Text style={styles.authErrorText}>
                  Setting up your gift challenge...
                </Text>
              </View>
            ) : !isAuthenticated ? (
              <View style={styles.authErrorContainer}>
                <BaseText text="Please sign in to start your gift challenge!" />
                <Text style={styles.authErrorText}>
                  You need to be signed in to track your steps and earn gifts.
                </Text>
                <View style={styles.authButtonContainer}>
                  <Button 
                    theme="primary" 
                    label="Sign In" 
                    onPress={() => router.push('/account')} 
                  />
                </View>
              </View>
            ) : furnitureData.hasEarnedFurnitureToday ? (
              <BaseText text="You've already earned your furniture gift today! Come back tomorrow for another challenge." />
            ) : goalCompletedToday && canEarnFurniture ? (
              <BaseText text="You got a gift! Your daily goal is complete and you're eligible for a furniture reward!" />
            ) : (
              <BaseText text="Gift box is waiting! Complete your daily step goal to unlock today's furniture gift." />
            )}
            
            {!authLoading && !checkingGift && !furnitureLoading && !loading && error && isAuthenticated && (
              <Text style={styles.errorText}>
                Error: {error}
              </Text>
            )}
            
            {!authLoading && !checkingGift && !furnitureLoading && !loading && healthError && isAuthenticated && (
              <Text style={styles.errorText}>
                Health Data Error: {healthError}
              </Text>
            )}
            
            {!authLoading && !checkingGift && !furnitureLoading && !loading && isAuthenticated && (showContinueButton || (goalCompletedToday && canEarnFurniture)) && (
              <Animatable.View 
                animation="fadeIn" 
                duration={800}
              >
                {canEarnFurniture ? (
                  <Button 
                    theme="primary" 
                    label="OPEN YOUR GIFT!" 
                    onPress={() => router.push('/furniture/furniture-step-03')} 
                  />
                ) : furnitureData.hasEarnedFurnitureToday ? (
                  <Button 
                    theme="primary" 
                    label="VIEW YOUR FURNITURE" 
                    onPress={() => router.push('/(tabs)/furniture')} 
                  />
                ) : (
                  <Button 
                    theme="primary" 
                    label="GREAT JOB! GOAL COMPLETE!" 
                    onPress={() => router.push('/(tabs)/furniture')} 
                  />
                )}
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