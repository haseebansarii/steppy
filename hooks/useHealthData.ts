import { useState, useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import GoogleFit, { BucketUnit, Scopes } from 'react-native-google-fit';
import AppleHealthKit, { HealthInputOptions } from 'react-native-health';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Background task name
const BACKGROUND_STEP_TASK = 'background-step-task';

// Register background task
TaskManager.defineTask(BACKGROUND_STEP_TASK, async () => {
  try {
    console.log('Background task: Checking for missed steps...');
    
    // Get step count from health services when app was closed
    if (Platform.OS === 'android') {
      // Use Google Fit to get steps since last sync
      const steps = await getGoogleFitStepsForBackgroundTask();
      await syncBackgroundSteps(steps, 'health');
    } else if (Platform.OS === 'ios') {
      // Use Apple Health to get steps since last sync
      const steps = await getAppleHealthStepsForBackgroundTask();
      await syncBackgroundSteps(steps, 'health');
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Helper function to sync background steps
const syncBackgroundSteps = async (healthSteps: number, source: 'health' | 'pedometer') => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const savedData = await AsyncStorage.getItem('pedometer_steps');
    
    if (savedData) {
      const { steps: savedSteps, date } = JSON.parse(savedData);
      
      if (date === today) {
        // If health integration shows more steps than our saved pedometer steps,
        // it means steps were taken while app was closed
        if (healthSteps > savedSteps) {
          const missedSteps = healthSteps - savedSteps;
          console.log(`Background sync: Found ${missedSteps} missed steps from health integration`);
          
          // Update our pedometer count with missed steps
          const newTotal = savedSteps + missedSteps;
          await AsyncStorage.setItem('pedometer_steps', JSON.stringify({
            steps: newTotal,
            date: today,
            lastHealthSync: healthSteps
          }));
          
          console.log(`Background sync: Updated pedometer from ${savedSteps} to ${newTotal}`);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing background steps:', error);
  }
};

// Background health check functions
const getGoogleFitStepsForBackgroundTask = async (): Promise<number> => {
  try {
    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date();

    const res = await GoogleFit.getDailyStepCountSamples({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      bucketUnit: BucketUnit.DAY,
      bucketInterval: 1,
    });

    const stepsData = res.find(
      (data) => data.source === 'com.google.android.gms:estimated_steps'
    ) || res[0];

    return stepsData?.steps?.[0]?.value || 0;
  } catch (error) {
    console.error('Background Google Fit error:', error);
    return 0;
  }
};

const getAppleHealthStepsForBackgroundTask = async (): Promise<number> => {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getStepCount(
      options,
      (error: Object, results: { value: number }) => {
        if (error) {
          console.error('Background Apple Health error:', error);
          resolve(0);
        } else {
          resolve(results.value);
        }
      }
    );
  });
};

// Global singleton for pedometer to prevent multiple initializations
class PedometerManager {
  private static instance: PedometerManager;
  private subscription: any = null;
  private currentSteps: number = 0;
  private listeners: Set<(steps: number) => void> = new Set();
  private isInitialized: boolean = false;
  private lastSaveDate: string = '';
  private persistTimeout: any = null;
  private appStateSubscription: any = null;
  private sessionStartSteps: number = 0;
  private lastWatchStepCount: number = 0;

  static getInstance(): PedometerManager {
    if (!PedometerManager.instance) {
      PedometerManager.instance = new PedometerManager();
    }
    return PedometerManager.instance;
  }



  // Debounced persist to avoid too many writes but ensure data is saved
  private debouncedPersist(steps: number): void {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    
    // Save after 2 seconds of inactivity, or immediately if it's a significant change
    const delay = 2000;
    this.persistTimeout = setTimeout(() => {
      this.persistSteps(steps);
      console.log('Auto-saved pedometer steps:', steps);
    }, delay);
  }

  private async loadPersistedSteps(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedData = await AsyncStorage.getItem('pedometer_steps');
      
      if (savedData) {
        const { steps, date } = JSON.parse(savedData);
        
        if (date === today) {
          console.log('Same day: Restored pedometer steps from storage:', steps);
          return steps;
        } else {
          console.log('New day detected, resetting pedometer from', steps, 'to 0');
          await this.persistSteps(0, today);
          return 0;
        }
      } else {
        console.log('No saved pedometer data found, starting from 0');
        await this.persistSteps(0, today);
        return 0;
      }
    } catch (error) {
      console.error('Error loading persisted steps:', error);
      return 0;
    }
  }

  private async persistSteps(steps: number, date?: string): Promise<void> {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      const data = { 
        steps, 
        date: today, 
        timestamp: Date.now() 
      };
      await AsyncStorage.setItem('pedometer_steps', JSON.stringify(data));
      this.lastSaveDate = today;
    } catch (error) {
      console.error('Error persisting steps:', error);
    }
  }

  private async persistStepsWithHealthSync(steps: number, healthSteps: number, date?: string): Promise<void> {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      const data = { 
        steps, 
        date: today, 
        lastHealthSync: healthSteps,
        timestamp: Date.now() 
      };
      await AsyncStorage.setItem('pedometer_steps', JSON.stringify(data));
      this.lastSaveDate = today;
    } catch (error) {
      console.error('Error persisting steps with health sync:', error);
    }
  }

  private async resetStepsForToday(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('Resetting pedometer steps for today to fix over-counting');
      await this.persistSteps(0, today);
    } catch (error) {
      console.error('Error resetting steps:', error);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('Pedometer already initialized, current steps:', this.currentSteps);
      return true;
    }

    try {
      console.log('Initializing global pedometer manager...');
      
      // Register background fetch for step syncing when app is closed
      await this.registerBackgroundFetch();
      
      const isAvailable = await Pedometer.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Pedometer not available');
      }

      const { status } = await Pedometer.requestPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission not granted');
      }

      // Load persisted steps from today, only reset if new day
      this.currentSteps = await this.loadPersistedSteps();
      console.log('Global pedometer: Loaded persisted steps:', this.currentSteps);
      
      // Check for missed steps while app was closed (sync with health data)
      await this.syncMissedSteps();
      
      // Reset watch step counter for this session
      this.lastWatchStepCount = 0;
      
      // Subscribe to step updates - handle cumulative values properly
      this.subscription = Pedometer.watchStepCount(result => {
        // result.steps appears to be cumulative from session start
        // Calculate actual increment since last callback
        const actualIncrement = result.steps - this.lastWatchStepCount;
        this.lastWatchStepCount = result.steps;
        
        if (actualIncrement > 0) {
          this.currentSteps += actualIncrement;
          console.log(`Pedometer: +${actualIncrement} steps (session: ${result.steps}, total: ${this.currentSteps})`);
          
          // Persist the step count
          this.debouncedPersist(this.currentSteps);
          
          // Notify all listeners
          this.listeners.forEach(listener => listener(this.currentSteps));
        }
      });

      // Listen for app state changes to save steps when app goes to background
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      this.isInitialized = true;
      console.log('Global pedometer initialized successfully');
      return true;
    } catch (error) {
      console.error('Global pedometer initialization error:', error);
      return false;
    }
  }

  private handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('App going to background, saving pedometer steps immediately:', this.currentSteps);
      // Cancel any pending debounced save and save immediately
      if (this.persistTimeout) {
        clearTimeout(this.persistTimeout);
        this.persistTimeout = null;
      }
      
      // Save with current health sync data for accurate missed step calculation
      try {
        let currentHealthSteps = 0;
        if (Platform.OS === 'android') {
          currentHealthSteps = await getGoogleFitStepsForBackgroundTask();
        } else if (Platform.OS === 'ios') {
          currentHealthSteps = await getAppleHealthStepsForBackgroundTask();
        }
        await this.persistStepsWithHealthSync(this.currentSteps, currentHealthSteps);
        console.log(`Saved pedometer: ${this.currentSteps}, health: ${currentHealthSteps}`);
      } catch (error) {
        console.error('Error saving with health sync:', error);
        await this.persistSteps(this.currentSteps);
      }
    } else if (nextAppState === 'active') {
      console.log('App became active, checking for missed steps...');
      // When app becomes active again, sync any missed steps
      await this.syncMissedSteps();
    }
  };

  private async registerBackgroundFetch(): Promise<void> {
    try {
      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: true, // Start on device boot
      });
      console.log('Background fetch registered successfully');
    } catch (error) {
      console.error('Error registering background fetch:', error);
    }
  }

  private async syncMissedSteps(): Promise<void> {
    try {
      console.log('Checking for missed steps while app was closed...');
      
      // Get current health integration steps to detect missed steps
      let currentHealthSteps = 0;
      
      if (Platform.OS === 'android') {
        currentHealthSteps = await getGoogleFitStepsForBackgroundTask();
      } else if (Platform.OS === 'ios') {
        currentHealthSteps = await getAppleHealthStepsForBackgroundTask();
      }
      
      if (currentHealthSteps > 0) {
        const today = new Date().toISOString().split('T')[0];
        const savedData = await AsyncStorage.getItem('pedometer_steps');
        
        if (savedData) {
          const { steps: savedPedometerSteps, date, lastHealthSync = 0 } = JSON.parse(savedData);
          
          if (date === today && lastHealthSync > 0) {
            // Calculate only the new steps taken while app was closed
            const newHealthSteps = currentHealthSteps - lastHealthSync;
            
            if (newHealthSteps > 0) {
              console.log(`Found ${newHealthSteps} new health steps (current: ${currentHealthSteps}, last sync: ${lastHealthSync})`);
              
              // Add only the new steps to existing pedometer count
              this.currentSteps = savedPedometerSteps + newHealthSteps;
              console.log(`Updated pedometer: ${savedPedometerSteps} + ${newHealthSteps} = ${this.currentSteps}`);
              
              await this.persistStepsWithHealthSync(this.currentSteps, currentHealthSteps);
              
              // Notify listeners of the update
              this.listeners.forEach(listener => listener(this.currentSteps));
            } else {
              console.log('No new health steps detected while app was closed');
              this.currentSteps = savedPedometerSteps;
            }
          } else {
            console.log('No previous health sync data found, using saved pedometer steps');
            this.currentSteps = savedPedometerSteps;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing missed steps:', error);
    }
  }

  addListener(callback: (steps: number) => void): void {
    this.listeners.add(callback);
    // Immediately call with current steps
    callback(this.currentSteps);
  }

  removeListener(callback: (steps: number) => void): void {
    this.listeners.delete(callback);
  }

  getCurrentSteps(): number {
    return this.currentSteps;
  }

  async cleanup(): Promise<void> {
    // Clear any pending persist timeout
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
      this.persistTimeout = null;
    }
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Immediately persist final step count before cleanup
    console.log('Cleanup: Saving final pedometer steps:', this.currentSteps);
    await this.persistSteps(this.currentSteps);
    
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}
 
// Health permissions for Apple Health
const HEALTH_PERMISSIONS = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount],
    write: [AppleHealthKit.Constants.Permissions.StepCount],
  },
};

