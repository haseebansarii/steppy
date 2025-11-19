import { View, Text, ImageBackground } from "react-native";
import BaseText from '@/components/BaseText';
import { Furniture } from '@/components/Furniture';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import BottomMenuBar from '@/components/BottomMenuBar';
import { useState, useEffect, useRef } from 'react';
import { useFurnitureGiftSystem } from '@/hooks/useFurnitureGiftSystem';
import Button from '@/components/Button';
import { router } from 'expo-router';
import { supabase } from '@/components/supabase';

const BackgroundImage = require('@/assets/images/background.jpg');

export default function FurnitureStep03() {
  const navigation = useNavigation();
  const { awardNewFurniture, canEarnFurniture } = useFurnitureGiftSystem();
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardedFurniture, setAwardedFurniture] = useState<{name: string, image: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const awardProcessedRef = useRef(false);

  // Award furniture when component mounts if user is eligible
  useEffect(() => {
    const handleAwardFurniture = async () => {
      // Skip if we've already processed or if we already have awarded furniture
      if (awardProcessedRef.current || awardedFurniture) {
        console.log('FurnitureStep03: Skipping - already processed:', awardProcessedRef.current, 'awardedFurniture:', !!awardedFurniture);
        return;
      }

      console.log('FurnitureStep03: Starting award process, canEarnFurniture:', canEarnFurniture);

      // If not eligible, wait for eligibility to change
      if (!canEarnFurniture) {
        console.log('FurnitureStep03: User not eligible yet, waiting...');
        return;
      }

      // Mark as processed to prevent multiple attempts
      awardProcessedRef.current = true;
      setIsAwarding(true);
      try {
        console.log('FurnitureStep03: Attempting to award furniture...');
        const result = await awardNewFurniture();
        console.log('FurnitureStep03: Award result:', result);
        
        if (result.success) {
          // Always show success, even if we don't have furniture details
          if (result.furnitureId) {
            // Try to get the awarded furniture details
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const { data: furnitureData } = await supabase
                .from('users_furniture')
                .select('furniture:furniture_id(name, image)')
                .eq('id', result.furnitureId)
                .single();
              
              console.log('FurnitureStep03: Furniture data:', furnitureData);
              
              if (furnitureData?.furniture && typeof furnitureData.furniture === 'object' && !Array.isArray(furnitureData.furniture)) {
                setAwardedFurniture({
                  name: (furnitureData.furniture as any).name || 'New Furniture',
                  image: (furnitureData.furniture as any).image || ''
                });
              } else {
                setAwardedFurniture({ name: 'Furniture Gift', image: '' });
              }
            } else {
              setAwardedFurniture({ name: 'Furniture Gift', image: '' });
            }
          } else {
            // Still show success even without furnitureId
            setAwardedFurniture({ name: 'Furniture Gift', image: '' });
          }
        } else {
          console.log('FurnitureStep03: Award failed:', result.error);
          setError(result.error || 'Failed to award furniture');
        }
      } catch (err) {
        console.error('FurnitureStep03: Error awarding furniture:', err);
        setError('An error occurred while awarding furniture');
      } finally {
        setIsAwarding(false);
      }
    };

    // Add a small delay to ensure the hook has loaded
    const timer = setTimeout(() => {
      handleAwardFurniture();
    }, 100);

    return () => clearTimeout(timer);
  }, [canEarnFurniture, awardedFurniture]);

  if (isAwarding) {
    return (
      <View style={appStyles.container}>
        <ImageBackground
          source={BackgroundImage}
          style={appStyles.backgroundImage}
          resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
            <View style={appStyles.imageContainerTop}>
              <Animatable.View
                animation="pulse"
                iterationCount="infinite"
                duration={1000}
              >
                <TitleText text="Opening your gift..." />
              </Animatable.View>
            </View>
            <View style={appStyles.imageContainerBottom}>
              <BaseText text="Please wait while we prepare your furniture gift!" />
            </View>
          </View>
        </ImageBackground>
        <BottomMenuBar />
      </View>
    );
  }

  if (error) {
    return (
      <View style={appStyles.container}>
        <ImageBackground
          source={BackgroundImage}
          style={appStyles.backgroundImage}
          resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
            <View style={appStyles.imageContainerTop}>
              <TitleText text="Oops!" />
            </View>
            <View style={appStyles.imageContainerBottom}>
              <BaseText text={error} />
              <Button
                theme="primary"
                label="Back to Furniture"
                onPress={() => router.push('/(tabs)/furniture')}
              />
            </View>
          </View>
        </ImageBackground>
        <BottomMenuBar />
      </View>
    );
  }

  return (
    <View style={appStyles.container}>
      <ImageBackground
        source={BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
          <View style={appStyles.imageContainerTop}>
            <TitleText text="Congratulations! You got a furniture gift!" />
            {awardedFurniture && (
              <Animatable.View
                animation="bounceIn"
                duration={1500}
                style={{ alignItems: 'center' }}
              >
                <Furniture furniture={awardedFurniture} />
              </Animatable.View>
            )}
          </View>
          <View style={appStyles.imageContainerBottom}>
            <BaseText text="Click to add it to your furniture collection!" />
            <Button
              theme="primary"
              label="VIEW MY FURNITURE"
              onPress={() => router.push('/(tabs)/furniture')}
            />
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}