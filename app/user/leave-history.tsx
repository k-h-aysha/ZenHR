import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Mock data for leave history
const leaveHistory = [
  { 
    id: '1', 
    type: 'Annual Leave', 
    dates: 'Jan 15-17, 2023', 
    duration: '3 days',
    reason: 'Family vacation',
    status: 'Approved' 
  },
  { 
    id: '2', 
    type: 'Sick Leave', 
    dates: 'Feb 05, 2023', 
    duration: '1 day',
    reason: 'Fever and cold',
    status: 'Approved' 
  },
  { 
    id: '3', 
    type: 'Personal Leave', 
    dates: 'Mar 22, 2023', 
    duration: 'Half day (PM)',
    reason: 'Doctor appointment',
    status: 'Approved' 
  },
  { 
    id: '4', 
    type: 'Annual Leave', 
    dates: 'Apr 10-14, 2023', 
    duration: '5 days',
    reason: 'Family event',
    status: 'Rejected' 
  },
  { 
    id: '5', 
    type: 'Unpaid Leave', 
    dates: 'May 29-30, 2023', 
    duration: '2 days',
    reason: 'Personal matters',
    status: 'Pending' 
  },
];

// Stats data
const stats = {
  presentDays: 221,
  leavesTaken: 11,
  workingDays: 232,
};

// Leave status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let backgroundColor;
  let textColor = '#ffffff';
  
  switch(status) {
    case 'Approved':
      backgroundColor = '#10b981'; // emerald/green
      break;
    case 'Rejected':
      backgroundColor = '#ef4444'; // red
      break;
    case 'Pending':
      backgroundColor = '#f59e0b'; // amber/yellow
      break;
    default:
      backgroundColor = '#6b7280'; // gray
  }
  
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <ThemedText style={[styles.statusText, { color: textColor }]}>{status}</ThemedText>
    </View>
  );
};

export default function LeaveHistoryScreen() {
  return (
    <LinearGradient
      colors={['#1e3a8a', '#0f172a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Leave History</ThemedText>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.presentDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Present Days</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.leavesTaken}</ThemedText>
            <ThemedText style={styles.statLabel}>Leaves Taken</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <ThemedText style={styles.statNumber}>{stats.workingDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Working Days</ThemedText>
          </View>
        </View>
        
        <ThemedText style={styles.sectionTitle}>Recent Leave Requests</ThemedText>
        
        {/* Leave History List */}
        <View style={styles.leaveHistoryContainer}>
          {leaveHistory.map(leave => (
            <View key={leave.id} style={styles.leaveItem}>
              <View style={styles.leaveInfo}>
                <ThemedText style={styles.leaveType}>{leave.type}</ThemedText>
                <ThemedText style={styles.leaveDates}>{leave.dates} ({leave.duration})</ThemedText>
                <ThemedText style={styles.leaveReason}>{leave.reason}</ThemedText>
              </View>
              <StatusBadge status={leave.status} />
            </View>
          ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '31%',
    backgroundColor: '#f8fafc', // White-like color (very light gray)
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 0,
    // Removing shadow properties
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a', // Darker color for better contrast on white background
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#3b82f6', // Blue color that will contrast well with white background
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#ffffff',
  },
  leaveHistoryContainer: {
    marginBottom: 20,
  },
  leaveItem: {
    backgroundColor: 'transparent', // Transparent background
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1, // Add border
    borderColor: '#93c5fd', // Light blue border color
    // Removing shadow properties
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  leaveInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 14,
    color: '#e0f2fe',
    marginBottom: 2,
  },
  leaveReason: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  }
}); 