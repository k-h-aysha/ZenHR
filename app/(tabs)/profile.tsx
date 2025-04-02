import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, RefreshControl, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  department: string;
  position: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    department: '',
    position: '',
    bio: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        department: data.department || '',
        position: data.position || '',
        bio: data.bio || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  const stats = [
    { label: 'Tasks', value: '12' },
    { label: 'Projects', value: '5' },
    { label: 'Teams', value: '3' },
  ];

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => setIsEditing(true),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon!'),
    },
    {
      icon: 'shield-outline',
      label: 'Privacy',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon!'),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon!'),
    },
  ];

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
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <ThemedText style={styles.avatarText}>
                    {profile?.full_name?.split(' ').map((n) => n[0]).join('') || 'U'}
                  </ThemedText>
                )}
              </View>
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
              <ThemedText style={styles.profileName}>{profile?.full_name || 'User'}</ThemedText>
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
              <ThemedText style={styles.profileRole}>{profile?.position || 'Position not set'}</ThemedText>
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
                  style={[styles.editInput, styles.inlineEdit]}
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
              <Ionicons name="business-outline" size={20} color="#94a3b8" />
              {isEditing ? (
                <TextInput
                  style={[styles.editInput, styles.inlineEdit]}
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
              style={styles.saveButton}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
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
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#93c5fd',
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
  inlineEdit: {
    textAlign: 'left',
    marginLeft: 12,
    flex: 1,
    marginBottom: 0,
  },
  saveButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
}); 