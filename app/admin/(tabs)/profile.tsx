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
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
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

export default function AdminProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
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
          // No profile exists, show setup form
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
      // Fetch employees count
      const { count: employeesCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Fetch departments count
      const { count: departmentsCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      // Fetch active leaves count
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
        // Here you would typically upload the image to your server
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
      // First, verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
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

      // Clear all session data
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

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => setIsEditing(true),
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      onPress: () => setShowPasswordModal(true),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => setShowSettingsModal(true),
    },
    {
      icon: 'shield-outline',
      label: 'Privacy & Security',
      onPress: () => setShowSettingsModal(true),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => setShowSettingsModal(true),
    },
    {
      icon: 'information-circle-outline',
      label: 'About',
      onPress: () => setShowSettingsModal(true),
    },
    {
      icon: 'log-out-outline',
      label: 'Logout',
      onPress: handleSignOut,
      textColor: '#ef4444',
    },
  ];

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
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#93c5fd" />
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#93c5fd"
              colors={['#93c5fd']}
              progressBackgroundColor="#0f172a"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Profile</ThemedText>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name="settings-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarWrapper}>
                    <ThemedText style={styles.avatarText}>
                      {profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'AD'}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Full Name"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
            ) : (
              <ThemedText style={styles.profileName}>{profile?.full_name || 'Admin'}</ThemedText>
            )}
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={formData.position}
                onChangeText={(text) => setFormData({ ...formData, position: text })}
                placeholder="Position"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
            ) : (
              <ThemedText style={styles.profileRole}>{profile?.position || 'Administrator'}</ThemedText>
            )}
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

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" />
              <ThemedText style={styles.infoText}>{profile?.email || user?.email}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
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
                <ThemedText style={styles.infoText}>{profile?.phone_number || 'Not set'}</ThemedText>
              )}
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <ThemedText style={styles.infoText}>Joined {new Date(profile?.created_at || '').toLocaleDateString()}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={20} color="#94a3b8" />
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.department}
                  onChangeText={(text) => setFormData({ ...formData, department: text })}
                  placeholder="Department"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <ThemedText style={styles.infoText}>{profile?.department || 'Not set'}</ThemedText>
              )}
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name={item.icon as any} size={24} color="#93c5fd" />
                  <ThemedText style={styles.menuItemLabel}>{item.label}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button (when editing) */}
          {isEditing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
              )}
            </TouchableOpacity>
          )}

          {/* Setup Form (if needed) */}
          {isSetup && (
            <View style={styles.setupSection}>
              <ThemedText style={styles.setupTitle}>Complete Your Profile</ThemedText>
              <TextInput
                style={styles.setupInput}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Full Name *"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
              <TextInput
                style={styles.setupInput}
                value={formData.department}
                onChangeText={(text) => setFormData({ ...formData, department: text })}
                placeholder="Department *"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
              <TextInput
                style={styles.setupInput}
                value={formData.position}
                onChangeText={(text) => setFormData({ ...formData, position: text })}
                placeholder="Position *"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
              />
              <TextInput
                style={styles.setupInput}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                placeholder="Phone Number"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.setupButton, saving && styles.setupButtonDisabled]}
                onPress={handleSetup}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <ThemedText style={styles.setupButtonText}>Complete Setup</ThemedText>
                )}
              </TouchableOpacity>
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
                  <View style={styles.settingsSection}>
                    <ThemedText style={styles.settingsSectionTitle}>Notifications</ThemedText>
                    <View style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Ionicons name="notifications-outline" size={24} color="#93c5fd" />
                        <ThemedText style={styles.settingItemLabel}>Push Notifications</ThemedText>
                      </View>
                      <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                        trackColor={{ false: '#64748b', true: '#93c5fd' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                    <View style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Ionicons name="mail-outline" size={24} color="#93c5fd" />
                        <ThemedText style={styles.settingItemLabel}>Email Alerts</ThemedText>
                      </View>
                      <Switch
                        value={emailAlerts}
                        onValueChange={setEmailAlerts}
                        trackColor={{ false: '#64748b', true: '#93c5fd' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <View style={styles.settingsSection}>
                    <ThemedText style={styles.settingsSectionTitle}>Appearance</ThemedText>
                    <View style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Ionicons name="moon-outline" size={24} color="#93c5fd" />
                        <ThemedText style={styles.settingItemLabel}>Dark Mode</ThemedText>
                      </View>
                      <Switch
                        value={theme === 'dark'}
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#64748b', true: '#93c5fd' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>

                  <View style={styles.settingsSection}>
                    <ThemedText style={styles.settingsSectionTitle}>Support</ThemedText>
                    <TouchableOpacity style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Ionicons name="help-circle-outline" size={24} color="#93c5fd" />
                        <ThemedText style={styles.settingItemLabel}>Help & Support</ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingItem}>
                      <View style={styles.settingItemContent}>
                        <Ionicons name="information-circle-outline" size={24} color="#93c5fd" />
                        <ThemedText style={styles.settingItemLabel}>About</ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

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
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#93c5fd',
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerIcon: {
    padding: 8,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#93c5fd',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#93c5fd',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#94a3b8',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  menuSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  setupSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 24,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  setupInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  setupButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  setupButtonDisabled: {
    opacity: 0.7,
  },
  setupButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 197, 253, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  editButtonText: {
    color: '#93c5fd',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
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
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    width: '100%',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#ffffff',
  },
}); 