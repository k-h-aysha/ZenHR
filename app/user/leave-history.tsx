import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';

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
};

// Stats data structure
type StatsData = {
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
};

// Leave status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let backgroundColor;
  let textColor = '#ffffff';
  
  switch(status.toLowerCase()) {
    case 'approved':
      backgroundColor = '#10b981'; // emerald/green
      break;
    case 'rejected':
      backgroundColor = '#ef4444'; // red
      break;
    case 'pending':
      backgroundColor = '#f59e0b'; // amber/yellow
      break;
    default:
      backgroundColor = '#6b7280'; // gray
  }
  
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <ThemedText style={[styles.statusText, { color: textColor }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</ThemedText>
    </View>
  );
};

// Filter button component
const FilterButton = ({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.filterButton, isActive && styles.activeFilterButton]} 
    onPress={onPress}
  >
    <ThemedText style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
      {title}
    </ThemedText>
  </TouchableOpacity>
);

export default function LeaveHistoryScreen() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredLeaveRequests, setFilteredLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });
  const [activeFilter, setActiveFilter] = useState('All');

  // Available filters
  const filters = ['All', 'Annual', 'Sick', 'Personal', 'Family', 'Other'];

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

      const leaves = data || [];
      setLeaveRequests(leaves);
      setFilteredLeaveRequests(leaves);
      
      // Calculate stats
      calculateStats(leaves);
    } catch (error) {
      console.error('Error in fetchLeaveRequests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leaves: LeaveRequest[]) => {
    const pendingRequests = leaves.filter(leave => leave.status.toLowerCase() === 'pending').length;
    const approvedRequests = leaves.filter(leave => leave.status.toLowerCase() === 'approved').length;
    const rejectedRequests = leaves.filter(leave => leave.status.toLowerCase() === 'rejected').length;

    setStats({
      pendingRequests,
      approvedRequests,
      rejectedRequests
    });
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchLeaveRequests();
    setRefreshing(false);
  }, []);

  const handleFilter = (filter: string) => {
    setActiveFilter(filter);
    
    if (filter === 'All') {
      setFilteredLeaveRequests(leaveRequests);
      return;
    }
    
    const filtered = leaveRequests.filter(leave => 
      leave.leave_type.toLowerCase().includes(filter.toLowerCase())
    );
    setFilteredLeaveRequests(filtered);
  };

  const formatDateRange = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    const fromMonth = from.toLocaleString('en-US', { month: 'short' });
    const toMonth = to.toLocaleString('en-US', { month: 'short' });
    
    if (fromMonth === toMonth && from.getFullYear() === to.getFullYear()) {
      return `${fromMonth} ${from.getDate()}-${to.getDate()}, ${from.getFullYear()}`;
    }
    
    return `${fromMonth} ${from.getDate()}, ${from.getFullYear()} - ${toMonth} ${to.getDate()}, ${to.getFullYear()}`;
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
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <ThemedText style={styles.statNumber}>{stats.pendingRequests}</ThemedText>
                <ThemedText style={styles.statLabel}>Pending Requests</ThemedText>
              </View>
              
              <View style={styles.statCard}>
                <ThemedText style={styles.statNumber}>{stats.approvedRequests}</ThemedText>
                <ThemedText style={styles.statLabel}>Approved Requests</ThemedText>
              </View>
              
              <View style={styles.statCard}>
                <ThemedText style={styles.statNumber}>{stats.rejectedRequests}</ThemedText>
                <ThemedText style={styles.statLabel}>Rejected Requests</ThemedText>
              </View>
            </View>
            
            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterScrollContent}
              >
                {filters.map((filter) => (
                  <FilterButton
                    key={filter}
                    title={filter}
                    isActive={activeFilter === filter}
                    onPress={() => handleFilter(filter)}
                  />
                ))}
              </ScrollView>
            </View>
            
            <ThemedText style={styles.sectionTitle}>Recent Leave Requests</ThemedText>
            
            {filteredLeaveRequests.length === 0 ? (
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
                {/* New Request Button */}
                <TouchableOpacity
                  style={styles.newRequestButton}
                  onPress={() => router.push('/user/apply-leave')}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                  <ThemedText style={styles.newRequestButtonText}>New Request</ThemedText>
                </TouchableOpacity>
                
                {/* Leave History List */}
                <View style={styles.leaveHistoryContainer}>
                  {filteredLeaveRequests.map(leave => (
                    <View key={leave.id} style={styles.leaveItem}>
                      <View style={styles.leaveInfo}>
                        <ThemedText style={styles.leaveType}>{leave.leave_type}</ThemedText>
                        <ThemedText style={styles.leaveDates}>
                          {formatDateRange(leave.from_date, leave.to_date)} ({leave.duration})
                        </ThemedText>
                        <ThemedText style={styles.leaveReason}>{leave.reason}</ThemedText>
                      </View>
                      <StatusBadge status={leave.status} />
                    </View>
                  ))}
                </View>
              </>
            )}
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
  filterContainer: {
    marginBottom: 20,
  },
  filterScrollContent: {
    paddingVertical: 5,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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