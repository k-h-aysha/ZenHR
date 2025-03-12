import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function AdminProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const adminInfo = {
    name: 'John Smith',
    role: 'HR Administrator',
    email: 'john.smith@company.com',
    phone: '+1 234 567 8900',
    joinDate: 'January 2022',
    department: 'Human Resources',
  };

  const stats = [
    { label: 'Employees', value: '150' },
    { label: 'Departments', value: '12' },
    { label: 'Active Leaves', value: '8' },
  ];

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => console.log('Navigate to edit profile'),
    },
    {
      icon: 'lock-closed-outline',
      label: 'Change Password',
      onPress: () => console.log('Navigate to change password'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => console.log('Navigate to notifications'),
    },
    {
      icon: 'shield-outline',
      label: 'Privacy & Security',
      onPress: () => console.log('Navigate to privacy'),
    },
  ];

  const pickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
          return;
        }
      }

      // Launch image picker
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
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Profile</ThemedText>
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
                      {adminInfo.name.split(' ').map(n => n[0]).join('')}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.editAvatarButton}>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.profileName}>{adminInfo.name}</ThemedText>
            <ThemedText style={styles.profileRole}>{adminInfo.role}</ThemedText>
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
              <ThemedText style={styles.infoText}>{adminInfo.email}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <ThemedText style={styles.infoText}>{adminInfo.phone}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
              <ThemedText style={styles.infoText}>Joined {adminInfo.joinDate}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={20} color="#94a3b8" />
              <ThemedText style={styles.infoText}>{adminInfo.department}</ThemedText>
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
                  <Ionicons name={item.icon} size={24} color="#93c5fd" />
                  <ThemedText style={styles.menuItemLabel}>{item.label}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 100, // Add padding for bottom tab bar
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
}); 