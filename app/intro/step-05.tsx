import { View, StyleSheet, Text, ImageBackground } from "react-native";
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
        <View style={[styles.container, { paddingBottom: 60 }]}>
          <View style={styles.topSection}>
            <Animatable.View 
              animation="fadeIn" 
              duration={1000}
              style={styles.congratulationsContainer}
            >
              <Text style={styles.congratulationsTitle}>
                🎉 Congratulations! 🎉
              </Text>
              <Text style={styles.congratulationsSubtitle}>
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
                <Text style={styles.petName}>
                  Meet {petData.custom_name || petData.pets?.name || 'your new pet'}!
                </Text>
                <View style={styles.imageWrapper}>
                  <Image
                    source={
                      petData?.pets?.name 
                        ? { uri: getPetImageUrl(petData.pets.name, 'sitting') }
                        : fallbackPetImages[petData?.pets?.name] || fallbackPetImages.zebra
                    }
                    style={styles.petImage}
                    contentFit="contain"
                  />
                </View>
                <BaseText text="Great job completing your step challenge! Your new pet is now part of your collection." />
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
    paddingHorizontal: 20,
    paddingVertical: 40,
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
    paddingHorizontal: 20,
  },
  congratulationsTitle: {
    fontSize: 28,
    fontFamily: 'SourGummy',
    color: '#b94ea5',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 18,
  },
  congratulationsSubtitle: {
    fontSize: 26,
    fontFamily: 'SourGummy',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  petContainer: {
    alignItems: 'center',
    width: '100%',
  },
  petName: {
    fontSize: 20,
    fontFamily: 'SourGummy',
    color: '#b94ea5',
    textAlign: 'center',
    marginBottom: 50,
  },
  imageWrapper: {
    width: 180,
    height: 180,
    marginBottom: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImage: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'SourGummy',
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'SourGummy',
    color: '#ff6b6b',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  }
});
