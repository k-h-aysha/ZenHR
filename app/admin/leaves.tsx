import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';

const { width } = Dimensions.get('window');

// Mock data for leave requests
const mockLeaveRequests = [
  {
    id: '1',
    employeeName: 'John Doe',
    type: 'Annual Leave',
    startDate: '2024-03-15',
    endDate: '2024-03-20',
    status: 'pending',
  },
  {
    id: '2',
    employeeName: 'Sarah Smith',
    type: 'Sick Leave',
    startDate: '2024-03-18',
    endDate: '2024-03-19',
    status: 'approved',
  },
  {
    id: '3',
    employeeName: 'Mike Johnson',
    type: 'Annual Leave',
    startDate: '2024-03-25',
    endDate: '2024-03-28',
    status: 'pending',
  },
];

export default function LeavesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredLeaves = mockLeaveRequests.filter(leave => {
    if (selectedFilter === 'all') return true;
    return leave.status === selectedFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4ade80';
      case 'rejected':
        return '#ef4444';
      default:
        return '#fbbf24';
    }
  };

  const handleApprove = (leaveId: string) => {
    // Implement leave approval logic
    console.log('Approve leave:', leaveId);
  };

  const handleReject = (leaveId: string) => {
    // Implement leave rejection logic
    console.log('Reject leave:', leaveId);
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Leave Requests</ThemedText>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <ThemedText style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                All
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('pending')}
            >
              <ThemedText style={[styles.filterText, selectedFilter === 'pending' && styles.filterTextActive]}>
                Pending
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'approved' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('approved')}
            >
              <ThemedText style={[styles.filterText, selectedFilter === 'approved' && styles.filterTextActive]}>
                Approved
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Leave Requests List */}
          <View style={styles.leavesList}>
            {filteredLeaves.map(leave => (
              <View key={leave.id} style={styles.leaveCard}>
                <View style={styles.leaveHeader}>
                  <ThemedText style={styles.employeeName}>{leave.employeeName}</ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leave.status) }]}>
                    <ThemedText style={styles.statusText}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </ThemedText>
                  </View>
                </View>
                
                <View style={styles.leaveDetails}>
                  <View style={styles.leaveInfo}>
                    <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                    <ThemedText style={styles.leaveText}>
                      {leave.startDate} - {leave.endDate}
                    </ThemedText>
                  </View>
                  <View style={styles.leaveInfo}>
                    <Ionicons name="bookmark-outline" size={16} color="#94a3b8" />
                    <ThemedText style={styles.leaveText}>{leave.type}</ThemedText>
                  </View>
                </View>

                {leave.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(leave.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="#4ade80" />
                      <ThemedText style={[styles.actionText, { color: '#4ade80' }]}>Approve</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(leave.id)}
                    >
                      <Ionicons name="close" size={20} color="#ef4444" />
                      <ThemedText style={[styles.actionText, { color: '#ef4444' }]}>Reject</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
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
  filters: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#93c5fd',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#1e3a8a',
  },
  leavesList: {
    gap: 12,
  },
  leaveCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  leaveDetails: {
    gap: 8,
  },
  leaveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaveText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  rejectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 