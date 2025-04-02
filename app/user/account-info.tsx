import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth, withAuth } from '@/lib/auth/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

type UserProfile = {
  id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  address: string;
  user_id: string;
  job_title: string;
  employment_type: string;
  dept: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
};

function AccountInfoScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [user]);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      return () => {};
    }, [user])
  );

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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not Set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={styles.backgroundGradient}
      />
      <ScrollView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Account Info</ThemedText>
        </View>

        <View style={styles.profileContainer}>
          <View style={styles.profileImageSection}>
            <View style={styles.profileImageContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={60} color="#c7d2fe" />
                </View>
              )}
            </View>
            <ThemedText style={styles.profileName}>{profile?.full_name || 'Not Set'}</ThemedText>
            <View style={styles.badgeContainer}>
              <LinearGradient
                colors={['#1e40af', '#3b82f6']}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.badge}
              >
                <ThemedText style={styles.badgeText}>{profile?.job_title || 'Employee'}</ThemedText>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={22} color="#2563eb" />
              <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Email</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.email || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Phone</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.phone || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Date of Birth</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{formatDate(profile?.date_of_birth)}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Gender</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.gender || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Nationality</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.nationality || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={[styles.infoRow, styles.lastRow]}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Address</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.address || 'Not Set'}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="briefcase" size={18} color="#2563eb" />
              <ThemedText style={styles.sectionTitle}>Employment Details</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Job Title</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.job_title || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Department</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.dept || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Employment Type</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{profile?.employment_type || 'Not Set'}</ThemedText>
              </View>
            </View>

            <View style={[styles.infoRow, styles.lastRow]}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Status</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <View style={[styles.statusBadge, profile?.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                  <ThemedText style={[styles.statusText, profile?.is_active ? styles.activeText : styles.inactiveText]}>
                    {profile?.is_active ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={22} color="#2563eb" />
              <ThemedText style={styles.sectionTitle}>Account Details</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Created</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{formatDate(profile?.created_at)}</ThemedText>
              </View>
            </View>

            <View style={[styles.infoRow, styles.lastRow]}>
              <View style={styles.infoLabel}>
                <ThemedText style={styles.infoLabelText}>Last Updated</ThemedText>
              </View>
              <View style={styles.infoValue}>
                <ThemedText style={styles.infoValueText}>{formatDate(profile?.updated_at)}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('/user/edit-profile')}
        >
          <LinearGradient
            colors={['#1e40af', '#3b82f6']}
            start={[0, 0]}
            end={[1, 0]}
            style={styles.editButtonGradient}
          >
            <Ionicons name="pencil" size={20} color="#ffffff" style={styles.editButtonIcon} />
            <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileContainer: {
    marginTop: -20,
    paddingHorizontal: 16,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 24,
  },
  profileImageContainer: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  badgeContainer: {
    marginTop: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    width: '40%',
  },
  infoLabelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    width: '60%',
  },
  infoValueText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#bbf7d0',
  },
  inactiveBadge: {
    backgroundColor: '#fecaca',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#166534',
  },
  inactiveText: {
    color: '#b91c1c',
  },
  editButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  editButtonIcon: {
    marginRight: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default withAuth(AccountInfoScreen); 