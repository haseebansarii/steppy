// import { Stack } from "expo-router";
// import { useFonts } from 'expo-font';
// import * as SplashScreen from 'expo-splash-screen';
// import {useEffect} from 'react';

// SplashScreen.preventAutoHideAsync();

// export default function RootLayout() {
//   const [loaded, error] = useFonts({
//     'SourGummy': require('@/assets/fonts/SourGummy-Regular.ttf'),
//   });
  
//   useEffect(() => {
//     if (loaded || error) {
//       SplashScreen.hideAsync();
//     }
//   }, [loaded, error]);

//   if (!loaded && !error) {
//     return null;
//   }
  
//   return (
//     <Stack>
//       <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
//       <Stack.Screen name="intro/step-02" options={{ headerShown: false }} />
//       <Stack.Screen name="single-pet" options={{ headerShown: false }} />
//       <Stack.Screen name="+not-found" />
//     </Stack>
//   );
// }
import { Stack } from "expo-router";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'SourGummy': require('@/assets/fonts/SourGummy-Regular.ttf'),
  });
  
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade',
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="intro/step-02" options={{ headerShown: false }} />
        <Stack.Screen name="single-pet" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
});