import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CustomTabBarButtonProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
}

const CustomTabBarButton: React.FC<CustomTabBarButtonProps> = ({ children, onPress }) => (
  <TouchableOpacity
    style={{
      top: -25,
      justifyContent: 'center',
      alignItems: 'center',
    }}
    onPress={onPress}
  >
    <View style={{
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#3b82f6',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.34,
      shadowRadius: 6.27,
      elevation: 10,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {children}
    </View>
  </TouchableOpacity>
);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarButton: props => <HapticTab {...props} />,
        tabBarBackground: () => <View style={styles.tabBarBackground} />,
        tabBarStyle: {
          position: 'absolute',
          height: Platform.OS === 'ios' ? 85 : 70,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
              <Ionicons name="home" size={24} color={color} />
            </View>
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
              <Ionicons name="calendar" size={24} color={color} />
            </View>
          ),
          tabBarLabel: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
              <Ionicons name="list" size={24} color={color} />
            </View>
          ),
          tabBarLabel: 'Tasks',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
              <Ionicons name="person" size={24} color={color} />
            </View>
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
