import React, { useEffect, useState } from 'react';
import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// Add type declaration for global setAuthenticated
declare global {
  var setAuthenticated: (value: boolean) => void;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log('Navigation state changed:', { user, isLoading });
    if (!isLoading && user) {
      // Check user role and redirect accordingly
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } else if (!isLoading) {
      router.replace('/auth');
    }
  }, [user, isLoading]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack
          <Stack.Screen name="auth" />
        ) : user.role === 'admin' ? (
          // Admin Stack
          <>
            <Stack.Screen name="admin" />
            <Stack.Screen name="+not-found" />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // This global state can be used to keep track of authentication status
  // In a real app, you would use a state management solution like Redux
  global.setAuthenticated = (value) => {
    setIsAuthenticated(value);
  };

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        ) : (
          // Main App Stack - Redirect to home tab after authentication
          <>
            <Stack.Screen 
              name="(tabs)" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="user" 
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="+not-found" />
            <Redirect href="/(tabs)" />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
