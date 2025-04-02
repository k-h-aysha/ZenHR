import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { RealtimeChannel } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');

interface Activity {
  id: string;
  type: 'leave' | 'task' | 'employee';
  message: string;
  time: string;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
}

interface Stats {
  totalEmployees: number;
  activeLeaves: number;
  departments: number;
  pendingRequests: number;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalEmployees: 0,
    activeLeaves: 0,
    departments: 0,
    pendingRequests: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subscriptions, setSubscriptions] = useState<RealtimeChannel[]>([]);

  useEffect(() => {
    fetchDashboardData();
    setupRealtimeSubscriptions();
    return () => {
      subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    };
  }, []);

  const setupRealtimeSubscriptions = () => {
    const newSubscriptions: RealtimeChannel[] = [];

    // Subscribe to leave requests changes
    const leaveSubscription = supabase
      .channel('leave_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests'
        },
        async (payload) => {
          if (!payload.new || typeof payload.new !== 'object' || !('id' in payload.new)) return;

          const { data: leaveData } = await supabase
            .from('leave_requests')
            .select(`
              *,
              profiles:employee_id (
                full_name
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (leaveData) {
            const newActivity: Activity = {
              id: `leave-${leaveData.id}`,
              type: 'leave',
              message: `${leaveData.profiles?.full_name || 'Employee'} ${leaveData.status === 'pending' ? 'requested' : 'was approved for'} leave`,
              time: new Date(leaveData.created_at).toISOString(),
              created_at: leaveData.created_at
            };

            setRecentActivities(prev => {
              const filtered = prev.filter(activity => activity.id !== `leave-${leaveData.id}`);
              return [newActivity, ...filtered].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ).slice(0, 5);
            });
          }
        }
      )
      .subscribe();

    newSubscriptions.push(leaveSubscription);

    // Subscribe to tasks changes
    const taskSubscription = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        async (payload) => {
          if (!payload.new || typeof payload.new !== 'object' || !('id' in payload.new)) return;

          const { data: taskData } = await supabase
            .from('tasks')
            .select(`
              *,
              assigned_to:employee_id (
                full_name
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (taskData) {
            const newActivity: Activity = {
              id: `task-${taskData.id}`,
              type: 'task',
              message: `${taskData.assigned_to?.full_name || 'Employee'} ${taskData.status === 'pending' ? 'was assigned' : 'completed'} task: ${taskData.title}`,
              time: new Date(taskData.created_at).toISOString(),
              created_at: taskData.created_at
            };

            setRecentActivities(prev => {
              const filtered = prev.filter(activity => activity.id !== `task-${taskData.id}`);
              return [newActivity, ...filtered].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              ).slice(0, 5);
            });
          }
        }
      )
      .subscribe();

    newSubscriptions.push(taskSubscription);

    // Subscribe to employee changes
    const employeeSubscription = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.employee'
        },
        (payload) => {
          if (!payload.new) return;

          const newActivity: Activity = {
            id: `employee-${payload.new.id}`,
            type: 'employee',
            message: `New employee ${payload.new.full_name} joined the team`,
            time: new Date(payload.new.created_at).toISOString(),
            created_at: payload.new.created_at
          };

          setRecentActivities(prev => {
            const filtered = prev.filter(activity => activity.id !== `employee-${payload.new.id}`);
            return [newActivity, ...filtered].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ).slice(0, 5);
          });
        }
      )
      .subscribe();

    newSubscriptions.push(employeeSubscription);

    // Subscribe to announcements changes
    const announcementSubscription = supabase
      .channel('announcements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    newSubscriptions.push(announcementSubscription);

    setSubscriptions(newSubscriptions);
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total employees
      const { count: employeesCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Fetch active leaves
      const { count: activeLeavesCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Fetch departments count
      const { count: departmentsCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      // Fetch pending requests
      const { count: pendingRequestsCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch recent activities from different sources
      const [leavesResponse, tasksResponse, employeesResponse] = await Promise.all([
        // Fetch recent leave requests
        supabase
          .from('leave_requests')
          .select(`
            *,
            profiles:employee_id (
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        // Fetch recent tasks
        supabase
          .from('tasks')
          .select(`
            *,
            assigned_to:employee_id (
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5),

        // Fetch recent employee activities
        supabase
          .from('users')
          .select('*')
          .eq('role', 'employee')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Combine and format all activities
      const allActivities: Activity[] = [
        // Format leave activities
        ...(leavesResponse.data?.map(leave => ({
          id: `leave-${leave.id}`,
          type: 'leave' as const,
          message: `${leave.profiles?.full_name || 'Employee'} ${leave.status === 'pending' ? 'requested' : 'was approved for'} leave`,
          time: new Date(leave.created_at).toISOString(),
          created_at: leave.created_at
        })) || []),

        // Format task activities
        ...(tasksResponse.data?.map(task => ({
          id: `task-${task.id}`,
          type: 'task' as const,
          message: `${task.assigned_to?.full_name || 'Employee'} ${task.status === 'pending' ? 'was assigned' : 'completed'} task: ${task.title}`,
          time: new Date(task.created_at).toISOString(),
          created_at: task.created_at
        })) || []),

        // Format employee activities
        ...(employeesResponse.data?.map(employee => ({
          id: `employee-${employee.id}`,
          type: 'employee' as const,
          message: `New employee ${employee.full_name} joined the team`,
          time: new Date(employee.created_at).toISOString(),
          created_at: employee.created_at
        })) || [])
      ];

      // Sort all activities by creation date and take the 5 most recent
      const recentActivities = allActivities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(activity => ({
          ...activity,
          time: new Date(activity.time).toLocaleDateString()
        }));

      // Fetch announcements
      await fetchAnnouncements();

      setStats({
        totalEmployees: employeesCount || 0,
        activeLeaves: activeLeavesCount || 0,
        departments: departmentsCount || 0,
        pendingRequests: pendingRequestsCount || 0
      });

      setRecentActivities(recentActivities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#93c5fd" />
          <ThemedText style={styles.loadingText}>Loading dashboard...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <FlatList
          data={[1]}
          renderItem={() => (
            <View style={styles.scrollContent}>
              {/* Header */}
              <View style={styles.header}>
                <ThemedText style={styles.headerTitle}>Admin Dashboard</ThemedText>
                {stats.pendingRequests > 0 && <View style={styles.notificationBadge} />}
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
                <FlatList
                  data={[
                    { id: '1', icon: 'person-add' as const, color: 'rgba(96, 165, 250, 0.2)', iconColor: '#93c5fd', text: 'Add Employee', route: '/admin/employees' },
                    { id: '2', icon: 'checkmark-circle' as const, color: 'rgba(34, 197, 94, 0.2)', iconColor: '#4ade80', text: 'Tasks', route: '/admin/tasks' },
                    { id: '3', icon: 'calendar' as const, color: 'rgba(251, 191, 36, 0.2)', iconColor: '#fbbf24', text: 'Leaves', route: '/admin/leaves' },
                    { id: '4', icon: 'megaphone' as const, color: 'rgba(236, 72, 153, 0.2)', iconColor: '#ec4899', text: 'Announcements', route: '/admin/announcements' },
                    { id: '5', icon: 'cash' as const, color: 'rgba(139, 92, 246, 0.2)', iconColor: '#a78bfa', text: 'Payroll', route: '/admin/payroll' }
                  ]}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickActionsContainer}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(item.route)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon} size={24} color={item.iconColor} />
                      </View>
                      <ThemedText style={styles.actionText}>{item.text}</ThemedText>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.id}
                />
              </View>

              {/* Announcements */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>Announcements</ThemedText>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/admin/announcements')}
                  >
                    <ThemedText style={styles.viewAllText}>View All</ThemedText>
                  </TouchableOpacity>
                </View>
                {announcements.slice(0, 2).map((announcement) => (
                  <View key={announcement.id} style={styles.announcementCard}>
                    <View style={styles.announcementHeader}>
                      <View style={styles.titleContainer}>
                        <Ionicons name="megaphone" size={20} color="#3b82f6" style={styles.titleIcon} />
                        <ThemedText style={styles.announcementTitle}>
                          {announcement.title}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.announcementDate}>
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.announcementContent} numberOfLines={2}>
                      {announcement.content}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
          keyExtractor={() => 'dashboard'}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#93c5fd"
              colors={['#93c5fd']}
              progressBackgroundColor="#1e3a8a"
            />
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#93c5fd',
    marginTop: 12,
    fontSize: 16,
  },
  scrollContent: {
    padding: 3,
    paddingBottom: 20,
    marginHorizontal: 5,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
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
    marginBottom: 17,
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 15,
    borderRadius: 12,
    marginBottom: 17,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 19,
  },
  quickActionsContainer: {
    paddingRight: 10,
    paddingBottom: 19,
  },
  quickActions: {
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    width: 98,
    marginRight: 5,
  },
  actionIcon: {
    width: 60,
    height: 60,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    padding: 5,
  },
  viewAllText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleIcon: {
    marginRight: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  announcementDate: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
}); 