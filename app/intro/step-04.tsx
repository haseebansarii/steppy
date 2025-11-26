import { Pressable, View, StyleSheet, Text, ImageBackground, TextInput, Alert, Dimensions } from "react-native";
import React, { useState } from 'react';
import ImageViewer from '@/components/ImageViewer';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import Button from '@/components/Button';
import * as Animatable from 'react-native-animatable';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '@/components/supabase';
import { router } from 'expo-router';
import { useLocalSearchParams } from "expo-router";
import { NameYourPet, getPetImageUrl } from '@/components/Pet';
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
  const [petName, setPetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [petData, setPetData] = useState<any>(null);
  const data = useLocalSearchParams();
  const userPetId = data.id;

  // Fetch pet details when component mounts
  React.useEffect(() => {
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
      }
    };

    if (userPetId) {
      fetchPetData();
    }
  }, [userPetId]);

  const savePetAndNavigate = async () => {
    if (!petName.trim()) {
      Alert.alert("Name Required", "Please enter a name for your pet.");
      return;
    }

    setIsSaving(true);
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert("Not Signed In", "Please sign in to save your pet.");
        router.push('/account');
        return;
      }

      console.log('Attempting to save name:', {
        petName,
        userId: session.user.id,
        petData
      });

      if (!petData?.pets?.id) {
        throw new Error('No pet data available');
      }

      // Use the specific record ID from petData
      if (!petData.id) {
        throw new Error('Invalid pet relationship ID');
      }

      console.log('Updating pet with ID:', petData.id);

      // Update the specific user-pet relationship (scope by user for RLS) and return the updated row
      const { data: updatedRow, error: updateError } = await supabase
        .from('users_pets')
        .update({ custom_name: petName })
        .eq('id', petData.id)
        .eq('user_id', session.user.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Error updating pet name:', updateError);
        throw updateError;
      }

      // After update, fetch the updated record
      const { data: savedPet, error: verifyError } = await supabase
        .from('users_pets')
        .select('id, custom_name, pets(*)')
        .eq('id', petData.id)
        .eq('user_id', session.user.id)
        .single();

      if (verifyError) {
        console.error('Error verifying pet save:', verifyError);
        throw verifyError;
      }

      if (!savedPet) {
        throw new Error('Failed to verify pet update');
      }

      console.log('Pet updated successfully:', savedPet);

      if (verifyError) {
        console.error('Error verifying pet save:', verifyError);
        throw verifyError;
      }

      console.log('Final verification:', savedPet);

      // Navigate to congratulations screen
      router.push(`/intro/step-05?id=${petData.id}`);

    } catch (error: any) {
      console.error('Error saving pet:', error);
      Alert.alert(
        "Error", 
        error.message || "There was a problem saving your pet. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      <ImageBackground
        source={BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: screenHeight * 0.08 }]}>
          <View style={[appStyles.imageContainerTop, { marginTop: screenHeight * 0.02 }]}>
            <TitleText text={`You got a ${petData?.pets?.name || ''}!`} />
            <View style={[appStyles.topInstructions, { marginTop: screenHeight * 0.02, marginBottom: screenHeight * 0.03 }]}>
              <Text style={appStyles.topText}>
                Name your pet:
              </Text>
              <TextInput
                style={appStyles.textInput}
                onChangeText={setPetName}
                value={petName}
                placeholder="Enter pet name"
              />
            </View>
            <Image
              source={
                petData?.pets?.name 
                  ? { uri: getPetImageUrl(petData.pets.name, 'sitting') }
                  : fallbackPetImages[petData?.pets?.name] //  || fallbackPetImages.zebra
              }
              style={{ 
                width: screenWidth * 0.75, 
                height: screenHeight * 0.42,
                marginTop: screenHeight * -0.02
              }}
              contentFit="contain"
            />

            <View style={[styles.buttonContainer, { marginTop: screenHeight * 0.06 }]}>
              <Button 
                label={isSaving ? "Saving..." : "Save & Continue"} 
                theme="primary"
                onPress={!isSaving && petName.trim() ? savePetAndNavigate : undefined}
              />
            </View>
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: screenHeight * 0.04,
  }
});
