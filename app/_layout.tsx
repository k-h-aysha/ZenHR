import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Global error screen */}
        <Stack.Screen name="+not-found" options={{ headerShown: true }} />
        
        {!user ? (
          // Auth Stack
          <Stack.Screen name="auth" />
        ) : user.role === 'admin' ? (
          // Admin Stack
          <Stack.Screen name="admin" />
        ) : (
          // Main App Stack
          <Stack.Screen name="(tabs)" />
        )}
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
