import React, { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../lib/types';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: (User & { role?: string }) | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check if user exists in our users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          // Allow both admin and verified employees
          if (userData.role === 'admin' || (userData.role === 'employee' && userData.email_verified)) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              full_name: userData.full_name,
              role: userData.role,
            });
          } else {
            // If not a verified employee or admin, sign out
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          // If user not found in users table, sign out
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      if (session?.user) {
        // Check if user exists in our users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          // Allow both admin and verified employees
          if (userData.role === 'admin' || (userData.role === 'employee' && userData.email_verified)) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              full_name: userData.full_name,
              role: userData.role,
            });
          } else {
            // If not a verified employee or admin, sign out
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          // If user not found in users table, sign out
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);

      // First, check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Error checking user:', userError);
        throw new Error('Invalid credentials');
      }

      // Check if user is either an admin or a verified employee
      if (!userData || (userData.role !== 'admin' && userData.role !== 'employee')) {
        throw new Error('Access denied. Only employees and administrators can log in.');
      }

      // For employees, ensure they are verified
      if (userData.role === 'employee' && !userData.email_verified) {
        throw new Error('Your account is not verified. Please verify your email first.');
      }

      // Then, attempt Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Invalid credentials');
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Set user data
      const userToSet = {
        id: authData.user.id,
        email: authData.user.email!,
        full_name: userData.full_name,
        role: userData.role,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userToSet));
      setUser(userToSet);
      console.log('User logged in successfully with role:', userToSet.role);
    } catch (error) {
      console.error('Error during login:', error);
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