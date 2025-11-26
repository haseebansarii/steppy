import { View, StyleSheet, Text, ImageBackground, Dimensions } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import appStyles from '@/assets/stylesheets/appStyles';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/components/supabase';
import { useLocalSearchParams } from "expo-router";
import { getPetImageUrl } from '@/components/Pet';
import { Image } from 'expo-image';
import BottomMenuBar from '@/components/BottomMenuBar';

const BackgroundImage = require('@/assets/images/background.jpg');

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Fallback images in case Supabase is unavailable
const fallbackPetImages: { [key: string]: any } = {
  platypus: require('@/assets/images/pets/platypus-sitting.png'),
  toucan: require('@/assets/images/pets/toucan-sitting.png'),
  zebra: require('@/assets/images/pets/zebra-sitting.png'),
};

export default function Index() {
  const navigation = useNavigation();
  const [petData, setPetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const data = useLocalSearchParams();
  const userPetId = data.id;

  // Fetch pet details when component mounts
  useEffect(() => {
    const fetchPetData = async () => {
      try {
        const { data, error } = await supabase
          .from('users_pets')
          .select('*, pets(*)')
          .eq('id', userPetId)
          .single();

        if (error) throw error;
        setPetData(data);
      } catch (err) {
        console.error('Error fetching pet:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userPetId) {
      fetchPetData();
    } else {
      setLoading(false);
    }
  }, [userPetId]);

  const goToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={appStyles.container}>
      <ImageBackground
        source={BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[styles.container, { paddingBottom: screenHeight * 0.04 }]}>
          <View style={[styles.topSection, { marginTop: screenHeight * 0.03 }]}>
            <Animatable.View 
              animation="fadeIn" 
              duration={1000}
              style={styles.congratulationsContainer}
            >
              <Text style={[styles.congratulationsTitle, { fontSize: screenWidth * 0.067 }]}>
                🎉 Congratulations! 🎉
              </Text>
              <Text style={[styles.congratulationsSubtitle, { fontSize: screenWidth * 0.065 }]}>
                You earned a new pet today!
              </Text>
            </Animatable.View>
          </View>
          
          <View style={styles.middleSection}>
            {loading ? (
              <Text style={styles.loadingText}>Loading your new pet...</Text>
            ) : petData ? (
              <Animatable.View 
                animation="bounceIn" 
                duration={1500}
                style={styles.petContainer}
              >
                <Text style={[styles.petName, { 
                  fontSize: screenWidth * 0.08,
                  marginBottom: screenHeight * 0.03
                }]}>
                  Meet {petData.custom_name || petData.pets?.name || 'your new pet'}!
                </Text>
                <View style={[styles.imageWrapper, {
                  width: screenWidth * 0.7,
                  height: screenHeight * 0.35,
                  marginBottom: screenHeight * 0.04
                }]}>
                  <Image
                    source={
                      petData?.pets?.name 
                        ? { uri: getPetImageUrl(petData.pets.name, 'sitting') }
                        : fallbackPetImages[petData?.pets?.name] || fallbackPetImages.zebra
                    }
                    style={{
                      width: screenWidth * 0.65,
                      height: screenHeight * 0.33,
                    }}
                    contentFit="contain"
                  />
                </View>
                {/* <BaseText text="Great job completing your step challenge! Your new pet is now part of your collection." /> */}
              </Animatable.View>
            ) : (
              <Text style={styles.errorText}>
                Unable to load pet information
              </Text>
            )}
          </View>
          
          <View style={styles.bottomSection}>
            <Button 
              label="Go to Home" 
              theme="primary"
              onPress={goToHome}
            />
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
  },
  topSection: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleSection: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratulationsContainer: {
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
  },
  congratulationsTitle: {
    fontFamily: 'SourGummy',
    color: '#b94ea5',
    textAlign: 'center',
    marginBottom: screenHeight * 0.015,
    marginTop: screenHeight * 0.025,
  },
  congratulationsSubtitle: {
    fontFamily: 'SourGummy',
    color: '#fff',
    textAlign: 'center',
    lineHeight: screenHeight * 0.03,
  },
  petContainer: {
    alignItems: 'center',
    width: '100%',
  },
  petName: {
    fontFamily: 'SourGummy',
    color: '#b94ea5',
    textAlign: 'center',

  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: screenWidth * 0.04,
    fontFamily: 'SourGummy',
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: screenWidth * 0.04,
    fontFamily: 'SourGummy',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  }
});
