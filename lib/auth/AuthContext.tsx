import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../lib/types';

interface AuthContextType {
  user: (User & { role?: string }) | null;
  isLoading: boolean;
  login: (userData: User & { role?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user data exists in AsyncStorage
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        console.log('Stored user data:', userData);
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  // Monitor auth state changes for navigation
  useEffect(() => {
    if (!isLoading) {
      console.log('Navigation state changed:', { isLoading, user });
      
      // Simple approach: always navigate based on auth state
      if (user) {
        // If user is logged in, go to home
        router.replace('/user/home');
      } else {
        // If user is not logged in, go to login
        router.replace('/auth/login');
      }
    }
  }, [isLoading, user]);

  const login = async (userData: User & { role?: string }) => {
    try {
      console.log('Logging in with user data:', userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      router.replace('/user/home');
      console.log('User logged in successfully');
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error removing user data:', error);
      throw error;
    }
  };

  console.log('Current auth state:', { user, isLoading });

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function withAuth<T extends object>(
  Component: React.ComponentType<T>
): React.FC<T> {
  return function ProtectedRoute(props: T) {
    const { user, isLoading } = useAuth();

    useEffect(() => {
      if (!isLoading && !user) {
        router.replace('/auth/login');
      }
    }, [user, isLoading]);

    if (isLoading) {
      return null; // Or a loading spinner
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
} 