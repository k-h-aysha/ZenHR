import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Platform,
  Alert
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { withAuth, useAuth } from '@/lib/auth/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isAfter, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay 
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

// Type definitions for our Task
interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string; 
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string;
  created_at: string;
  updated_at: string;
}

// Available filter types
type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';

function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State variables
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });

  // Animations
  const headerHeight = useSharedValue(0);
  const headerOpacity = useSharedValue(0);

  // Animation styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      transform: [{ translateY: headerHeight.value }]
    };
  });

  // Fetch tasks from the database
  const fetchTasks = async () => {
    if (!user) {
      console.error('No user found. User object:', user);
      return;
    }
    
    try {
      setLoading(true);
      const userId = user.id;
      console.log('Fetching tasks for user ID:', userId);
      console.log('User object:', JSON.stringify(user, null, 2));
      
      // First check if the tasks table exists and show sample data
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('tasks')
          .select('*')
          .limit(5);
          
        if (tableError) {
          console.error('Error checking tasks table:', tableError);
          if (tableError.message.includes('relation "tasks" does not exist')) {
            Alert.alert('Database Setup Required', 'The tasks table does not exist in the database.');
            setLoading(false);
            return;
          }
          return;
        }
        
        console.log('Tasks table exists with sample data:', JSON.stringify(tableCheck, null, 2));
        
        if (tableCheck && tableCheck.length > 0) {
          console.log('First task assigned_to:', tableCheck[0].assigned_to);
          console.log('First task assigned_to type:', typeof tableCheck[0].assigned_to);
          console.log('User ID:', userId);
          console.log('User ID type:', typeof userId);
        }
      } catch (tableCheckError) {
        console.error('Exception checking tasks table:', tableCheckError);
      }
      
      // Try to convert user.id to string to match with assigned_to if needed
      const userIdString = String(userId);
      
      console.log('Trying query with string user ID:', userIdString);
      
      // Now fetch tasks for the current user
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${userId},assigned_to.eq.${userIdString}`)
        .order('due_date', { ascending: true });
        
      console.log('Tasks query executed with .or condition');
      
      if (error) {
        console.error('Error fetching tasks with .or condition:', error);
        
        // Fallback to simple eq query
        console.log('Falling back to simple eq query');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', userIdString)
          .order('due_date', { ascending: true });
          
        if (fallbackError) {
          console.error('Error with fallback query:', fallbackError);
          Alert.alert('Error', 'Failed to load tasks: ' + fallbackError.message);
          return;
        }
        
        console.log(`Fetched ${fallbackData?.length || 0} tasks with fallback query:`, 
          JSON.stringify(fallbackData, null, 2));
          
        if (fallbackData && fallbackData.length > 0) {
          setTasks(fallbackData as Task[]);
          calculateStats(fallbackData as Task[]);
          setLoading(false);
          return;
        }
      } else {
        console.log(`Fetched ${data?.length || 0} tasks with .or condition:`, 
          JSON.stringify(data, null, 2));
          
        if (data && data.length > 0) {
          setTasks(data as Task[]);
          calculateStats(data as Task[]);
          setLoading(false);
          return;
        }
      }
      
      // If still no tasks found, try more approaches
      console.log('No tasks found with direct queries, trying manual filtering...');
      
      // For testing, attempt a query without the user filter to see if any tasks exist
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('*');
        
      if (allTasksError) {
        console.error('Error fetching all tasks:', allTasksError);
      } else {
        console.log(`Found ${allTasks?.length || 0} total tasks in the database`);
        
        if (allTasks && allTasks.length > 0) {
          console.log('Sample tasks:', JSON.stringify(allTasks.slice(0, 2), null, 2));
          
          // Try manual filtering for matching tasks
          const matchingTasks = allTasks.filter(task => {
            const assignedTo = String(task.assigned_to);
            return assignedTo === userIdString || assignedTo === userId;
          });
          
          console.log(`Found ${matchingTasks.length} tasks after manual filtering`);
          
          if (matchingTasks.length > 0) {
            setTasks(matchingTasks as Task[]);
            calculateStats(matchingTasks as Task[]);
            setLoading(false);
            return;
          }
        }
      }
      
      // If we got here, no tasks were found
      setTasks([]);
      calculateStats([]);
    } catch (error) {
      console.error('Exception fetching tasks:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate stats based on tasks
  const calculateStats = (taskData: Task[]) => {
    const now = new Date();
    
    const pendingTasks = taskData.filter(task => task.status === 'pending');
    const inProgressTasks = taskData.filter(task => task.status === 'in_progress');
    const completedTasks = taskData.filter(task => task.status === 'completed');
    const overdueTasks = taskData.filter(task => 
      (task.status === 'pending' || task.status === 'in_progress') && 
      task.due_date && isAfter(now, parseISO(task.due_date))
    );
    
    setStats({
      total: taskData.length,
      pending: pendingTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length
    });
  };

  // Toggle task status
  const toggleTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    // Find the current task to get its current status and title
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Format status for display
    const formatStatus = (status: string) => {
      return status.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
    // Show confirmation alert
    Alert.alert(
      'Change Task Status',
      `Change "${task.title}" from ${formatStatus(task.status)} to ${formatStatus(newStatus)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              // Show loading indicator
              setLoading(true);
              
              // Update in database
              const { error } = await supabase
                .from('tasks')
                .update({ 
                  status: newStatus,
                  updated_at: new Date().toISOString() 
                })
                .eq('id', taskId);
                
              if (error) {
                console.error('Error updating task status:', error);
                Alert.alert('Error', 'Failed to update task status');
                return;
              }
              
              // Refresh the entire task list rather than updating optimistically
              await fetchTasks();
              
              // Show success message
              Alert.alert('Success', `Task status updated to ${formatStatus(newStatus)}`);
              
            } catch (error) {
              console.error('Exception updating task status:', error);
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Apply the filter
  const applyFilter = (filter: TaskFilter) => {
    // If clicking the active filter, reset to 'all'
    if (filter === activeFilter) {
      setActiveFilter('all');
    } else {
      setActiveFilter(filter);
    }
  };

  // Get filtered tasks
  const getFilteredTasks = () => {
    const now = new Date();
    
    switch (activeFilter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'in_progress':
        return tasks.filter(task => task.status === 'in_progress');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'overdue':
        return tasks.filter(task => 
          (task.status === 'pending' || task.status === 'in_progress') && 
          task.due_date && isAfter(now, parseISO(task.due_date))
        );
      case 'all':
      default:
        return tasks;
    }
  };

  // Refresh control
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  // Start animations after loading
  useEffect(() => {
    if (!loading) {
      headerHeight.value = withSpring(0, { damping: 20, stiffness: 90 });
      headerOpacity.value = withDelay(300, withSpring(1, { damping: 20, stiffness: 90 }));
    }
  }, [loading]);

  // Initial data fetch
  useEffect(() => {
    fetchTasks();
  }, []);

  // Get task status color
  const getStatusColor = (status: string, dueDate?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'in_progress') return '#3b82f6';
    
    if (dueDate) {
      const now = new Date();
      const due = parseISO(dueDate);
      
      if (isAfter(now, due)) {
        return '#ef4444'; // Overdue - red
      }
    }
    
    return '#f59e0b'; // Pending - amber
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return null;
      case 'in_progress':
        return <Ionicons name="time" size={16} color="#3b82f6" />;
      case 'completed':
        return <Ionicons name="checkmark" size={16} color="#22c55e" />;
      default:
        return null;
    }
  };

  // Get filtered tasks
  const filteredTasks = getFilteredTasks();

  // Group tasks by status for better organization
  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  // Render a task
  const renderTask = (task: Task) => {
    const statusColor = getStatusColor(task.status, task.due_date);
    const isOverdue = (task.status === 'pending' || task.status === 'in_progress') && 
      task.due_date && 
      isAfter(new Date(), parseISO(task.due_date));
      
    return (
      <Animated.View 
        key={task.id} 
        style={[
          styles.taskCard,
          { borderLeftColor: statusColor }
        ]}
      >
        <View style={styles.taskContent}>
          <View style={styles.taskDetails}>
            <ThemedText 
              style={[
                styles.taskTitle, 
                task.status === 'completed' && styles.completedTaskTitle
              ]}
            >
              {task.title}
            </ThemedText>
            
            {task.description ? (
              <ThemedText 
                style={[
                  styles.taskDescription,
                  task.status === 'completed' && styles.completedTaskDescription
                ]}
                numberOfLines={2}
              >
                {task.description}
              </ThemedText>
            ) : null}
            
            <View style={styles.taskFooter}>
              {task.due_date ? (
                <View style={styles.dueDate}>
                  <Ionicons 
                    name="calendar-outline" 
                    size={14} 
                    color={isOverdue ? '#ef4444' : '#94a3b8'} 
                  />
                  <ThemedText 
                    style={[
                      styles.dueDateText,
                      isOverdue && styles.overdueText
                    ]}
                  >
                    Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                  </ThemedText>
                </View>
              ) : null}
              
              <View style={styles.statusSelector}>
                <TouchableOpacity 
                  style={[styles.statusOption, task.status === 'pending' && styles.statusOptionActive]} 
                  onPress={() => toggleTaskStatus(task.id, 'pending')}
                >
                  <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
                  <ThemedText style={[styles.statusText, task.status === 'pending' && { color: '#f59e0b', fontWeight: 'bold' }]}>
                    Pending
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.statusOption, task.status === 'in_progress' && styles.statusOptionActive]} 
                  onPress={() => toggleTaskStatus(task.id, 'in_progress')}
                >
                  <View style={[styles.statusDot, { backgroundColor: '#3b82f6' }]} />
                  <ThemedText style={[styles.statusText, task.status === 'in_progress' && { color: '#3b82f6', fontWeight: 'bold' }]}>
                    In Progress
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.statusOption, task.status === 'completed' && styles.statusOptionActive]} 
                  onPress={() => toggleTaskStatus(task.id, 'completed')}
                >
                  <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                  <ThemedText style={[styles.statusText, task.status === 'completed' && { color: '#22c55e', fontWeight: 'bold' }]}>
                    Completed
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Get the title based on active filter
  const getFilterTitle = () => {
    switch (activeFilter) {
      case 'pending':
        return 'Pending Tasks';
      case 'in_progress':
        return 'In Progress Tasks';
      case 'completed':
        return 'Completed Tasks';
      case 'overdue':
        return 'Overdue Tasks';
      case 'all':
      default:
        return 'All Tasks';
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#2563eb']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <ThemedText style={styles.headerTitle}>{getFilterTitle()}</ThemedText>
      </Animated.View>
      
      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statItem, activeFilter === 'all' && styles.activeStatItem]} 
          onPress={() => applyFilter('all')}
        >
          <View style={[styles.statIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="list" size={20} color="#3b82f6" />
          </View>
          <ThemedText style={styles.statValue}>{stats.total}</ThemedText>
          <ThemedText style={styles.statLabel}>Total</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statItem, activeFilter === 'pending' && styles.activeStatItem]} 
          onPress={() => applyFilter('pending')}
        >
          <View style={[styles.statIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
          </View>
          <ThemedText style={styles.statValue}>{stats.pending}</ThemedText>
          <ThemedText style={styles.statLabel}>Pending</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statItem, activeFilter === 'in_progress' && styles.activeStatItem]} 
          onPress={() => applyFilter('in_progress')}
        >
          <View style={[styles.statIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="time-outline" size={20} color="#3b82f6" />
          </View>
          <ThemedText style={styles.statValue}>{stats.inProgress}</ThemedText>
          <ThemedText style={styles.statLabel}>In Progress</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.statItem, activeFilter === 'completed' && styles.activeStatItem]} 
          onPress={() => applyFilter('completed')}
        >
          <View style={[styles.statIconBg, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
          </View>
          <ThemedText style={styles.statValue}>{stats.completed}</ThemedText>
          <ThemedText style={styles.statLabel}>Completed</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <ThemedText style={styles.loadingText}>Loading your tasks...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3b82f6']}
              tintColor="#ffffff"
            />
          }
        >
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#94a3b8" />
              <ThemedText style={styles.emptyText}>No {activeFilter !== 'all' ? activeFilter : ''} tasks found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Pull down to refresh or try a different filter
              </ThemedText>
            </View>
          ) : (
            <>
              {activeFilter === 'all' && (
                <>
                  {/* Pending Tasks Section */}
                  {pendingTasks.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <ThemedText style={styles.sectionTitle}>Pending Tasks</ThemedText>
                      {pendingTasks.map(renderTask)}
                    </View>
                  )}
                  
                  {/* In Progress Tasks Section */}
                  {inProgressTasks.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <ThemedText style={styles.sectionTitle}>In Progress</ThemedText>
                      {inProgressTasks.map(renderTask)}
                    </View>
                  )}
                  
                  {/* Completed Tasks Section */}
                  {completedTasks.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <ThemedText style={styles.sectionTitle}>Completed Tasks</ThemedText>
                      {completedTasks.map(renderTask)}
                    </View>
                  )}
                </>
              )}

              {activeFilter !== 'all' && (
                <View style={styles.sectionContainer}>
                  {filteredTasks.map(renderTask)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#e2e8f0',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  taskDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
  },
  completedTaskDescription: {
    color: '#94a3b8',
  },
  taskFooter: {
    marginTop: 8,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  overdueText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  statusSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    padding: 4,
    marginTop: 8,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  statusOptionActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#64748b',
  },
  createTestButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  createTestButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  activeStatItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    transform: [{ scale: 1.05 }],
  },
}); 

export default withAuth(TasksScreen); 