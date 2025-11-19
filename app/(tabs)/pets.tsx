import { Text, View, StyleSheet, ImageBackground } from 'react-native';
import { FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Pet, UserPets } from '@/components/Pet';
import TitleText from '@/components/TitleText';

const BackgroundImage = require('@/assets/images/background.jpg');

export default function PetsScreen() {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={BackgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.contentContainer}>
          <TitleText text="My Pets" />
          <UserPets />
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
    width: '100%',
    alignItems: 'center',
    paddingTop: 60,
  },
  text: {
    color: '#fff',
    fontFamily: 'SourGummy',
  },
});
