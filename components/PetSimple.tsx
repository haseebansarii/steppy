import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, PanResponder, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Animatable from 'react-native-animatable';
import { supabase } from './supabase';
import { useLocalSearchParams } from 'expo-router';

interface PetHomeProps {
  animal: string;
}

export function PetHomeSimple({ animal }: PetHomeProps) {
  const { petInstanceId } = useLocalSearchParams<{ petInstanceId: string }>();
  const screenData = Dimensions.get('window');
  
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);

  // Simple pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        
        // Calculate final position
        const finalX = ((pan.x as any)._offset || 0) + gestureState.dx;
        const finalY = ((pan.y as any)._offset || 0) + gestureState.dy;
        
        // Simple boundaries
        const petSize = 180;
        const margin = 15;
        const topSpace = 120;
        const bottomSpace = 80;
        
        const minX = margin;
        const maxX = screenData.width - petSize - margin;
        const minY = topSpace;
        const maxY = screenData.height - petSize - bottomSpace;
        
        // Constrain position
        const constrainedX = Math.max(minX, Math.min(maxX, finalX));
        const constrainedY = Math.max(minY, Math.min(maxY, finalY));
        
        // Set position
        pan.setOffset({ x: constrainedX, y: constrainedY });
        pan.setValue({ x: 0, y: 0 });
        
        // Save to database
        savePetPosition(constrainedX, constrainedY);
      },
    })
  ).current;

  // Save pet position to database
  const savePetPosition = async (x: number, y: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (petInstanceId) {
        const { error } = await supabase
          .from('users_pets')
          .update({ 
            position_x: x,
            position_y: y 
          })
          .eq('id', parseInt(petInstanceId))
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error saving pet position:', error);
        }
      }
    } catch (err) {
      console.error('Exception in savePetPosition:', err);
    }
  };

  // Load saved position on mount
  useEffect(() => {
    const loadPetPosition = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !petInstanceId) return;

        const { data: userPet, error } = await supabase
          .from('users_pets')
          .select('position_x, position_y')
          .eq('id', parseInt(petInstanceId))
          .eq('user_id', session.user.id)
          .single();

        if (!error && userPet && userPet.position_x !== null && userPet.position_y !== null) {
          pan.setValue({ x: userPet.position_x, y: userPet.position_y });
        } else {
          // Default center position
          const defaultX = (screenData.width - 180) / 2;
          const defaultY = (screenData.height - 180) / 2;
          pan.setValue({ x: defaultX, y: defaultY });
        }
      } catch (err) {
        console.error('Error loading pet position:', err);
      }
    };

    loadPetPosition();
  }, [petInstanceId]);

  // Get pet image
  const getPetImageUrl = (animal: string) => {
    const baseUrl = 'https://bslvajotbxxplqpamtik.supabase.co/storage/v1/object/public/pets/';
    return `${baseUrl}${animal}/${animal}-sitting.PNG`;
  };

  const petImageUrl = getPetImageUrl(animal);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 180,
          height: 180,
        },
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <Animatable.View 
        animation={isDragging ? undefined : "pulse"} 
        easing="ease-out" 
        iterationCount="infinite"
        duration={2000}
      >
        <Image
          source={{ uri: petImageUrl }}
          style={{ 
            width: 180, 
            height: 180,
            opacity: isDragging ? 0.8 : 1.0
          }}
          contentFit="contain"
        />
      </Animatable.View>
    </Animated.View>
  );
}