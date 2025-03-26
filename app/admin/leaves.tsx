import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  day_part: string;
  duration: string;
  status: string;
  reason: string;
  created_at: string;
  employee_name?: string;
};

export default function AdminLeavesScreen() {
  const insets = useSafeAreaInsets();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const { data: leaves, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:employee_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedLeaves = leaves.map(leave => ({
        ...leave,
        employee_name: leave.profiles?.full_name || 'Unknown Employee'
      }));

      setLeaveRequests(transformedLeaves);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchLeaveRequests();
    setRefreshing(false);
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const action = newStatus === 'approved' ? 'approve' : 'reject';
    const title = newStatus === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request';
    const message = newStatus === 'approved' 
      ? 'Are you sure you want to approve this leave request?'
      : 'Are you sure you want to reject this leave request?';

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: newStatus === 'approved' ? 'Approve' : 'Reject',
          style: newStatus === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('leave_requests')
                .update({ status: newStatus })
                .eq('id', id);

              if (error) throw error;

              setLeaveRequests(prev =>
                prev.map(leave =>
                  leave.id === id ? { ...leave, status: newStatus } : leave
                )
              );

              Alert.alert(
                'Success',
                `Leave request ${action}ed successfully`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error updating leave status:', error);
              Alert.alert(
                'Error',
                `Failed to ${action} leave request. Please try again.`,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const filteredLeaves = leaveRequests.filter(leave => {
    const matchesSearch = (leave.employee_name ?? 'Unknown Employee').toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.leave_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedFilter === 'all' || leave.status.toLowerCase() === selectedFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#fbbf24';
      case 'approved':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'rejected' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('rejected')}
            >
              <ThemedText style={[styles.filterText, selectedFilter === 'rejected' && styles.filterTextActive]}>
                Rejected
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or leave type..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Leave Requests List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.loadingText}>Loading leave requests...</ThemedText>
            </View>
          ) : filteredLeaves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
              <ThemedText style={styles.emptyText}>No leave requests found</ThemedText>
            </View>
          ) : (
            filteredLeaves.map((leave) => (
              <TouchableOpacity
                key={leave.id}
                style={styles.leaveCard}
                onPress={() => console.log('View details:', leave.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.employeeInfo}>
                    <ThemedText style={styles.employeeName}>{leave.employee_name}</ThemedText>
                    <ThemedText style={styles.leaveType}>{leave.leave_type}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(leave.status)}20` }]}>
                    <ThemedText style={[styles.statusText, { color: getStatusColor(leave.status) }]}>
                      {leave.status}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.dateContainer}>
                    <View style={styles.dateItem}>
                      <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                      <ThemedText style={styles.dateText}>
                        {formatDate(leave.from_date)} - {formatDate(leave.to_date)}
                      </ThemedText>
                    </View>
                    <View style={styles.dateItem}>
                      <Ionicons name="time-outline" size={16} color="#94a3b8" />
                      <ThemedText style={styles.dateText}>
                        {leave.day_part} • {leave.duration}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.reasonText} numberOfLines={2}>
                    {leave.reason}
                  </ThemedText>

                  {leave.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleStatusChange(leave.id, 'approved')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
                        <ThemedText style={[styles.actionButtonText, { color: '#22c55e' }]}>
                          Approve
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleStatusChange(leave.id, 'rejected')}
                      >
                        <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                        <ThemedText style={[styles.actionButtonText, { color: '#ef4444' }]}>
                          Reject
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
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
    alignItems: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#ffffff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
  leaveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardContent: {
    padding: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateContainer: {
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  approveButton: {
    backgroundColor: '#f0fdf4',
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});