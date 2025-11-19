import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/components/supabase'
import { StyleSheet, View, Alert, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native'
import { useHealthData, HealthDataSource } from '@/hooks/useHealthData'
import { Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [petCount, setPetCount] = useState(0)
  const [daysActive, setDaysActive] = useState(0)
  const [healthSource, setHealthSource] = useState<HealthDataSource>('pedometer')
  const [platform] = useState(Platform.OS)
  const [stepGoal, setStepGoal] = useState(1000)
  const [stepGoalInput, setStepGoalInput] = useState('1000')
  const [switchingSource, setSwitchingSource] = useState(false)
  const { steps, isAvailable, error: healthError, refreshSteps, pedometerSteps, healthSteps } = useHealthData(healthSource)

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Only refresh profile data, not health source
      await getProfileData();
      await getPetCount();
      await calculateDaysActive();
      await refreshSteps();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshSteps]);

  useEffect(() => {
    console.log('Health tracking status:', { steps, isAvailable, error: healthError });
  }, [steps, isAvailable, healthError]);

  // Update profile when health source changes (only save source preference, not steps)
  useEffect(() => {
    if (session?.user && !loading) {
      console.log('Health source changed, updating profile:', healthSource);
      // Only save the selected source preference
      const saveSourcePreference = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ step_source: healthSource })
            .eq('id', session.user.id);

          if (error) throw error;
          console.log('Source preference saved:', healthSource);
        } catch (error) {
          console.error('Error saving source preference:', error);
        }
      };
      
      saveSourcePreference();
    }
  }, [healthSource]);

  // Sync input with step goal when it changes
  useEffect(() => {
    setStepGoalInput(stepGoal.toString());
  }, [stepGoal]);

  useEffect(() => {
    if (session) {
      getProfile()
      getPetCount()
      calculateDaysActive()
    }
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url, step_source, step_goal`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setAvatarUrl(data.avatar_url)
        if (data.step_source) {
          // Convert old sources to new simplified format
          let newSource: HealthDataSource = 'pedometer';
          if (data.step_source === 'googleFit' || data.step_source === 'appleHealth' || data.step_source === 'healthIntegration') {
            newSource = 'healthIntegration';
          } else if (data.step_source === 'pedometer') {
            newSource = 'pedometer';
          }
          setHealthSource(newSource);
          console.log('✅ Account: Loaded health source from profile:', data.step_source, '-> converted to:', newSource);
        } else {
          console.log('⚠️ Account: No step_source found in database, using default pedometer');
          setHealthSource('pedometer');
        }
        if (data.step_goal) {
          setStepGoal(data.step_goal);
          setStepGoalInput(data.step_goal.toString());
          console.log('Loaded step goal from profile:', data.step_goal);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Profile Error", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Separate function for refresh that doesn't change health source
  async function getProfileData() {
    try {
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setAvatarUrl(data.avatar_url)
        console.log('Refreshed profile data without changing health source');
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error)
    }
  }

  async function getPetCount() {
    try {
      if (!session?.user) return

      const { data, error } = await supabase
        .from('users_pets')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)

      if (error) throw error
      
      setPetCount(data?.length || 0)
    } catch (error) {
      console.error('Error fetching pet count:', error)
    }
  }

  function calculateDaysActive() {
    try {
      if (!session?.user?.created_at) return
      
      const createdAt = new Date(session.user.created_at)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - createdAt.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      setDaysActive(diffDays)
    } catch (error) {
      console.error('Error calculating days active:', error)
    }
  }

  async function updateProfile({
    username,
    avatar_url,
    step_goal,
  }: {
    username: string
    avatar_url: string
    step_goal?: number
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        avatar_url,
        step_source: healthSource,
        step_goal: step_goal || stepGoal,
        updated_at: new Date().toISOString(),
      }
      console.log('Saving profile updates (no step data, only preferences):', updates);

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
      
      Alert.alert("Success", "Profile updated successfully!")
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Update Error", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Sign Out Error", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={800} 
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            titleColor="#fff"
          />
        }>
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <Ionicons name="person-circle-outline" size={80} color="#fff" />
            <Text style={styles.emailText}>{session?.user?.email}</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Input
                label="Username"
                labelStyle={styles.inputLabel}
                inputStyle={styles.inputText}
                leftIcon={{ type: 'ionicon', name: 'person-outline', color: '#fff' }}
                value={username || ''}
                onChangeText={(text) => setUsername(text)}
                placeholder="Enter a username"
                placeholderTextColor="#ffffff80"
                containerStyle={styles.input}
              />
            </View>

            <View style={styles.stepsContainer}>
              <Text style={styles.inputLabel}>Today's Steps</Text>
              <View style={styles.stepsContent}>
                {loading || switchingSource ? (
                  <>
                    <ActivityIndicator size="large" color="#b94ea5" />
                    <Text style={styles.stepsLabel}>
                      {switchingSource ? 'Switching source...' : 'Loading...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.stepsCount}>{steps}</Text>
                    <Text style={styles.stepsLabel}>steps today</Text>
                    {healthError && (
                      <Text style={styles.errorText}>{healthError}</Text>
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.pedometerContainer}>
              <Text style={styles.inputLabel}>Step Counter Source</Text>
              <View style={styles.pedometerOptions}>
                <TouchableOpacity 
                  style={[
                    styles.pedometerOption, 
                    healthSource === 'pedometer' && styles.pedometerOptionSelected
                  ]}
                  onPress={() => {
                    if (healthSource !== 'pedometer') {
                      setSwitchingSource(true);
                      setHealthSource('pedometer');
                      setSwitchingSource(false);
                    }
                  }}
                  disabled={switchingSource}
                >
                  <Text style={styles.pedometerOptionText}>Pedometer</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.pedometerOption, 
                    healthSource === 'healthIntegration' && styles.pedometerOptionSelected
                  ]}
                  onPress={() => {
                    if (healthSource !== 'healthIntegration') {
                      setSwitchingSource(true);
                      setHealthSource('healthIntegration');
                      setSwitchingSource(false);
                    }
                  }}
                  disabled={switchingSource}
                >
                  <Text style={styles.pedometerOptionText}>
                    {platform === 'ios' ? 'Apple Health' : 'Google Fit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.stepGoalContainer}>
              <Text style={styles.inputLabel}>Daily Step Goal</Text>
              <Text style={styles.stepGoalDescription}>
                The number of steps it takes to adopt a pet
              </Text>
              <View style={styles.stepGoalInputContainer}>
                <Input
                  inputStyle={styles.stepGoalInput}
                  value={stepGoalInput}
                  onChangeText={(text) => {
                    setStepGoalInput(text);
                    const num = parseInt(text);
                    if (!isNaN(num) && num > 0) {
                      setStepGoal(num);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="1000"
                  containerStyle={styles.stepGoalInputWrapper}
                />
                <Text style={styles.stepGoalLabel}>steps</Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={() => updateProfile({ username, avatar_url: avatarUrl })}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Updating..." : "Update Profile"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.signOutButton} 
                onPress={handleSignOut}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Your Pet Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{petCount}</Text>
                <Text style={styles.statLabel}>Pets Owned</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{daysActive}</Text>
                <Text style={styles.statLabel}>Days Active</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animatable.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(185, 78, 165, 0.2)',
    borderRadius: 10,
    padding: 15,
  },
  stepsContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  stepsCount: {
    color: '#b94ea5',
    fontFamily: 'SourGummy',
    fontSize: 32,
    marginBottom: 5,
  },
  stepsLabel: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    opacity: 0.8,
  },
  errorText: {
    color: '#ff6b6b',
    fontFamily: 'SourGummy',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  pedometerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  pedometerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pedometerOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  pedometerOptionSelected: {
    backgroundColor: '#b94ea5',
  },
  pedometerOptionText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileContainer: {
    width: '100%',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  emailText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'SourGummy',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 16,
    marginBottom: 5,
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#b94ea5',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  signOutButton: {
    backgroundColor: '#ff6b6b',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 18,
  },
  statsContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 20,
  },
  statsTitle: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#b94ea5',
    fontFamily: 'SourGummy',
    fontSize: 24,
  },
  statLabel: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    marginTop: 5,
  },
  stepGoalContainer: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: 'rgba(185, 78, 165, 0.2)',
    borderRadius: 10,
    padding: 15,
  },
  stepGoalDescription: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 10,
  },
  stepGoalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGoalInputWrapper: {
    flex: 1,
    marginRight: 10,
  },
  stepGoalInput: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  stepGoalLabel: {
    color: '#b94ea5',
    fontFamily: 'SourGummy',
    fontSize: 16,
  },
})
