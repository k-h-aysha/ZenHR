import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, verifyPassword } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const formWidth = Math.min(400, width * 0.9);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      // Basic validation
      if (!email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      // Get user from database
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase());

      if (fetchError) throw fetchError;

      if (!users || users.length === 0) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const user = users[0];

      // Verify password
      const isValid = await verifyPassword(password, user.password);

      if (!isValid) {
        Alert.alert('Error', 'Invalid password');
        return;
      }

      // Store user session
      await AsyncStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      }));

      // Navigate to home screen
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', 'Failed to login');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#2563eb']}
      style={styles.background}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>
            Zen<Text style={styles.logoHighlight}>HR</Text>
          </Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: height * 0.04,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoHighlight: {
    color: '#93c5fd',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: formWidth,
    alignSelf: 'center',
  },
  welcomeContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#93c5fd',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signupText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  signupLink: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: 'bold',
  },
});