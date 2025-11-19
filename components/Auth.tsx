import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, TouchableOpacity } from 'react-native'
import { supabase } from '@/components/supabase'
import { Button as RNEButton, Input } from '@rneui/themed'
import * as Animatable from 'react-native-animatable';
import Button from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter both email and password")
      return
    }
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert("Sign In Error", error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter both email and password")
      return
    }
    
    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters")
      return
    }
    
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) {
      Alert.alert("Sign Up Error", error.message)
    } else {
      if (!session) Alert.alert("Check Your Email", "Please check your inbox for email verification!")
    }
    setLoading(false)
  }

  return (
    <Animatable.View 
      animation="fadeIn" 
      duration={800} 
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Input
            label="Email"
            labelStyle={styles.inputLabel}
            inputStyle={styles.inputText}
            leftIcon={{ type: 'ionicon', name: 'mail-outline', color: '#fff' }}
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="email@address.com"
            placeholderTextColor="#ffffff80"
            autoCapitalize={'none'}
            containerStyle={styles.input}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Input
            label="Password"
            labelStyle={styles.inputLabel}
            inputStyle={styles.inputText}
            leftIcon={{ type: 'ionicon', name: 'lock-closed-outline', color: '#fff' }}
            onChangeText={(text) => setPassword(text)}
            value={password}
            secureTextEntry={true}
            placeholder="Password"
            placeholderTextColor="#ffffff80"
            autoCapitalize={'none'}
            containerStyle={styles.input}
          />
        </View>

        <View style={styles.buttonContainer}>
          {isSignUp ? (
            <TouchableOpacity 
              style={styles.authButton} 
              onPress={signUpWithEmail}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.authButton} 
              onPress={signInWithEmail}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
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
  authButton: {
    backgroundColor: '#b94ea5',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 18,
  },
  switchButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  switchText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
})
