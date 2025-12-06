import { Pressable, View, ImageBackground, Alert, TouchableOpacity, TextInput, PanResponder, Dimensions, Modal, ScrollView } from "react-native";
import ImageViewer from '@/components/ImageViewer';
import * as Animatable from 'react-native-animatable';
import BaseText from '@/components/BaseText';
import { createStaticNavigation, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '@/components/supabase';
import React, { useState, useEffect, useRef } from 'react';
import { FlatList, Animated } from 'react-native';
import { Image } from 'expo-image';
import appStyles from '@/assets/stylesheets/appStyles';
import TitleText from '@/components/TitleText';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import Button from '@/components/Button';

// Function to get Supabase public URL for pet images
export const getPetImageUrl = (petName: string, imageType: string = 'in-sack'): string => {
  try {
    const { data } = supabase.storage
      .from('pets')
      .getPublicUrl(`${petName}/${petName}-${imageType}.PNG`);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error getting pet image URL for ${petName}/${petName}-${imageType}.PNG:`, error);
    return '';
  }
};

// Function to get pet profile image URL from Supabase
const getPetProfileImageUrl = (petName: string): string => {
  return getPetImageUrl(petName, 'profile');
};

// Function to get pet overlay image URL from Supabase
export const getPetOverlayImageUrl = (petName: string): string => {
  return getPetImageUrl(petName, 'overlay');
};

// Test function to verify the URL structure
const testPetImageUrl = (petName: string): void => {
  const url = getPetImageUrl(petName);
  console.log(`Generated URL for ${petName}:`, url);
};

// Fallback local images in case Supabase is unavailable
const fallbackPetImages: {[key: string]: any} = {
  platypus: require("@/assets/images/pets/platypus-in-sack.png"),
  toucan: require("@/assets/images/pets/toucan-in-sack.png"),
  zebra: require("@/assets/images/pets/zebra-in-sack.png"),
};

type Props = {
  animal: string;
  onPress?: () => void;
};

// Display requested pet
export function Pet({ animal, onPress }: Props) {
  const navigation = useNavigation();
  const petImageUrl = getPetImageUrl(animal);
  const fallbackImage = fallbackPetImages[animal as keyof typeof fallbackPetImages];

  // If there's a link, then animate the image
  if (onPress) {
    return (
      <Animatable.View 
      animation="pulse" 
      easing="ease-out" 
      iterationCount="infinite" 
      style={{ alignItems: 'center' }}>
        <Pressable onPress={onPress}>
          <Image
            source={petImageUrl ? { uri: petImageUrl } : fallbackImage}
            style={{ width: 320, height: 440 }}
            contentFit="contain"
          />
        </Pressable>
      </Animatable.View>
    );

  // If no link, just show a static image
  } else {
    return (
      <Image
        source={petImageUrl ? { uri: petImageUrl } : fallbackImage}
        style={{ width: 320, height: 440 }}
        contentFit="contain"
      />
    );
  }
};

// Display requested pet home
export function PetHome({ animal, petInstanceId }: { animal: string; petInstanceId?: string }) {
  const [petData, setPetData] = useState<any>(null);
  const [userPetData, setUserPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Furniture state
  const [furnitureItems, setFurnitureItems] = useState<any[]>([]);
  const [availableFurniture, setAvailableFurniture] = useState<any[]>([]);
  const [showFurnitureModal, setShowFurnitureModal] = useState(false);
  const [draggingFurnitureId, setDraggingFurnitureId] = useState<number | null>(null);
  
  // Pet positioning state
  const pan = useRef(new Animated.ValueXY()).current;
  const [petPosition, setPetPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Furniture pan responders (store multiple)
  const furniturePans = useRef<{ [key: number]: Animated.ValueXY }>({});
  // Use custom landscape dimensions since app is forced to landscape
  const screenData = {
    width: 853,  // Landscape width
    height: 384, // Landscape height
    scale: 1.875,
    fontScale: 1
  };
  
  console.log('📱 Using custom landscape dimensions:', screenData.width + 'x' + screenData.height);
  
  // Screen dimensions (corrected for forced landscape)
  
  // Fallback images in case database fetch fails
  const fallbackPetImage = fallbackPetImages[animal as keyof typeof fallbackPetImages];
  const fallbackBgImage = require("@/assets/images/background-image.png");

  // Simple pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        // Set offset to current position so drag starts from where pet is
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
        
        // Calculate final position from offset + gesture
        const finalX = ((pan.x as any)._offset || 0) + gestureState.dx;
        const finalY = ((pan.y as any)._offset || 0) + gestureState.dy;
        
        // Simple boundary check
        console.log('📱 Screen dimensions:', screenData);
        
        // In landscape mode, width > height, so we need different calculations
        const isLandscape = screenData.width > screenData.height;
        console.log('� Orientation:', isLandscape ? 'LANDSCAPE' : 'PORTRAIT');
        
        // Landscape boundaries for 853x384 screen
        const petSize = 180;
        
        // Boundaries based on your exact specifications
        const topLimit = -40;     // -40 from top (pet can go above screen)
        const bottomMargin = 105; // 105 pixels from bottom of screen
        const leftLimit = -80;    // -80 from left side (perfect)
        const rightLimit = 550;   // Should not go beyond 550
        
        var minX = leftLimit;     // -80
        var maxX = rightLimit;    // 550
        var minY = topLimit;      // -40
        var maxY = screenData.height - petSize - bottomMargin; // 384 - 180 - 105 = 99
        
        console.log('🔲 New boundaries: X[', minX, 'to', maxX, '] Y[', minY, 'to', maxY, ']');
        
        // Constrain position
        const constrainedX = Math.max(minX, Math.min(maxX, finalX));
        const constrainedY = Math.max(minY, Math.min(maxY, finalY));
        
        // Set final position using offset
        pan.flattenOffset();
        pan.setValue({ x: constrainedX, y: constrainedY });
        
        // Save position to database
        savePetPosition(constrainedX, constrainedY);
      },
    })
  ).current;

  // Save pet position to database
  const savePetPosition = async (x: number, y: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const petId = userPetData?.id || petInstanceId;
      if (!petId) return;

      const { data, error } = await supabase
        .from('users_pets')
        .update({ 
          position_x: x, 
          position_y: y 
        })
        .eq('id', petId)
        .eq('user_id', session.user.id) // Add user check for security
        .select();

      if (error) {
        console.error('❌ Error saving pet position:', error);
        // If columns don't exist, log a helpful message
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.error('💡 Database columns position_x and position_y do not exist. Please run the migration.');
        }
      } else {
        console.log(`✅ Pet position saved successfully:`, data);
      }
    } catch (err) {
      console.error('💥 Error in savePetPosition:', err);
    }
  };

  // Save furniture position to database
  const saveFurniturePosition = async (furnitureId: number, x: number, y: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('users_furniture')
        .update({ 
          position_x: x, 
          position_y: y 
        })
        .eq('id', furnitureId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('❌ Error saving furniture position:', error);
      } else {
        console.log(`✅ Furniture position saved:`, { furnitureId, x, y });
      }
    } catch (err) {
      console.error('💥 Error in saveFurniturePosition:', err);
    }
  };

  // Add furniture to pet
  const addFurnitureToPet = async (furnitureItemId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !userPetData?.id) return;

      // Update furniture to assign it to this pet with default position
      const defaultX = 100;
      const defaultY = 100;
      
      const { error } = await supabase
        .from('users_furniture')
        .update({ 
          user_pet_id: userPetData.id,
          position_x: defaultX,
          position_y: defaultY
        })
        .eq('id', furnitureItemId)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('❌ Error adding furniture to pet:', error);
        Alert.alert('Error', 'Failed to add furniture');
        return;
      }

      // Refresh furniture lists
      const { data: assignedFurniture } = await supabase
        .from('users_furniture')
        .select('id, position_x, position_y, furniture_id, furniture ( id, name, image )')
        .eq('user_pet_id', userPetData.id);

      const { data: unassignedFurniture } = await supabase
        .from('users_furniture')
        .select('id, furniture_id, furniture ( id, name, image )')
        .eq('user_id', session.user.id)
        .is('user_pet_id', null);

      setFurnitureItems(assignedFurniture || []);
      setAvailableFurniture(unassignedFurniture || []);
      
      // Initialize pan responder for new furniture
      if (!furniturePans.current[furnitureItemId]) {
        furniturePans.current[furnitureItemId] = new Animated.ValueXY({
          x: defaultX,
          y: defaultY
        });
      }
      
      setShowFurnitureModal(false);
    } catch (err) {
      console.error('💥 Error in addFurnitureToPet:', err);
      Alert.alert('Error', 'Failed to add furniture');
    }
  };

  // Create pan responder for furniture
  const createFurniturePanResponder = (furnitureId: number) => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setDraggingFurnitureId(furnitureId);
        const currentPan = furniturePans.current[furnitureId];
        if (currentPan) {
          currentPan.setOffset({
            x: (currentPan.x as any)._value,
            y: (currentPan.y as any)._value,
          });
          currentPan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderMove: Animated.event(
        [null, { dx: furniturePans.current[furnitureId]?.x, dy: furniturePans.current[furnitureId]?.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        setDraggingFurnitureId(null);
        
        const currentPan = furniturePans.current[furnitureId];
        if (!currentPan) return;

        const finalX = ((currentPan.x as any)._offset || 0) + gestureState.dx;
        const finalY = ((currentPan.y as any)._offset || 0) + gestureState.dy;
        
        // Boundary constraints for furniture
        const furnitureSize = 120;
        const minX = -40;
        const maxX = screenData.width - furnitureSize + 40;
        const minY = -20;
        const maxY = screenData.height - furnitureSize;
        
        const constrainedX = Math.max(minX, Math.min(maxX, finalX));
        const constrainedY = Math.max(minY, Math.min(maxY, finalY));
        
        currentPan.flattenOffset();
        currentPan.setValue({ x: constrainedX, y: constrainedY });
        
        saveFurniturePosition(furnitureId, constrainedX, constrainedY);
      },
    });
  };

  useEffect(() => {
    async function fetchPetData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Fetch pet data from the database
        const { data, error: fetchError } = await supabase
          .from('pets')
          .select('id, name, image, bg, bg_overlay')
          .eq('name', animal)
          .single();

        if (fetchError) throw fetchError;
        setPetData(data);

        // Fetch user's pet position data if logged in
        if (session && data?.id) {
          console.log('🔍 Fetching user pet data for user:', session.user.id, 'pet:', data.id, 'instance:', petInstanceId);
          
          try {
            let userPet = null;
            let userPetError = null;

            if (petInstanceId) {
              // If we have a specific pet instance ID, get that exact pet
              console.log('🎯 Fetching specific pet instance:', petInstanceId);
              const { data: specificPet, error: specificError } = await supabase
                .from('users_pets')
                .select('id, position_x, position_y, created_at')
                .eq('id', petInstanceId)
                .eq('user_id', session.user.id)
                .single();

              userPet = specificPet;
              userPetError = specificError;
            } else {
              // Fallback: get the most recent pet instance for this user and pet type
              console.log('🔄 No specific instance ID, getting most recent pet');
              const { data: userPets, error: petsError } = await supabase
                .from('users_pets')
                .select('id, position_x, position_y, created_at')
                .eq('user_id', session.user.id)
                .eq('pet_id', data.id)
                .order('created_at', { ascending: false })
                .limit(1);

              userPet = userPets && userPets.length > 0 ? userPets[0] : null;
              userPetError = petsError;
            }

            console.log('📍 User pet query result:', { userPet, error: userPetError });

            if (!userPetError && userPet) {
              setUserPetData(userPet);
              
              // Set initial position with safe boundaries
              const isLandscape = screenData.width > screenData.height;
              const safeTopMargin = isLandscape ? 70 : 120;
              const defaultX = Math.max(10, Math.min(screenData.width - 310, (screenData.width - 300) / 2));
              const defaultY = Math.max(safeTopMargin, Math.min(screenData.height - 330, (screenData.height - 300) / 2));
              
              const initialX = userPet.position_x ?? defaultX;
              const initialY = userPet.position_y ?? defaultY;
              
              console.log('📍 Loading saved position - X:', initialX, 'Y:', initialY, 'from DB:', userPet.position_x, userPet.position_y);
              pan.setValue({ x: initialX, y: initialY });
              setPetPosition({ x: initialX, y: initialY });
            } else if (userPetError) {
              console.error('❌ Error loading pet position:', userPetError);
              
              // Try to get just the basic user pet data without position columns
              let basicUserPet = null;
              let basicError = null;

              if (petInstanceId) {
                const { data: specificBasic, error: specificBasicError } = await supabase
                  .from('users_pets')
                  .select('id, created_at')
                  .eq('id', petInstanceId)
                  .eq('user_id', session.user.id)
                  .single();
                
                basicUserPet = specificBasic;
                basicError = specificBasicError;
              } else {
                const { data: basicUserPets, error: basicPetsError } = await supabase
                  .from('users_pets')
                  .select('id, created_at')
                  .eq('user_id', session.user.id)
                  .eq('pet_id', data.id)
                  .order('created_at', { ascending: false })
                  .limit(1);

                basicUserPet = basicUserPets && basicUserPets.length > 0 ? basicUserPets[0] : null;
                basicError = basicPetsError;
              }

              console.log('🔄 Basic user pet query:', { basicUserPet, error: basicError });

              if (!basicError && basicUserPet) {
                setUserPetData(basicUserPet);
                console.log('✅ Set userPetData to basic pet:', basicUserPet);
              } else {
                console.error('❌ Failed to get basic user pet data:', basicError);
              }
              
              // Use same calculations as drag constraints for consistency
              const petSize = 180; // Match drag constraint pet size
              const topMargin = 120;
              const bottomMargin = 80;
              const sideMargin = 1;
              
              const minX = sideMargin;
              const maxX = screenData.width - petSize - sideMargin;
              const minY = topMargin;
              const maxY = screenData.height - petSize - bottomMargin;
              
              // Center within valid bounds
              const defaultX = Math.max(minX, Math.min(maxX, (screenData.width - petSize) / 2));
              const defaultY = Math.max(minY, Math.min(maxY, (screenData.height - petSize) / 2));
              console.log('📍 Using default position - X:', defaultX, 'Y:', defaultY, 'Screen:', screenData);
              pan.setValue({ x: defaultX, y: defaultY });
              setPetPosition({ x: defaultX, y: defaultY });
            }
          } catch (err) {
            console.error('💥 Exception in pet position loading:', err);
            // Fallback to default position
            const defaultX = (screenData.width - 300) / 2;
            const defaultY = (screenData.height - 300) / 2;
            pan.setValue({ x: defaultX, y: defaultY });
            setPetPosition({ x: defaultX, y: defaultY });
          }
        } else {
          // Default position for non-logged in users (landscape)
          const defaultX = Math.max(20, (screenData.width - 300) / 2);
          const defaultY = Math.max(60, (screenData.height - 300) / 2);
          console.log('🔒 No session, using default position - X:', defaultX, 'Y:', defaultY);
          pan.setValue({ x: defaultX, y: defaultY });
          setPetPosition({ x: defaultX, y: defaultY });
        }

      } catch (err) {
        console.error("Error fetching pet data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPetData();
  }, [animal, petInstanceId]); // Add petInstanceId to dependencies

  // Fetch furniture items for this pet
  useEffect(() => {
    async function fetchFurniture() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !userPetData?.id) return;

        // Fetch furniture assigned to this pet
        const { data: assignedFurniture, error: furnitureError } = await supabase
          .from('users_furniture')
          .select('id, position_x, position_y, furniture_id, furniture ( id, name, image )')
          .eq('user_pet_id', userPetData.id);

        if (furnitureError) {
          console.error('Error fetching furniture:', furnitureError);
          return;
        }

        setFurnitureItems(assignedFurniture || []);
        
        // Initialize pan responders for each furniture item
        (assignedFurniture || []).forEach((item: any) => {
          if (!furniturePans.current[item.id]) {
            furniturePans.current[item.id] = new Animated.ValueXY({
              x: item.position_x || 0,
              y: item.position_y || 0
            });
          }
        });

        // Fetch available furniture (not assigned to any pet)
        const { data: unassignedFurniture, error: unassignedError } = await supabase
          .from('users_furniture')
          .select('id, furniture_id, furniture ( id, name, image )')
          .eq('user_id', session.user.id)
          .is('user_pet_id', null);

        if (unassignedError) {
          console.error('Error fetching available furniture:', unassignedError);
          return;
        }

        setAvailableFurniture(unassignedFurniture || []);
      } catch (err) {
        console.error('Error in fetchFurniture:', err);
      }
    }

    if (userPetData?.id) {
      fetchFurniture();
    }
  }, [userPetData]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('🔄 State update - petInstanceId:', petInstanceId, 'userPetData:', userPetData);
  }, [petInstanceId, userPetData]);

  // Handle orientation change to landscape when component mounts
  useEffect(() => {
    const lockToLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (error) {
        console.log("Error locking orientation:", error);
      }
    };

    lockToLandscape();

    // Cleanup: restore portrait orientation when component unmounts
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={styles.messageText}>Loading pet data...</Text>
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={styles.messageText}>Error: {error}</Text>
    </View>
  );
  
  // For debugging
  console.log("Pet data:", petData);
  
  return (
    <View style={styles.petHomeContainer}>
      <ImageBackground 
        source={petData?.bg ? { uri: petData.bg } : fallbackBgImage}
        style={styles.petHomeBackground}
        resizeMode="cover"
      >
        {/* Fixed UI Elements */}
        <View style={styles.fixedUIContainer} pointerEvents="box-none">
          <View style={styles.titleContainer}>
            <TitleText text={`Meet your ${animal}!`} />
          </View>
          
          {/* Add Furniture Button */}
          <TouchableOpacity 
            style={styles.addFurnitureButton}
            onPress={() => setShowFurnitureModal(true)}
            activeOpacity={0.7}
          >
            <AntDesign name="plus" size={20} color="#fff" />
            <Text style={styles.addFurnitureButtonText}>Add Furniture</Text>
          </TouchableOpacity>
        </View>

        {/* Draggable Pet */}
        <Animated.View
          style={[
            styles.draggablePetContainer,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
              zIndex: isDragging ? 100 : 25, // Below furniture when not dragging
              elevation: isDragging ? 100 : 25, // Android elevation
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Animatable.View 
            animation={isDragging ? undefined : "bounceIn"} 
            duration={1200}
            style={styles.petImageWrapper}
          >
            <Image
              source={petData?.image ? { uri: petData.image } : fallbackPetImage}
              style={[
                styles.draggableImage,
                { 
                  opacity: isDragging ? 0.8 : 1,
                  transform: isDragging ? [{ scale: 1.1 }] : [{ scale: 1 }]
                }
              ]}
              contentFit="contain"
            />
            {isDragging && (
              <View style={styles.dragIndicator}>
                <Text style={styles.dragIndicatorText}>📍</Text>
              </View>
            )}
          </Animatable.View>
        </Animated.View>

        {/* Furniture Items */}
        {furnitureItems.map((item) => {
          if (!furniturePans.current[item.id]) {
            furniturePans.current[item.id] = new Animated.ValueXY({
              x: item.position_x || 100,
              y: item.position_y || 100
            });
          }
          
          return (
            <Animated.View
              key={item.id}
              style={[
                styles.furnitureItem,
                {
                  transform: [
                    { translateX: furniturePans.current[item.id].x },
                    { translateY: furniturePans.current[item.id].y }
                  ],
                  zIndex: draggingFurnitureId === item.id ? 100 : 35,
                  elevation: draggingFurnitureId === item.id ? 100 : 35,
                },
              ]}
              {...createFurniturePanResponder(item.id).panHandlers}
            >
              <Image
                source={{ uri: item.furniture.image }}
                style={[
                  styles.furnitureImage,
                  { opacity: draggingFurnitureId === item.id ? 0.8 : 1 }
                ]}
                contentFit="contain"
              />
            </Animated.View>
          );
        })}

        {/* Background Overlay */}
        {petData?.bg_overlay && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: isDragging ? 10 : 50,
              elevation: isDragging ? 10 : 50, // Android elevation
            }}
           
            pointerEvents="none"
          >
            <Image
              source={{ uri: petData.bg_overlay }}
              style={styles.landscapeOverlay}
              contentFit="cover"
            />
          </View>
        )}
      </ImageBackground>
      
      {/* Furniture Selection Modal */}
      <Modal
        visible={showFurnitureModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFurnitureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Furniture</Text>
              <TouchableOpacity onPress={() => setShowFurnitureModal(false)}>
                <AntDesign name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.furnitureList}>
              {availableFurniture.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No furniture available</Text>
                  <Text style={styles.emptyStateSubtext}>Complete goals to earn furniture!</Text>
                </View>
              ) : (
                availableFurniture.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.furnitureListItem}
                    onPress={() => addFurnitureToPet(item.id)}
                  >
                    <Image
                      source={{ uri: item.furniture.image }}
                      style={styles.furnitureListImage}
                      contentFit="contain"
                    />
                    <Text style={styles.furnitureListText}>{item.furniture.name}</Text>
                    <AntDesign name="right" size={20} color="#666" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Display list of pets
export function PetsList({ pets }: { pets: any[] }) {
  return (
    <View style={{ flex: 1, width: '100%', padding: 10 }}>
      <FlatList
        data={pets}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={(item, index) => `pet-${index}-${item.pet_id}`}
        renderItem={({ item }) => (
          <Animatable.View 
            animation="fadeIn" 
            duration={800} 
            delay={300}
            style={styles.petCard}
          >
            <Pressable 
              onPress={() => router.push({
                pathname: '/single-pet',
                params: { 
                  pet: item.pets.name,
                  petInstanceId: item.id
                }
              })}
              style={({ pressed }) => [
                styles.petCardInner,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <View style={styles.petImageContainer}>
                <Image
                  source={item.pets.profile ? { uri: item.pets.profile } : fallbackPetImages.platypus}
                  style={styles.petImage}
                  contentFit="cover"
                />
              </View>
              <View style={styles.petNameContainer}>
                  {item.custom_name ? (
                    <>
                      <Text style={styles.petName}>{item.custom_name}</Text>
                      <Text style={[styles.petName, { fontSize: 12, color: '#000', marginTop: -5 }]}>{item.pets.name}</Text>
                    </>
                  ) : (
                    <Text style={styles.petName}>{item.pets.name}</Text>
                  )}
              </View>          
            </Pressable>
          </Animatable.View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// Display a random pet
export function RandomPet() {
  const [petData, setPetData] = useState<any>(null);
  const [userPetData, setUserPetData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    async function fetchRandomPet() {
      try {
        // Get the session first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return; 
        }

        // Get random pet
        const { data: petData, error: petError } = await supabase
          .from('random_pets')
          .select()
          .limit(1)
          .single();

        if (petError) throw petError;
        setPetData(petData);

        // Save user pet
        const { data: userPetData, error: saveError } = await supabase
          .from('users_pets')
          .insert({
            user_id: session.user.id,
            pet_id: petData.id
          }).select().single();
        setUserPetData(userPetData);

        if (saveError) throw saveError;

      } catch (err) {
        console.error("Error:", err instanceof Error ? err.message : "An error occurred");
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRandomPet();
  }, []);

  // Return loading state
  if (isLoading) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Finding a pet for you...</Text>
      </View>
    );
  }
  
  // Return authentication error state
  if (!isAuthenticated) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Not Signed In" />
        <Text style={styles.messageText}>Please sign in to adopt a pet</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/account')}
        >
          <Text style={styles.authButtonText}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // Return general error state
  if (error) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Something went wrong" />
        <Text style={styles.messageText}>{error}</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.authButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
  // Return pet data if everything is good
  //return <Pet animal={petData?.name || ""} onPress={() => router.push('/intro/step-04', {userPetId: userPetData.id})} />;

  return <Pet animal={petData?.name || ""} onPress={() => router.push({pathname: `/intro/step-04`, params: {'id': userPetData.id}})} />;
}

// Fetch all of a user's pets
export function UserPets() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authListener, setAuthListener] = useState<any>(null);

  // Function to fetch user pets
  const fetchUserPets = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Get user pets with custom names
      const { data: userPetsData, error: petError } = await supabase
        .from('users_pets')
        .select(`id, pet_id, custom_name, pets ( id, name, profile )`)
        .eq('user_id', session.user.id);

      if (petError) throw petError;
      
      // Store the pets data in state
      setPets(userPetsData || []);

    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : "An error occurred");
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUserPets();

    // Set up auth state change listener
    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        fetchUserPets();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setPets([]);
      }
    });

    // Store the subscription for cleanup
    setAuthListener(authData);

    // Cleanup function
    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Return loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animatable.View 
          animation="pulse" 
          easing="ease-in-out"
          iterationCount="infinite"
          duration={1500}
          style={styles.loadingImageContainer}
        >
          <Image
            source={{ uri: getPetImageUrl('platypus', 'profile') }}
            style={styles.loadingPetImage}
            contentFit="contain"
          />
        </Animatable.View>
        <Animatable.Text 
          animation="fadeInUp" 
          delay={500}
          style={styles.loadingTitle}
        >
          Loading Your Pets
        </Animatable.Text>
        <Animatable.View 
          animation="fadeInUp" 
          delay={800}
          style={styles.loadingDotsContainer}
        >
          <Animatable.Text
            animation="bounce"
            iterationCount="infinite" 
            delay={0}
            style={styles.loadingDot}
          >
            •
          </Animatable.Text>
          <Animatable.Text
            animation="bounce"
            iterationCount="infinite"
            delay={200}
            style={styles.loadingDot}
          >
            •
          </Animatable.Text>
          <Animatable.Text
            animation="bounce"
            iterationCount="infinite"
            delay={400}
            style={styles.loadingDot}
          >
            •
          </Animatable.Text>
        </Animatable.View>
      </View>
    );
  }
  
  // Return authentication error state
  if (!isAuthenticated) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Not Signed In" />
        <Text style={styles.messageText}>Please sign in to see your pets</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/account')}
        >
          <Text style={styles.authButtonText}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // Return general error state
  if (error) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Something went wrong" />
        <Text style={styles.messageText}>{error}</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.authButtonText}>Return Home</Text>
        </Pressable>
      </View>
    );
  }
  
  // Return empty pets state
  if (pets.length === 0) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="No Pets Yet" />
        <Text style={styles.messageText}>You haven't adopted any pets yet. Start your journey by getting your first pet!</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/intro/step-02')}
        >
          <Text style={styles.authButtonText}>Adopt a Pet</Text>
        </Pressable>
      </View>
    );
  }
  
  // Return pets list if everything is good
  return <PetsList pets={pets} />;
}

// Name your pet
export function NameYourPet({ petId }: { petId: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pet, setPet] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [authListener, setAuthListener] = useState<any>(null);
  const [petName, setPetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

      // Save pet name
      const { error: relationError } = await supabase
        .from('users_pets')
        .update({ custom_name: petName })
        .eq('id', petId)
        .select();

      if (relationError) throw relationError;

      // Navigate to the pets tab
      router.push('/(tabs)/pets');

    } catch (error) {
      console.error('Error saving pet:', error);
      Alert.alert(
        "Error", 
        "There was a problem saving your pet. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Function to fetch user pet
  const fetchUserPet = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Get user pet with pet details
      const { data: userPetData, error: petError } = await supabase
        .from('users_pets')
        .select(`pet_id, id, pets ( name, profile )`)
        .eq('id', petId)
        .eq('user_id', session.user.id);

      if (petError) throw petError;
      
      // Store the pets data in state
      setPet(userPetData || []);

    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : "An error occurred");
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUserPet();

    // Set up auth state change listener
    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        fetchUserPet();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setPet([]);
      }
    });

    // Store the subscription for cleanup
    setAuthListener(authData);

    // Cleanup function
    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Return loading state
  if (isLoading) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Loading your pet...</Text>
      </View>
    );
  }
  
  // Return authentication error state
  if (!isAuthenticated) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Not Signed In" />
        <Text style={styles.messageText}>Please sign in to see your pet</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/account')}
        >
          <Text style={styles.authButtonText}>Go to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // Return general error state
  if (error) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="Something went wrong" />
        <Text style={styles.messageText}>{error}</Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.authButtonText}>Return Home</Text>
        </Pressable>
      </View>
    );
  }

  // Get the pet name from the fetched data
  const petName_from_db = pet.length > 0 ? pet[0]?.pets?.name : 'platypus';
  const petImageUrl = getPetImageUrl(petName_from_db);

  return (
    <View style={appStyles.container}>
      <ImageBackground
        source={require("@/assets/images/background-image.png")}
        style={appStyles.backgroundImage}
        resizeMode="cover">
        <View style={appStyles.imageContainer}>
          <View style={appStyles.imageContainerTop}>
            <TitleText text={`You got a ${petName_from_db}!`} />
            <View style={appStyles.topInstructions}>
               <Text style={appStyles.topText}>
                  Name your pet:
                </Text>
              <TextInput
                style={appStyles.textInput}
                onChangeText={(newText: string) => setPetName(newText)}
                value={petName}
                placeholder="Enter text here"
              />
            </View>
            <Image
              source={petImageUrl ? { uri: petImageUrl } : fallbackPetImages[petName_from_db as keyof typeof fallbackPetImages] || fallbackPetImages.platypus}
              style={{ width: 320, height: 390 }}
              contentFit="contain"
            />

            <View style={styles.buttonContainer}>
              <Button 
                label={isSaving ? "Saving..." : "Save & Continue"} 
                theme="primary"
                onPress={!isSaving && petName.trim() ? savePetAndNavigate : undefined}
              />
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}



const styles = StyleSheet.create({
  petCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  petCardInner: {
    width: '100%',
    alignItems: 'center',
  },
  petImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#ffffff10',
    elevation: 3,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  petNameContainer: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  petName: {
    fontFamily: 'SourGummy',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  
  petHomeContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  petHomeBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fixedUIContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 0,
    paddingTop: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
  dragHint: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    overflow: 'hidden',
  },
  draggablePetContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    zIndex: 50,
    // Ensure pet doesn't interfere with UI elements
  },
  petImageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draggableImage: {
    width: 300,
    height: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragIndicator: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dragIndicatorText: {
    fontSize: 16,
  },
  petHomeContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  petHomeImage: {
    width: 320,
    height: 440,
  },
  landscapeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 20,
    zIndex: 15,
  },
  landscapeTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 20,
    position: 'relative',
    paddingTop: 50,
    zIndex: 15,
  },
  landscapeImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeImage: {
    width: 300,
    height: 300,
  },
  landscapeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  rotationHint: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingImageContainer: {
    marginBottom: 30,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingPetImage: {
    width: 80,
    height: 80,
  },
  loadingTitle: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    color: '#b94ea5',
    fontSize: 30,
    marginHorizontal: 5,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    margin: 20,
  },
  messageText: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
  },
  authButton: {
    backgroundColor: '#b94ea5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    elevation: 3,
  },
  authButtonText: {
    color: 'white',
    fontFamily: 'SourGummy',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Furniture styles
  addFurnitureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b94ea5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    position: 'absolute',
    right: 15,
    top: 10,
    zIndex: 101,
  },
  addFurnitureButtonText: {
    color: '#fff',
    fontFamily: 'SourGummy',
    fontSize: 14,
  },
  furnitureItem: {
    position: 'absolute',
    width: 120,
    height: 120,
    zIndex: 35,
  },
  furnitureImage: {
    width: 120,
    height: 120,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'SourGummy',
    fontSize: 20,
    color: '#000',
  },
  furnitureList: {
    maxHeight: 400,
  },
  furnitureListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 10,
  },
  furnitureListImage: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  furnitureListText: {
    flex: 1,
    fontFamily: 'SourGummy',
    fontSize: 16,
    color: '#000',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontFamily: 'SourGummy',
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: 'SourGummy',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});


