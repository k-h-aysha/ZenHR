import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { verifyOTP, sendOTP } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setLoading(true);
      const { error } = await verifyOTP(email, otp);
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Email verified successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) {
      Alert.alert('Info', `Please wait ${countdown} seconds before requesting a new code`);
      return;
    }

    try {
      setResendLoading(true);
      const { error } = await sendOTP(email);
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Verification code sent!');
      setCountdown(60); // Start 60-second countdown
      
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <ThemedText style={styles.title}>Verify Your Email</ThemedText>
          <ThemedText style={styles.subtitle}>
            Please enter the verification code sent to your email
          </ThemedText>

          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            placeholderTextColor="#94a3b8"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, resendLoading && styles.resendButtonDisabled]}
            onPress={handleResendOTP}
            disabled={resendLoading || countdown > 0}
          >
            <ThemedText style={styles.resendText}>
              {resendLoading
                ? 'Sending...'
                : countdown > 0
                ? `Resend code in ${countdown}s`
                : "Didn't receive the code? Resend"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendText: {
    color: '#3b82f6',
    fontSize: 14,
  },
}); 