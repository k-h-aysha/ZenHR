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
import { supabase, hashPassword } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const formWidth = Math.min(400, width * 0.9);

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setLoading(true);

      // Basic validation
      if (!name || !email || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase());

      if (existingUsers && existingUsers.length > 0) {
        Alert.alert('Error', 'Email already registered');
        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Insert new user
      const { error } = await supabase.from('users').insert([
        {
          email: email.toLowerCase(),
          full_name: name,
          password: hashedPassword,
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Account created successfully', [
        {
          text: 'OK',
          onPress: () => router.replace('/auth/login'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create account');
      console.error('Signup error:', error);
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join us to get started</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

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

              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
              <Text style={styles.signupButtonText}>Create Account</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Sign In</Text>
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
  signupButton: {
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
  signupButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  loginLink: {
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 