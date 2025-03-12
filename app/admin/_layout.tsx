import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminTabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 80 : 60;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: tabBarHeight + insets.bottom,
          backgroundColor: '#1e293b',
          borderTopWidth: 0,
          elevation: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -4,
              },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarActiveTintColor: '#93c5fd',
        tabBarInactiveTintColor: '#64748b',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
          fontWeight: '500',
          marginBottom: 5,
        },
      }}
    >
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: 'Leaves',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <View style={styles.dashboardIconContainer}>
              <View style={[styles.dashboardIconWrapper, { backgroundColor: color }]}>
                <Ionicons name="grid-outline" size={26} color="#1e293b" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.profileIconContainer}>
              <Ionicons name="person-circle-outline" size={size + 4} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dashboardIconContainer: {
    position: 'absolute',
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    height: 70,
  },
  dashboardIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#93c5fd',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileIconContainer: {
    marginTop: 3,
  },
}); 