import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  email: string;
  full_name: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  const login = async (userData: User) => {
    try {
      console.log('Logging in with user data:', userData);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
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