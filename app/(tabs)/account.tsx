import { Text, View, StyleSheet, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react'
import { supabase } from '@/components/supabase'
import Auth from '@/components/Auth'
import Account from '@/components/Account'
import { Session } from '@supabase/supabase-js'
import TitleText from '@/components/TitleText';

const BackgroundImage = require('@/assets/images/background.jpg');

export default function AccountScreen() {
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
    <View style={styles.container}>
      <ImageBackground
        source={BackgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.contentContainer}>
          <TitleText text={session && session.user ? "Your Account" : "Sign In"} />
          {session && session.user ? 
            <Account key={session.user.id} session={session} /> : 
            <Auth />
          }
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  text: {
    color: '#fff',
    fontFamily: 'SourGummy',
  },
});
