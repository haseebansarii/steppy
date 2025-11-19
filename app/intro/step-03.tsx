import { View, Text, ImageBackground } from "react-native";
import BaseText from '@/components/BaseText';
import { Pet, RandomPet } from '@/components/Pet';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import * as Animatable from 'react-native-animatable';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomMenuBar from '@/components/BottomMenuBar';

const BackgroundImage = require('@/assets/images/background.jpg');

export default function Index() {
  const navigation = useNavigation();
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
            <View style={appStyles.imageContainerTop}>
              <TitleText text="Congratulations! You got a pet!" />
              <RandomPet />
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
