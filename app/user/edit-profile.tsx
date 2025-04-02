import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
};

function EditProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form field states
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Initialize form fields
        setDateOfBirth(data.date_of_birth || '');
        setGender(data.gender || '');
        setNationality(data.nationality || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user has made any changes
    if (!profile) return;
    
    const hasChanged = 
      dateOfBirth !== (profile.date_of_birth || '') ||
      gender !== (profile.gender || '') ||
      nationality !== (profile.nationality || '') ||
      phone !== (profile.phone || '') ||
      address !== (profile.address || '');
    
    setHasChanges(hasChanged);
  }, [dateOfBirth, gender, nationality, phone, address, profile]);

  const handleSave = async () => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      // Validate date format (YYYY-MM-DD)
      if (dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateOfBirth)) {
          Alert.alert('Invalid Date', 'Please enter the date in YYYY-MM-DD format');
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from('user_profile')
        .update({
          date_of_birth: dateOfBirth || null,
          gender,
          nationality,
          phone,
          address,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile information updated successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleCancel}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Edit Profile</ThemedText>
            {saving ? (
              <ActivityIndicator color="#ffffff" style={styles.saveButton} />
            ) : (
              <TouchableOpacity 
                style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!hasChanges}
              >
                <Ionicons name="checkmark" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formContainer}>
            {/* Personal Information Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="person" size={22} color="#2563eb" />
                <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Full Name</ThemedText>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.full_name || ''}
                  editable={false}
                  placeholder="Your name"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={styles.fieldHint}>Name cannot be changed</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Date of Birth</ThemedText>
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Gender</ThemedText>
                <TextInput
                  style={styles.input}
                  value={gender}
                  onChangeText={setGender}
                  placeholder="Enter your gender"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Nationality</ThemedText>
                <TextInput
                  style={styles.input}
                  value={nationality}
                  onChangeText={setNationality}
                  placeholder="Enter your nationality"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Email</ThemedText>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.email || ''}
                  editable={false}
                  placeholder="Your email"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={styles.fieldHint}>Email cannot be changed</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Phone</ThemedText>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Address</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your address"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Employment Information Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="briefcase-outline" size={22} color="#2563eb" />
                <ThemedText style={styles.sectionTitle}>Employment Information</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Job Title</ThemedText>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.job_title || ''}
                  editable={false}
                  placeholder="Your job title"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={styles.fieldHint}>Job title cannot be changed</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Department</ThemedText>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.dept || ''}
                  editable={false}
                  placeholder="Your department"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={styles.fieldHint}>Department cannot be changed</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.fieldLabel}>Employment Type</ThemedText>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={profile?.employment_type || ''}
                  editable={false}
                  placeholder="Your employment type"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={styles.fieldHint}>Employment type cannot be changed</ThemedText>
              </View>
            </View>
          </View>

          {/* Add extra space at bottom for better scrolling */}
          <View style={styles.extraSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Add extra padding at the bottom
  },
  extraSpace: {
    height: 80, // Extra space at the end of content
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
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28, // Increase space between sections
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
  fieldContainer: {
    marginBottom: 22, // Increase space between fields
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#334155',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default withAuth(EditProfileScreen); 