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
    // Create user in our users table
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password,
          full_name: name,
          role: role,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Store the user session in AsyncStorage
    await AsyncStorage.setItem('user_session', JSON.stringify({
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      last_login: new Date().toISOString()
    }));

    return {
      data: { 
        email, 
        full_name: name, 
        role,
        id: data.id 
      },
      error: null as SupabaseError | null,
      message: 'Account created successfully',
    };
  } catch (error) {
    return { data: null, error: error as SupabaseError, message: null };
  }
};

export const signInUser = async (email: string, password: string) => {
  try {
    // Get user from our users table
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Store the user session in AsyncStorage
    await AsyncStorage.setItem('user_session', JSON.stringify({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      last_login: new Date().toISOString()
    }));

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
  try {
    // Remove the user session from AsyncStorage
    await AsyncStorage.removeItem('user_session');
    return { error: null as SupabaseError | null };
  } catch (error) {
    return { error: error as SupabaseError };
  }
};

// Submit leave request
export const submitLeaveRequest = async (
  employeeId: string,
  leaveType: string,
  fromDate: Date,
  toDate: Date,
  dayPart: string,
  duration: string,
  reason: string
) => {
  try {
    console.log('Submitting leave request with data:', {
      employeeId,
      leaveType,
      fromDate,
      toDate,
      dayPart,
      duration,
      reason
    });

    // Ensure the dates are in ISO format for Supabase
    const fromDateISO = fromDate.toISOString();
    const toDateISO = toDate.toISOString();

    const { data, error } = await supabase
      .from('leave_requests')
      .insert([
        {
          employee_id: employeeId,
          leave_type: leaveType,
          from_date: fromDateISO,
          to_date: toDateISO,
          day_part: dayPart,
          duration: duration,
          reason: reason,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Error submitting leave request:', error);
      throw error;
    }

    console.log('Leave request submitted successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Failed to submit leave request:', error);
    return { 
      data: null, 
      error: { 
        message: error instanceof Error ? error.message : 'Failed to submit leave request' 
      } as SupabaseError 
    };
  }
};

// Get current user session
export const getCurrentUser = async () => {
  try {
    const sessionData = await AsyncStorage.getItem('user_session');
    if (!sessionData) {
      return null;
    }
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}; 