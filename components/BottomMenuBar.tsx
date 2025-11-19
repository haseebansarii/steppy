import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

interface BottomMenuBarProps {
  activeScreen?: 'home' | 'pets' | 'account';
}

export default function BottomMenuBar({ activeScreen }: BottomMenuBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.menuItem, activeScreen === 'home' && styles.activeItem]}
        onPress={() => router.push('/(tabs)')}
      >
        <Ionicons 
          name={activeScreen === 'home' ? 'home-sharp' : 'home-outline'} 
          color={activeScreen === 'home' ? '#ffd33d' : '#8E8E93'} 
          size={24} 
        />
        <Text style={[styles.menuText, activeScreen === 'home' && styles.activeText]}>
          Home
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.menuItem, activeScreen === 'pets' && styles.activeItem]}
        onPress={() => router.push('/(tabs)/pets')}
      >
        <Ionicons 
          name={activeScreen === 'pets' ? 'paw' : 'paw-outline'} 
          color={activeScreen === 'pets' ? '#ffd33d' : '#8E8E93'} 
          size={24} 
        />
        <Text style={[styles.menuText, activeScreen === 'pets' && styles.activeText]}>
          My Pets
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.menuItem, activeScreen === 'account' && styles.activeItem]}
        onPress={() => router.push('/(tabs)/account')}
      >
        <Ionicons 
          name={activeScreen === 'account' ? 'information-circle' : 'information-circle-outline'} 
          color={activeScreen === 'account' ? '#ffd33d' : '#8E8E93'} 
          size={24} 
        />
        <Text style={[styles.menuText, activeScreen === 'account' && styles.activeText]}>
          Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#25292e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  activeItem: {
    // Additional styling for active item if needed
  },
  menuText: {
    color: '#8E8E93',
    fontSize: 10,
    textAlign: 'center',
  },
  activeText: {
    color: '#ffd33d',
  },
});