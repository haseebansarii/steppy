import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/components/supabase';
import * as Animatable from 'react-native-animatable';
import BaseText from '@/components/BaseText';
import TitleText from '@/components/TitleText';
import Button from '@/components/Button';
import { router } from 'expo-router';
import { useFurnitureGiftSystem } from '@/hooks/useFurnitureGiftSystem';
import { useHealthData, HealthDataSource } from '@/hooks/useHealthData';

// Function to get furniture image URL from database
export const getFurnitureImageUrl = (imageUrl: string): string => {
  // If it's already a full URL, return as is
  if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('https'))) {
    return imageUrl;
  }
  
  // If it's a relative path or filename, try to get from Supabase storage
  try {
    const { data } = supabase.storage
      .from('furniture')
      .getPublicUrl(imageUrl);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error getting furniture image URL for ${imageUrl}:`, error);
    return '';
  }
};

type FurnitureProps = {
  furniture: {
    name: string;
    image: string;
  };
  onPress?: () => void;
};

// Display requested furniture item using image from database
export function Furniture({ furniture, onPress }: FurnitureProps) {
  const imageUrl = getFurnitureImageUrl(furniture.image);

  // If there's a link, then animate the item
  if (onPress) {
    return (
      <Animatable.View 
        animation="pulse" 
        easing="ease-out" 
        iterationCount="infinite" 
        style={{ alignItems: 'center' }}>
        <Pressable onPress={onPress} style={styles.furnitureImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.furnitureImage}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.furniturePlaceholder}>{furniture.name}</Text>
          )}
        </Pressable>
      </Animatable.View>
    );
  } else {
    return (
      <View style={styles.furnitureImageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.furnitureImage}
            contentFit="contain"
          />
        ) : (
          <Text style={styles.furniturePlaceholder}>{furniture.name}</Text>
        )}
      </View>
    );
  }
}

// Component to display user's furniture collection
export function UserFurniture() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [furniture, setFurniture] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [requiredSteps, setRequiredSteps] = useState(1000);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [healthSource, setHealthSource] = useState<HealthDataSource>('pedometer');
  const [sourceLoaded, setSourceLoaded] = useState(false);
  
  const { canEarnFurniture, furnitureData } = useFurnitureGiftSystem();
  const { steps: currentSteps } = useHealthData(sourceLoaded ? healthSource : 'pedometer');

  // Load user's step goal and health source from database
  const loadUserPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('step_goal, step_source')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error loading user preferences:', error);
        return;
      }

      // Set step goal
      if (data.step_goal && data.step_goal > 0) {
        setRequiredSteps(data.step_goal);
      } else {
        setRequiredSteps(1000);
      }
      
      // Set health source
      if (data.step_source) {
        let newSource: HealthDataSource = 'pedometer';
        if (data.step_source === 'googleFit' || data.step_source === 'appleHealth' || data.step_source === 'healthIntegration') {
          newSource = 'healthIntegration';
        } else if (data.step_source === 'pedometer') {
          newSource = 'pedometer';
        }
        setHealthSource(newSource);
      } else {
        setHealthSource('pedometer');
      }
      
      setSourceLoaded(true);
      
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setSourceLoaded(true);
    }
  };

  // Calculate progress when steps or goal changes
  useEffect(() => {
    if (requiredSteps > 0) {
      const progress = Math.min((currentSteps / requiredSteps) * 100, 100);
      setProgressPercentage(progress);
    }
  }, [currentSteps, requiredSteps]);

  // Load user preferences on component mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Function to fetch user furniture
  const fetchUserFurniture = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Get user furniture items with furniture details including image
      const { data: userFurnitureData, error: furnitureError } = await supabase
        .from('users_furniture')
        .select('id, created_at, furniture:furniture_id(id, name, image)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (furnitureError) throw furnitureError;
      
      // Group furniture by type and count duplicates
      const furnitureMap = new Map();
      
      if (userFurnitureData) {
        userFurnitureData.forEach(item => {
          const furniture = item.furniture as any;
          const furnitureId = furniture?.id;
          const furnitureName = furniture?.name;
          const furnitureImage = furniture?.image;
          
          if (furnitureId && furnitureName) {
            if (furnitureMap.has(furnitureId)) {
              // Increment count for existing furniture
              const existing = furnitureMap.get(furnitureId);
              existing.count += 1;
            } else {
              // Add new furniture type
              furnitureMap.set(furnitureId, {
                id: furnitureId,
                name: furnitureName,
                image: furnitureImage || '',
                count: 1,
                created_at: item.created_at,
                firstInstanceId: item.id // Store the first instance ID for navigation
              });
            }
          }
        });
      }
      
      // Convert map to array and sort by creation date
      const groupedFurniture = Array.from(furnitureMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Store the grouped furniture data in state
      setFurniture(groupedFurniture);

    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : "An error occurred");
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserFurniture();

    // Set up auth state change listener
    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        fetchUserFurniture();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setFurniture([]);
      }
    });

    // Cleanup function
    return () => {
      authData.subscription.unsubscribe();
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
          <Text style={styles.loadingGiftEmoji}>🎁</Text>
        </Animatable.View>
        <Animatable.Text 
          animation="fadeInUp" 
          delay={500}
          style={styles.loadingTitle}
        >
          Loading Your Furniture
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
        <Text style={styles.messageText}>Please sign in to see your furniture</Text>
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
  
  // Return empty furniture state with option to get new gift
  if (furniture.length === 0) {
    return (
      <View style={styles.messageContainer}>
        <TitleText text="No Furniture Yet" />
        <Text style={styles.messageText}>
          You haven't collected any furniture yet. Complete your daily step goal to earn gift boxes with furniture!
        </Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => router.push('/furniture/furniture-step-02')}
        >
          <Text style={styles.authButtonText}>Start Furniture Challenge</Text>
        </Pressable>
      </View>
    );
  }
  
  // Return furniture list with option to get new gift if available
  return (
    <View style={styles.furnitureListContainer}>
      {!furnitureData.hasEarnedFurnitureToday && (
        <View style={styles.newGiftContainer}>
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            style={styles.newGiftBanner}
          >
            <Text style={styles.newGiftText}>
              {progressPercentage >= 100 && canEarnFurniture ? '🎁 New Gift Available!' : '🎁 Daily Gift Challenge'}
            </Text>
            <Pressable
              style={styles.newGiftButton}
              onPress={() => router.push('/furniture/furniture-step-02')}
            >
              <Text style={styles.newGiftButtonText}>
                {progressPercentage >= 100 && canEarnFurniture ? 'Claim Your Gift' : 'Start Challenge'}
              </Text>
            </Pressable>
          </Animatable.View>
        </View>
      )}
      
      <FlatList
        data={furniture}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.furnitureGrid}
        renderItem={({ item }) => (
          <Animatable.View 
            animation="fadeIn" 
            duration={800} 
            delay={300}
            style={styles.furnitureCard}
          >
            <Pressable 
              onPress={() => router.push({
                pathname: '/single-furniture',
                params: { 
                  furniture: item.name,
                  furnitureInstanceId: item.firstInstanceId
                }
              })}
              style={({ pressed }) => [
                styles.furnitureItem,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Furniture 
                furniture={{
                  name: item.name || 'Furniture Item',
                  image: item.image || ''
                }} 
              />
              <Text style={styles.furnitureItemText}>
                {item.name || 'Furniture Item'}
              </Text>
              {item.count > 1 && (
                <Text style={styles.furnitureItemCount}>
                  ({item.count})
                </Text>
              )}
            </Pressable>
          </Animatable.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  loadingGiftEmoji: {
    fontSize: 80,
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
  furnitureListContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
  },
  newGiftContainer: {
    marginBottom: 20,
  },
  newGiftBanner: {
    backgroundColor: '#b94ea5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newGiftText: {
    color: 'white',
    fontFamily: 'SourGummy',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  newGiftButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  newGiftButtonText: {
    color: '#b94ea5',
    fontFamily: 'SourGummy',
    fontSize: 16,
    fontWeight: 'bold',
  },
  furnitureGrid: {
    paddingBottom: 20,
  },
  furnitureCard: {
    width: '48%',
    marginBottom: 15,
  },
  furnitureItem: {
    flex: 1,
    alignItems: 'center',
    margin: 10,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    minWidth: 150,
  },
  furnitureItemText: {
    color: 'white',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  furnitureItemCount: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  furnitureImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  furnitureImage: {
    width: 100,
    height: 100,
  },
  furniturePlaceholder: {
    color: '#ffffff',
    fontFamily: 'SourGummy',
    fontSize: 14,
    textAlign: 'center',
  },
});