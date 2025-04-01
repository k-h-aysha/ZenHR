import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../lib/types';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

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
    // Clear any existing session on app startup
    supabase.auth.signOut().then(() => {
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name,
          role: session.user.user_metadata?.role,
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (userData: User & { role?: string }) => {
    try {
      console.log('Logging in with user data:', userData);
      
      // Ensure we have the complete user data including role
      if (!userData.role) {
        // If role is missing, fetch it from Supabase
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser?.user_metadata?.role) {
          userData.role = supabaseUser.user_metadata.role;
        }
      }
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      console.log('User logged in successfully with role:', userData.role);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // First clear the user state to trigger the navigation effect
      setUser(null);
      
      // Then sign out from Supabase and clear storage
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await AsyncStorage.removeItem('user');
      
      // Let the root layout handle the navigation to /auth
      // This ensures we don't have competing navigation attempts
    } catch (error) {
      console.error('Error during logout:', error);
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