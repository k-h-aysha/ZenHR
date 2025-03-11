import { createClient, PostgrestError } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get the environment variables from expo-constants
const supabaseUrl = 'https://lmejzhhfvuxavoxoumxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZWp6aGhmdnV4YXZveG91bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyODgyMTMsImV4cCI6MjA1Njg2NDIxM30.z3nAOYEpnILPi6-jNH923Jr9CdeivBF1qMAaBz93Awk';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AuthError = {
  message: string;
};

type SupabaseError = AuthError | PostgrestError;

// Helper functions for authentication
export const signUpUser = async (email: string, password: string, name: string, role: string = 'user') => {
  try {
    // First, create the auth user with auto-confirmation enabled
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) throw authError;

    // Check if email confirmation is required
    if (authData?.user && !authData.user.confirmed_at) {
      return {
        data: authData,
        error: null as SupabaseError | null,
        message: 'Please check your email for confirmation link',
      };
    }

    // Then, store additional user data in a custom table
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id,
          email,
          full_name: name,
          role: role,
          created_at: new Date().toISOString(),
        },
      ]);

    if (profileError) throw profileError;

    return {
      data: { ...authData, user: { ...authData.user, role } },
      error: null as SupabaseError | null,
      message: 'Account created successfully',
    };
  } catch (error) {
    return { data: null, error: error as SupabaseError, message: null };
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    // Check user credentials in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (userError || !user) {
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