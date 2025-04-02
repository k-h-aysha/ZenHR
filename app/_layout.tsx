import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/theme/ThemeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const { theme } = useTheme();

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
      // When user is null (logged out), redirect to login screen
      router.replace('/auth/login');
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
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const systemColorScheme = useColorScheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <AuthProvider>
        <ThemeWrapper>
          <RootLayoutNav />
        </ThemeWrapper>
      </AuthProvider>
    </CustomThemeProvider>
  );
}
