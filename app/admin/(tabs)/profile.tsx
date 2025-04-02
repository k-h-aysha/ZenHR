import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth, withAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  department: string;
  position: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

function AdminProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    department: '',
    position: '',
    bio: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [stats, setStats] = useState([
    { label: 'Employees', value: '0' },
    { label: 'Departments', value: '0' },
    { label: 'Active Leaves', value: '0' },
  ]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  useEffect(() => {
    checkProfile();
    fetchStats();
  }, []);

  const checkProfile = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setIsSetup(true);
          setFormData({
            full_name: user.full_name || '',
            phone_number: '',
            department: '',
            position: '',
            bio: '',
          });
        } else {
          console.error('Error fetching profile:', error);
          throw error;
        }
      } else {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          department: data.department || '',
          position: data.position || '',
          bio: data.bio || '',
        });
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: employeesCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      const { count: departmentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: activeLeavesCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      setStats([
        { label: 'Employees', value: employeesCount?.toString() || '0' },
        { label: 'Departments', value: departmentsCount?.toString() || '0' },
        { label: 'Active Leaves', value: activeLeavesCount?.toString() || '0' },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSetup = async () => {
    if (!formData.full_name || !formData.department || !formData.position) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('admin_profiles')
        .insert([
          {
            id: user?.id,
            full_name: formData.full_name,
            email: user?.email || '',
            phone_number: formData.phone_number,
            department: formData.department,
            position: formData.position,
            bio: formData.bio,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsSetup(false);
      Alert.alert('Success', 'Profile setup completed');
    } catch (error) {
      console.error('Error setting up profile:', error);
      Alert.alert('Error', 'Failed to setup profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('admin_profiles')
        .update(formData)
        .eq('id', user?.id);

      if (error) throw error;

      await checkProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (!error) {
              router.replace('/auth/login');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image. Please try again.');
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        return;
      }

      await AsyncStorage.multiRemove(['session', 'user']);
      await supabase.auth.signOut();

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
              router.replace('/auth/login');
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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        checkProfile(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.mainContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e3a8a', '#2563eb']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <ThemedText style={styles.loadingText}>Loading your profile...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={styles.backgroundGradient}
      />
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
            progressBackgroundColor="#0f172a"
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <ThemedText style={styles.headerTitle}>Admin Profile</ThemedText>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={40} color="#ffffff" />
                  </View>
                )}
                <View style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <ThemedText style={styles.name}>{profile?.full_name || 'Admin'}</ThemedText>
              )}
              <ThemedText style={styles.email}>{profile?.email || 'admin@example.com'}</ThemedText>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statItem,
                  index < stats.length - 1 && styles.statBorder
                ]}
              >
                <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>

          {/* Profile Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={22} color="#2563eb" />
              <ThemedText style={styles.sectionTitle}>Profile Information</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Full Name</ThemedText>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.full_name || 'Not set'}</ThemedText>
              )}
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Email</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.email || 'Not set'}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Phone</ThemedText>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.phone_number}
                  onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                  placeholder="Phone Number"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="phone-pad"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.phone_number || 'Not set'}</ThemedText>
              )}
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Department</ThemedText>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.department}
                  onChangeText={(text) => setFormData({ ...formData, department: text })}
                  placeholder="Department"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.department || 'Not set'}</ThemedText>
              )}
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Position</ThemedText>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.position}
                  onChangeText={(text) => setFormData({ ...formData, position: text })}
                  placeholder="Position"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.position || 'Not set'}</ThemedText>
              )}
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={22} color="#2563eb" />
              <ThemedText style={styles.sectionTitle}>Account Actions</ThemedText>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <View style={styles.actionContent}>
                <MaterialIcons name="edit" size={24} color="#2563eb" />
                <ThemedText style={styles.actionText}>
                  {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#64748b" />
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <View style={styles.actionContent}>
                  <MaterialIcons name="save" size={24} color="#2563eb" />
                  <ThemedText style={styles.actionText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </ThemedText>
                </View>
                {saving ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#64748b" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.actionContent}>
                <Ionicons name="lock-closed-outline" size={24} color="#2563eb" />
                <ThemedText style={styles.actionText}>Change Password</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton]}
              onPress={handleSignOut}
            >
              <View style={styles.actionContent}>
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                <ThemedText style={[styles.actionText, styles.logoutText]}>Logout</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Change Password</ThemedText>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Current Password</ThemedText>
                <TextInput
                  style={styles.input}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  placeholder="Enter your current password"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>New Password</ThemedText>
                <TextInput
                  style={styles.input}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  placeholder="Enter your new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Confirm New Password</ThemedText>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  placeholder="Confirm your new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, passwordLoading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Update Password</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Settings</ThemedText>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="notifications-outline" size={24} color="#2563eb" />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Push Notifications</ThemedText>
                    <ThemedText style={styles.settingDescription}>Receive notifications about important updates</ThemedText>
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="mail-outline" size={24} color="#2563eb" />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Email Alerts</ThemedText>
                    <ThemedText style={styles.settingDescription}>Receive email notifications for important events</ThemedText>
                  </View>
                </View>
                <Switch
                  value={emailAlerts}
                  onValueChange={setEmailAlerts}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="moon-outline" size={24} color="#2563eb" />
                  <View style={styles.settingText}>
                    <ThemedText style={styles.settingTitle}>Dark Mode</ThemedText>
                    <ThemedText style={styles.settingDescription}>Toggle dark mode theme</ThemedText>
                  </View>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerIcon: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563eb',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  logoutButton: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 8,
    color: '#1e293b',
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    color: '#1e293b',
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default withAuth(AdminProfileScreen); 