export type HealthDataSource = 'pedometer' | 'healthIntegration';

export function useHealthData(source: HealthDataSource = 'pedometer') {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedometerSteps, setPedometerSteps] = useState(0);
  const [healthSteps, setHealthSteps] = useState(0);

  // Initialize Google Fit
  const initializeGoogleFit = async () => {
    try {
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_ACTIVITY_WRITE,
        ],
      };

      const authResult = await GoogleFit.authorize(options);
      console.log('Google Fit auth result:', authResult);
      
      if (!authResult.success) {
        throw new Error(authResult.message || 'Authorization denied');
      }

      return true;
    } catch (error) {
      console.error('Google Fit initialization error:', error);
      return false;
    }
  };

  // Initialize Apple Health
  const initializeAppleHealth = async () => {
    return new Promise<boolean>((resolve) => {
      AppleHealthKit.initHealthKit(HEALTH_PERMISSIONS, (error: string) => {
        if (error) {
          console.error('Apple Health initialization error:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

  // Get steps from Google Fit
  const getGoogleFitSteps = async () => {
    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date();

    try {
      const res = await GoogleFit.getDailyStepCountSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketUnit: BucketUnit.DAY,
        bucketInterval: 1,
      });

      // Find the steps from the most reliable source
      const stepsData = res.find(
        (data) => data.source === 'com.google.android.gms:estimated_steps'
      ) || res[0];

      if (stepsData?.steps?.[0]?.value) {
        return stepsData.steps[0].value;
      }

      return 0;
    } catch (error) {
      console.error('Error getting Google Fit steps:', error);
      return 0;
    }
  };

  // Get steps from Apple Health
  const getAppleHealthSteps = async () => {
    return new Promise<number>((resolve) => {
      const options: HealthInputOptions = {
        startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        endDate: new Date().toISOString(),
      };

      AppleHealthKit.getStepCount(
        options,
        (error: Object, results: { value: number }) => {
          if (error) {
            console.error('Error getting Apple Health steps:', error);
            resolve(0);
          } else {
            resolve(results.value);
          }
        }
      );
    });
  };





  // Get current pedometer steps from singleton manager
  const getPedometerSteps = async () => {
    const pedometerManager = PedometerManager.getInstance();
    const steps = pedometerManager.getCurrentSteps();
    console.log('Getting current pedometer steps from manager:', steps);
    return steps;
  };

  // Always run pedometer in background using singleton manager
  useEffect(() => {
    const pedometerManager = PedometerManager.getInstance();
    
    const handleStepsUpdate = (steps: number) => {
      setPedometerSteps(steps);
    };

    const initializePedometer = async () => {
      const success = await pedometerManager.initialize();
      if (success) {
        pedometerManager.addListener(handleStepsUpdate);
      }
    };

    initializePedometer();

    return () => {
      pedometerManager.removeListener(handleStepsUpdate);
    };
  }, []); // Run once on mount

  // Always run health integration in background
  useEffect(() => {
    let healthInterval: any;

    const initializeHealthIntegration = async () => {
      try {
        console.log('Initializing background health integration...');
        let available = false;

        if (Platform.OS === 'android') {
          available = await initializeGoogleFit();
          if (available) {
            // Get initial Google Fit steps
            const initialSteps = await getGoogleFitSteps();
            setHealthSteps(initialSteps);
            console.log('Initial Google Fit steps:', initialSteps);
            
            // Set up periodic sync every 30 seconds for more responsive updates
            healthInterval = setInterval(async () => {
              const newSteps = await getGoogleFitSteps();
              setHealthSteps(newSteps);
              // console.log('Google Fit background sync:', newSteps);
            }, 1 * 1000);
          }
        } else if (Platform.OS === 'ios') {
          available = await initializeAppleHealth();
          if (available) {
            // Get initial Apple Health steps
            const initialSteps = await getAppleHealthSteps();
            setHealthSteps(initialSteps);
            // console.log('Initial Apple Health steps:', initialSteps);
            
            // Set up periodic sync every 30 seconds for more responsive updates
            healthInterval = setInterval(async () => {
              const newSteps = await getAppleHealthSteps();
              setHealthSteps(newSteps);
              // console.log('Apple Health background sync:', newSteps);
            }, 1 * 1000);
          }
        }

        // console.log('Background health integration initialized:', available);
      } catch (err) {
        console.error('Background health integration error:', err);
      }
    };

    initializeHealthIntegration();

    return () => {
      if (healthInterval) {
        clearInterval(healthInterval);
      }
    };
  }, []); // Run once on mount

  // Update displayed steps based on selected source
  useEffect(() => {
    // console.log(`Selected source: ${source}`);
    // console.log(`Pedometer steps: ${pedometerSteps}`);
    // console.log(`Health integration steps: ${healthSteps}`);
    
    if (source === 'pedometer') {
      setSteps(pedometerSteps);
      setIsAvailable(pedometerSteps >= 0);
      setError(null);
    } else if (source === 'healthIntegration') {
      setSteps(healthSteps);
      setIsAvailable(healthSteps >= 0);
      setError(null);
    }
  }, [source, pedometerSteps, healthSteps]);

  const refreshSteps = async () => {
    try {
      // console.log('Manual refresh triggered for source:', source);
      if (source === 'pedometer') {
        const newSteps = await getPedometerSteps();
        setPedometerSteps(newSteps);
        // console.log('Pedometer manually refreshed:', newSteps);
      } else if (source === 'healthIntegration') {
        if (Platform.OS === 'android') {
          // console.log('Manually refreshing Google Fit...');
          const newSteps = await getGoogleFitSteps();
          setHealthSteps(newSteps);
          // console.log('Google Fit manually refreshed:', newSteps);
        } else if (Platform.OS === 'ios') {
          console.log('Manually refreshing Apple Health...');
          const newSteps = await getAppleHealthSteps();
          setHealthSteps(newSteps);
          // console.log('Apple Health manually refreshed:', newSteps);
        }
      }
    } catch (err) {
      console.error('Error refreshing steps:', err);
    }
  };

  return {
    steps,
    isAvailable,
    error,
    refreshSteps,
    pedometerSteps,
    healthSteps,
  };
}