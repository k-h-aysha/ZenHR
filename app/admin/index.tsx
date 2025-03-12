import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();

  const stats = {
    totalEmployees: 150,
    activeLeaves: 8,
    departments: 12,
    pendingRequests: 5
  };

  const recentActivities = [
    { id: '1', type: 'leave', message: 'John Doe requested annual leave', time: '2 hours ago' },
    { id: '2', type: 'join', message: 'Sarah Smith joined Marketing team', time: '5 hours ago' },
    { id: '3', type: 'leave', message: 'Mike Johnson approved leave request', time: '1 day ago' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#ffffff" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#f1f5f9' }]}>
              <ThemedText style={styles.statNumber}>{stats.totalEmployees}</ThemedText>
              <ThemedText style={styles.statLabel}>Total Employees</ThemedText>
              <Ionicons name="people" size={24} color="#1e3a8a" style={styles.statIcon} />
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <ThemedText style={styles.statNumber}>{stats.activeLeaves}</ThemedText>
              <ThemedText style={styles.statLabel}>Active Leaves</ThemedText>
              <Ionicons name="calendar" size={24} color="#1e3a8a" style={styles.statIcon} />
            </View>
            <View style={[styles.statCard, { backgroundColor: '#e0f2fe' }]}>
              <ThemedText style={styles.statNumber}>{stats.departments}</ThemedText>
              <ThemedText style={styles.statLabel}>Departments</ThemedText>
              <Ionicons name="business" size={24} color="#1e3a8a" style={styles.statIcon} />
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
              <ThemedText style={styles.statNumber}>{stats.pendingRequests}</ThemedText>
              <ThemedText style={styles.statLabel}>Pending Requests</ThemedText>
              <Ionicons name="time" size={24} color="#1e3a8a" style={styles.statIcon} />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
                  <Ionicons name="person-add" size={24} color="#93c5fd" />
                </View>
                <ThemedText style={styles.actionText}>Add Employee</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Ionicons name="document-text" size={24} color="#4ade80" />
                </View>
                <ThemedText style={styles.actionText}>View Reports</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                  <Ionicons name="settings" size={24} color="#fbbf24" />
                </View>
                <ThemedText style={styles.actionText}>Settings</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
            {recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={activity.type === 'leave' ? 'calendar' : 'person-add'}
                    size={20}
                    color="#93c5fd"
                  />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={styles.activityMessage}>{activity.message}</ThemedText>
                  <ThemedText style={styles.activityTime}>{activity.time}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    opacity: 0.8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
}); 