import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { withAuth } from '../../lib/auth/AuthContext';
import { signOutUser } from '../../lib/supabase';

function AdminDashboard() {
  const handleSignOut = async () => {
    const { error } = await signOutUser();
    if (!error) {
      router.replace('/auth/login');
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#2563eb']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>150</Text>
            <Text style={styles.statLabel}>Total Employees</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>25</Text>
            <Text style={styles.statLabel}>New Requests</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Add Employee</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Manage Departments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {[1, 2, 3].map((item) => (
              <View key={item} style={styles.activityItem}>
                <Text style={styles.activityText}>New employee registration request</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  signOutButton: {
    backgroundColor: '#93c5fd',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 8,
  },
  activityText: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
  },
  activityTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
});

export default withAuth(AdminDashboard); 