import { useState, useEffect } from 'react'
import { supabase } from '@/components/supabase'
import Auth from '@/components/Auth'
import Account from '@/components/Account'
import { Session } from '@supabase/supabase-js'
import { View, StyleSheet, Text, ImageBackground } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';

const PetImage = require('@/assets/images/stork.png');
const BackgroundImage = require('@/assets/images/background.jpg');

export default function Index() {
  const navigation = useNavigation();
  const [session, setSession] = useState<Session | null>(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={appStyles.imageContainer}>
          <View style={appStyles.imageContainerTop}>
            <TitleText text="Welcome to Steppy!" />
            <ImageViewer imgSource={PetImage} style={{ width: 270, height: 340, marginTop: 40, marginBottom: 40 }} />
            <BaseText text="Stork has a baby animal for you!" />
            <View style={{ width: '100%', marginTop: 20, zIndex: 10 }}>
              <Button theme="primary" label="CONTINUE" onPress={() => router.push('/intro/step-02')} />
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}
