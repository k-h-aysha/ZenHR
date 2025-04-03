import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth, withAuth } from '@/lib/auth/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

type UserProfile = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  job_title: string;
  employment_type: string;
  dept: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        // Create initial profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: (user as any).user_metadata?.full_name || '',
              is_active: true,
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // In a real app, you would upload this to storage
        // For now, we'll just update the state
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  };

  const handleEditProfile = () => {
    router.push('/user/edit-profile');
  };

  const handleLogout = () => {
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
            try {
              await logout();
              // No need to call router.replace as it's handled in the AuthContext
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Loading profile...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.headerContainer}>
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={80} color="#9ca3af" />
              </View>
            )}
            <View style={styles.uploadIconContainer}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.profileName}>{profile?.full_name || 'User Name'}</ThemedText>
        <ThemedText style={styles.profileEmail}>{profile?.email || 'user@example.com'}</ThemedText>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/user/account-info')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="person" size={22} color="#0f172a" />
          </View>
          <View style={styles.menuTextContainer}>
            <ThemedText style={styles.menuText}>Account Info</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="lock-closed" size={22} color="#0f172a" />
          </View>
          <View style={styles.menuTextContainer}>
            <ThemedText style={styles.menuText}>Change Password</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-email')}>
          <View style={styles.menuIconContainer}>
            <MaterialIcons name="email" size={22} color="#0f172a" />
          </View>
          <View style={styles.menuTextContainer}>
            <ThemedText style={styles.menuText}>Change Email</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/help-center')}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="help-circle" size={22} color="#0f172a" />
          </View>
          <View style={styles.menuTextContainer}>
            <ThemedText style={styles.menuText}>Help Center</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={styles.menuIconContainer}>
            <Ionicons name="log-out" size={22} color="#ef4444" />
          </View>
          <View style={styles.menuTextContainer}>
            <ThemedText style={[styles.menuText, styles.logoutText]}>Logout</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
        <ThemedText style={styles.editProfileButtonText}>Edit Profile</ThemedText>
      </TouchableOpacity>
      
      <View style={styles.extraSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  extraSpace: {
    height: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    backgroundColor: '#1e3a8a',
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  uploadIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  menuContainer: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: 'rgba(30, 58, 138, 0.8)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  logoutText: {
    color: '#ff4d4d',
  },
  editProfileButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default withAuth(ProfileScreen);