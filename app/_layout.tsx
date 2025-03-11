import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Add type declaration for global setAuthenticated
declare global {
  var setAuthenticated: (value: boolean) => void;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
