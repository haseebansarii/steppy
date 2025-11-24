import { View, Text, ImageBackground, Dimensions } from "react-native";
import BaseText from '@/components/BaseText';
import { Pet, RandomPet } from '@/components/Pet';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import * as Animatable from 'react-native-animatable';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomMenuBar from '@/components/BottomMenuBar';

const BackgroundImage = require('@/assets/images/background.jpg');

// Get screen dimensions for responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Index() {
  const navigation = useNavigation();
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: screenHeight * 0.08 }]}>
            <View style={[appStyles.imageContainerTop, { marginTop: screenHeight * 0.02 }]}>
              <TitleText text="Congratulations! You got a pet!" />
              <View style={{ marginTop: screenHeight * 0.03, marginBottom: screenHeight * 0.03 }}>
                <RandomPet />
              </View>
            </View>
            <View style={appStyles.imageContainerBottom}>
              <BaseText text="Click to reveal your new pet!" />
            </View>
          </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}
