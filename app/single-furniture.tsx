import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ImageBackground, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/components/supabase';
import { Image } from 'expo-image';
import appStyles from '@/assets/stylesheets/appStyles';
import TitleText from '@/components/TitleText';
import BaseText from '@/components/BaseText';
import Button from '@/components/Button';
import BottomMenuBar from '@/components/BottomMenuBar';
import { getFurnitureImageUrl } from '@/components/Furniture';

const BackgroundImage = require('@/assets/images/background.jpg');

export default function SingleFurniture() {
  const { furniture: furnitureName, furnitureInstanceId } = useLocalSearchParams();
  const [furnitureData, setFurnitureData] = useState<any>(null);
  const [userFurnitureData, setUserFurnitureData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFurnitureData = async () => {
      try {
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to view furniture details');
          return;
        }

        // Get furniture details from the users_furniture table
        const { data: userFurniture, error: userFurnitureError } = await supabase
          .from('users_furniture')
          .select('id, created_at, furniture:furniture_id(id, name, image)')
          .eq('id', furnitureInstanceId)
          .eq('user_id', session.user.id)
          .single();

        if (userFurnitureError) {
          console.error('Error fetching user furniture:', userFurnitureError);
          setError('Failed to load furniture details');
          return;
        }

        if (!userFurniture) {
          setError('Furniture not found');
          return;
        }

        setUserFurnitureData(userFurniture);
        setFurnitureData(userFurniture.furniture);

      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred while loading furniture data');
      } finally {
        setIsLoading(false);
      }
    };

    if (furnitureInstanceId) {
      loadFurnitureData();
    }
  }, [furnitureInstanceId]);

  if (isLoading) {
    return (
      <View style={appStyles.container}>
        <ImageBackground
          source={BackgroundImage}
          style={appStyles.backgroundImage}
          resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
            <View style={appStyles.imageContainerTop}>
              <TitleText text="Loading..." />
            </View>
            <View style={appStyles.imageContainerBottom}>
              <BaseText text="Loading furniture details..." />
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
              <TitleText text="Error" />
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

  if (!furnitureData) {
    return (
      <View style={appStyles.container}>
        <ImageBackground
          source={BackgroundImage}
          style={appStyles.backgroundImage}
          resizeMode="cover">
          <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
            <View style={appStyles.imageContainerTop}>
              <TitleText text="Furniture Not Found" />
            </View>
            <View style={appStyles.imageContainerBottom}>
              <BaseText text="This furniture item could not be found." />
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

  const imageUrl = getFurnitureImageUrl(furnitureData.image);

  return (
    <View style={appStyles.container}>
      <ImageBackground
        source={BackgroundImage}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={[appStyles.imageContainer, { paddingBottom: 60 }]}>
          <View style={appStyles.imageContainerTop}>
            <TitleText text={furnitureData.name || 'My Furniture'} />
            
            <View style={styles.furnitureDisplayContainer}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.furnitureDisplayImage}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.furniturePlaceholderContainer}>
                  <Text style={styles.furniturePlaceholderText}>
                    {furnitureData.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={appStyles.imageContainerBottom}>
            <BaseText text={`You earned this ${furnitureData.name.toLowerCase()} by completing your daily step goal!`} />

            <Button
              theme="primary"
              label="Back to My Furniture"
              onPress={() => router.push('/(tabs)/furniture')}
            />
          </View>
        </View>
      </ImageBackground>
      <BottomMenuBar />
    </View>
  );
}

const styles = StyleSheet.create({
  furnitureDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  furnitureDisplayImage: {
    width: 200,
    height: 200,
  },
  furniturePlaceholderContainer: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  furniturePlaceholderText: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 18,
    textAlign: 'center',
  },
  furnitureInfoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
  },
  furnitureInfoText: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
  },
});