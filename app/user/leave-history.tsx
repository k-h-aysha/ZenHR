import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';

type LeaveRequest = {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  day_part: string;
  duration: string;
  status: string;
  reason: string;
  created_at: string;
};

export default function LeaveHistoryScreen() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaveRequests = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        return;
      }

      setLeaveRequests(data || []);
    } catch (error) {
      console.error('Error in fetchLeaveRequests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchLeaveRequests();
    setRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#3b82f6']}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <ThemedText style={styles.loadingText}>Loading leave requests...</ThemedText>
          </View>
        ) : leaveRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <ThemedText style={styles.emptyText}>No leave requests found</ThemedText>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => router.push('/user/apply-leave')}
            >
              <ThemedText style={styles.applyButtonText}>Apply for Leave</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.newRequestButton}
              onPress={() => router.push('/user/apply-leave')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <ThemedText style={styles.newRequestButtonText}>New Request</ThemedText>
            </TouchableOpacity>

            {leaveRequests.map((leave) => (
              <View key={leave.id} style={styles.leaveCard}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.leaveType}>{leave.leave_type}</ThemedText>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(leave.status)}20` }]}>
                    <ThemedText style={[styles.statusText, { color: getStatusColor(leave.status) }]}>
                      {leave.status}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                      <ThemedText style={styles.dateLabel}>From</ThemedText>
                      <ThemedText style={styles.dateValue}>{formatDate(leave.from_date)}</ThemedText>
                    </View>
                    <View style={styles.dateItem}>
                      <ThemedText style={styles.dateLabel}>To</ThemedText>
                      <ThemedText style={styles.dateValue}>{formatDate(leave.to_date)}</ThemedText>
                    </View>
                    <View style={styles.dateItem}>
                      <ThemedText style={styles.dateLabel}>Duration</ThemedText>
                      <ThemedText style={styles.dateValue}>{leave.duration}</ThemedText>
                    </View>
                  </View>

                  {leave.reason && (
                    <View style={styles.reasonContainer}>
                      <ThemedText style={styles.reasonLabel}>Reason:</ThemedText>
                      <ThemedText style={styles.reasonText}>{leave.reason}</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  newRequestButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  newRequestButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  leaveCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaveType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  reasonContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#ffffff',
  },
}); 