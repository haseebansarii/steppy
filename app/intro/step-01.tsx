import { View, StyleSheet, Text, ImageBackground } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import Button from '@/components/Button';
import BaseText from '@/components/BaseText';
import TitleText from '@/components/TitleText';
import appStyles from '@/assets/stylesheets/appStyles';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';

const PetImage = require('@/assets/images/stork.png');
const BackgroundImage = require('@/assets/images/background.jpg');


export default function Index() {
const navigation = useNavigation<any>();
  return (
    <View style={appStyles.container}>
      <ImageBackground
        source = {BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="contain">
        <View style={appStyles.imageContainer}>
          <View style={appStyles.imageContainerTop}>
            <TitleText text="Welcome to Steppy" />
            <ImageViewer imgSource={PetImage} style={{ width: 320, height: 440 }} />
          </View>
          <View style={appStyles.imageContainerBottom}>
            <BaseText text="Stork has a baby animal for you!." />
            <View style={appStyles.footerContainer}>
              <Button theme="primary" label="CONTINUE" onPress={() => navigation.navigate('intro/step-02')} />
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
