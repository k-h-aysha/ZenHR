import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get the environment variables from expo-constants
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

type AuthError = {
  message: string;
};

type SupabaseError = AuthError | PostgrestError;

// Password validation function
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  return { isValid: true, message: '' };
};

// Function to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to send OTP via email
export const sendOTP = async (email: string) => {
  try {
    const otp = generateOTP();

    // Store OTP in the database with expiration
    const { error: dbError } = await supabase
      .from('otp_codes')
      .insert([
        {
          email,
          code: otp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes expiry
        },
      ]);

    if (dbError) throw dbError;

    // Send email using Supabase's email service
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        data: {
          otp,
        },
      },
    });

    if (emailError) throw emailError;

    return { success: true };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return { error: { message: 'Failed to send verification code' } };
  }
};

// Function to verify OTP and create user profile
export const verifyOTP = async (email: string, code: string) => {
  try {
    // Check if OTP exists and is valid
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    if (!data) {
      return { error: { message: 'Invalid or expired verification code' } };
    }

    // Get the auth user data
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    // Create user profile in users table
    const { error: createError } = await supabase.from('users').insert([
      {
        id: authData.user?.id,
        email,
        full_name: authData.user?.user_metadata?.full_name,
        role: 'employee',
        email_verified: true,
      },
    ]);

    if (createError) throw createError;

    // Delete the used OTP
    await supabase
      .from('otp_codes')
      .delete()
      .eq('id', data.id);

    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { error: { message: 'Failed to verify code' } };
  }
};

// Function to sign up a new user
export async function signUpUser(email: string, password: string, name: string) {
  try {
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking existing user:', userError);
      return { error: { message: 'Failed to check existing user' } };
    }

    if (existingUser) {
      if (existingUser.email_verified) {
        return { error: { message: 'Email already registered' } };
      }
      // If user exists but not verified, delete the old record
      // This allows them to try signing up again
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', existingUser.id);

      if (deleteError) {
        console.error('Error deleting unverified user:', deleteError);
        return { error: { message: 'Failed to reset unverified account' } };
      }
    }

    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (signUpError) {
      console.error('Error in signUpUser:', signUpError);

      // Handle rate limit errors specifically
      if (signUpError.message.includes('rate limit exceeded')) {
        return {
          error: {
            message: 'Too many attempts. Please wait a few minutes before trying again.'
          }
        };
      }

      return { error: signUpError };
    }

    if (!authData.user) {
      return { error: { message: 'Failed to create user account' } };
    }

    // Insert user data into the users table
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: name,
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user data:', insertError);
      return { error: { message: 'Failed to create user profile' } };
    }

    return {
      data: authData,
      message: 'Account created successfully! You can now log in.',
    };
  } catch (error) {
    console.error('Unexpected error in signUpUser:', error);
    return { error: { message: 'An unexpected error occurred' } };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error };
    }

    if (!data?.user) {
      return { data: null, error: { message: 'No user data received' } };
    }

    // Store the session in AsyncStorage
    await AsyncStorage.setItem('session', JSON.stringify(data.session));

    // Get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return { data: null, error: { message: 'Failed to get user data' } };
    }

    // Add role to user data
    const userWithRole = {
      ...data.user,
      role: userData?.role || 'user',
      email_verified: data.user.email_confirmed_at !== null,
    };

    return {
      data: {
        user: userWithRole,
        session: data.session,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in signInUser:', error);
    return {
      data: null,
      error: { message: 'An unexpected error occurred' },
    };
  }
}

export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error as SupabaseError | null };
  } catch (error) {
    return { error: error as SupabaseError };
  }
};

// Function to migrate existing authenticated users to users table
export const migrateAuthenticatedUsers = async () => {
  try {
    // Get all authenticated users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return { error: { message: 'Failed to fetch authenticated users' } };
    }

    if (!authUsers?.users) {
      return { message: 'No authenticated users found' };
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each authenticated user
    for (const authUser of authUsers.users) {
      try {
        // Check if user already exists in users table
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`Error checking user ${authUser.id}:`, checkError);
          errorCount++;
          continue;
        }

        if (existingUser) {
          skippedCount++;
          continue;
        }

        // Insert user into users table
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.full_name || '',
              email_verified: authUser.email_confirmed_at !== null,
              confirmed_at: authUser.email_confirmed_at || new Date().toISOString(),
              created_at: authUser.created_at,
              updated_at: new Date().toISOString(),
            },
          ]);

        if (insertError) {
          console.error(`Error inserting user ${authUser.id}:`, insertError);
          errorCount++;
          continue;
        }

        migratedCount++;
      } catch (error) {
        console.error(`Error processing user ${authUser.id}:`, error);
        errorCount++;
      }
    }

    return {
      success: true,
      message: `Migration completed: ${migratedCount} users migrated, ${skippedCount} skipped, ${errorCount} errors`,
      stats: {
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    };
  } catch (error) {
    console.error('Error in migrateAuthenticatedUsers:', error);
    return { error: { message: 'Failed to migrate users' } };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) return null;

    // Get additional user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    return {
      ...user,
      ...userData,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

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
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([
        {
          employee_id: employeeId,
          leave_type: leaveType,
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          day_part: dayPart,
          duration: duration,
          reason: reason,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return { data: null, error: error as SupabaseError };
  }
}; 