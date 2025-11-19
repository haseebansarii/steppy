import { View, Text, ImageBackground } from "react-native";
import BaseText from '@/components/BaseText';
import { Pet, PetHome } from '@/components/Pet';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import * as Animatable from 'react-native-animatable';
import { useLocalSearchParams } from 'expo-router';

export default function SinglePet() {
  // Get the pet parameters from the URL
  const { pet, petInstanceId } = useLocalSearchParams<{ pet: string; petInstanceId: string }>();
  
  // Log the parameters for debugging
  console.log("Pet parameter:", pet, "Pet instance ID:", petInstanceId);
  
  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      {pet ? (
        <PetHome animal={pet} petInstanceId={petInstanceId} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BaseText text="No pet selected" />
        </View>
      )}
    </View>
  );
}
