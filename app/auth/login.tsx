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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signInUser, supabase } from '../../lib/supabase';
import { AuthError, PostgrestError } from '@supabase/supabase-js';
import { useAuth } from '../../lib/auth/AuthContext';

const { width, height } = Dimensions.get('window');
const formWidth = Math.min(400, width * 0.9);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await signInUser(email, password);
      console.log('Login response:', response);

      if (response.error) {
        Alert.alert('Error', response.error.message);
        return;
      }

      if (!response.data?.user) {
        Alert.alert('Error', 'No user data received');
        return;
      }

      // Check if user is admin or employee
      if (response.data.user.role === 'admin') {
        router.replace('/admin');
      } else if (response.data.user.role === 'employee') {
        router.replace('/');
      } else {
        Alert.alert('Access Denied', 'Only employees and administrators can log in to this system.');
        return;
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      // First, verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        return;
      }

      Alert.alert(
        'Success',
        'Password changed successfully. Please sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowPasswordModal(false);
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              setPassword('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'zenhr://auth/reset-password',
      });

      if (error) {
        // Handle rate limit error specifically
        if (error.message.includes('rate limit')) {
          Alert.alert(
            'Rate Limit Exceeded',
            'Too many attempts. Please wait a few minutes before trying again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowResetModal(false);
                  setResetEmail('');
                  setResetStep(1);
                },
              },
            ]
          );
          return;
        }
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Password reset instructions have been sent to your email. Please check your inbox and click the link to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResetModal(false);
              setResetEmail('');
              setResetStep(1);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', 'Failed to send reset instructions');
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setVerificationLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: verificationCode,
        type: 'recovery',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Move to new password step
      setResetStep(3);
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Failed to verify code');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResetModal(false);
              setResetEmail('');
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              setResetStep(1);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error setting new password:', error);
      Alert.alert('Error', 'Failed to set new password');
    } finally {
      setPasswordLoading(false);
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

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => setShowResetModal(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Need an employee account? </Text>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Contact Administrator</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>

        {/* Password Change Modal */}
        <Modal
          visible={showPasswordModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity
                  onPress={() => setShowPasswordModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalInputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Current Password"
                    value={passwordData.currentPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                    secureTextEntry
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    value={passwordData.newPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                    secureTextEntry
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                    secureTextEntry
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, passwordLoading && styles.modalButtonDisabled]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#0f172a" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          visible={showResetModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowResetModal(false);
            setResetStep(1);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowResetModal(false);
                    setResetStep(1);
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {resetStep === 1 && (
                <>
                  <Text style={styles.modalDescription}>
                    Enter your email address to receive a verification code.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalButton, resetLoading && styles.modalButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#0f172a" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Send Verification Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {resetStep === 2 && (
                <>
                  <Text style={styles.modalDescription}>
                    Enter the verification code sent to your email.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="key-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Verification Code"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalButton, verificationLoading && styles.modalButtonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? (
                      <ActivityIndicator color="#0f172a" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {resetStep === 3 && (
                <>
                  <Text style={styles.modalDescription}>
                    Enter your new password.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        value={passwordData.newPassword}
                        onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                        secureTextEntry
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                    </View>

                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={22} color="#93c5fd" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        value={passwordData.confirmPassword}
                        onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                        secureTextEntry
                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.modalButton, passwordLoading && styles.modalButtonDisabled]}
                    onPress={handleSetNewPassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#0f172a" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Set New Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
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
  loginButtonDisabled: {
    backgroundColor: '#93c5fd80',
    shadowOpacity: 0.1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: formWidth,
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  modalInputContainer: {
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#93c5fd',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalButtonDisabled: {
    backgroundColor: '#93c5fd80',
    shadowOpacity: 0.1,
  },
  modalButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalDescription: {
    color: '#93c5fd',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
});