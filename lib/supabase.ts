import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get the environment variables from expo-constants
const supabaseUrl = 'https://lmejzhhfvuxavoxoumxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZWp6aGhmdnV4YXZveG91bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyODgyMTMsImV4cCI6MjA1Njg2NDIxM30.z3nAOYEpnILPi6-jNH923Jr9CdeivBF1qMAaBz93Awk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

// Initialize Supabase client with storage adapter for authentication
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection and log any issues
(async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Supabase connection successful!');
    }
  } catch (err) {
    console.error('Unexpected error in Supabase connection:', err);
  }
})();

type AuthError = {
  message: string;
};

type SupabaseError = AuthError | PostgrestError;

// Helper functions for authentication
export const signUpUser = async (email: string, password: string, name: string, role: string = 'user') => {
  try {
    const { error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password,
          full_name: name,
          role: role,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) throw error;

    return {
      data: { email, full_name: name, role },
      error: null as SupabaseError | null,
      message: 'Account created successfully',
    };
  } catch (error) {
    return { data: null, error: error as SupabaseError, message: null };
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    return { 
      data: { user }, 
      error: null as SupabaseError | null 
    };
  } catch (error) {
    return { 
      data: null, 
      error: { message: error instanceof Error ? error.message : 'Failed to login' } as SupabaseError 
    };
  }
};

export const signOutUser = async () => {
  // Since we're not using Supabase auth, this function can be used
  // to clear any local session state if needed
  return { error: null as SupabaseError | null };
}; 