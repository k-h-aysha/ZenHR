import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Dimensions, Alert, StatusBar, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolateColor, useDerivedValue, withSpring } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, withAuth } from '@/lib/auth/AuthContext';
import { clockIn, clockOut, resumeClockIn, getTodayAttendance, finalizeDayAttendance, resetAttendanceForNewDay } from '@/lib/attendance';

const { width, height } = Dimensions.get('window');

type TimeRecord = {
  id: string;
  clockInTime: Date;
  clockOutTime: Date | null;
  duration: string | null;
};

type Announcement = {
  id: string;
  title: string;
  description: string;
  date: string;
};

const HomeScreen: React.FC = () => {  // Ensure it's declared as a functional component
  // Move all hooks to the top level
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    startTime: Date;
  } | null>(null);
  const [totalWorkTime, setTotalWorkTime] = useState("00:00:00");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const clockStateRef = useRef(false);  // Keep this declaration
  const colorTransition = useSharedValue(isClockedIn ? 1 : 0);
  const [lastTotalWorkTime, setLastTotalWorkTime] = useState("00:00:00");
  const [isTrackingTime, setIsTrackingTime] = useState(false);
  const lastDateRef = useRef(format(new Date(), 'yyyy-MM-dd'));
  
  // Demo data for leaves and stats
  const [stats, setStats] = useState({
    presentDays: 18,
    leavesTaken: 3,
    tasksLeft: 5,
    totalLeavesAllowed: 24
  });

  // Demo announcements
  const [announcements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Company Picnic',
      description: 'Annual company picnic next Saturday at Central Park',
      date: '2024-03-20'
    },
    {
      id: '2',
      title: 'New Policy Update',
      description: 'Updated work from home policy effective from next month',
      date: '2024-03-18'
    },
    {
      id: '3',
      title: 'Training Session',
      description: 'Mandatory security training session this Friday',
      date: '2024-03-22'
    }
  ]);

  const router = useRouter();

  // Define calculateDuration with useCallback to memoize it
  const calculateDuration = useCallback((startTime: Date, endTime: Date) => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update clock state ref
  useEffect(() => {
    clockStateRef.current = isClockedIn;
  }, [isClockedIn]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // FIXED: Keep only ONE timer for work time tracking
  // This useEffect will handle all time tracking functionality
  useEffect(() => {
    // Only start a timer if user is clocked in and there's an active session
    if (isTrackingTime && currentSession) {
      console.log('Starting work time tracking timer');
      
      // Memoize the calculation function to avoid recreating it on each render
      const calculateTotalTime = () => {
        // Calculate current session duration
        const sessionDuration = calculateDuration(currentSession.startTime, new Date());
        
        // Parse the last total and current durations to seconds
        const lastTimeArray = lastTotalWorkTime.split(':').map(Number);
        const lastTotalSeconds = lastTimeArray[0] * 3600 + lastTimeArray[1] * 60 + lastTimeArray[2];
        
        const currentArray = sessionDuration.split(':').map(Number);
        const currentSeconds = currentArray[0] * 3600 + currentArray[1] * 60 + currentArray[2];
        
        // Add them together for total seconds worked
        const totalSeconds = lastTotalSeconds + currentSeconds;
        
        // Convert back to HH:MM:SS format
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };
      
      const timer = setInterval(() => {
        setTotalWorkTime(calculateTotalTime());
      }, 1000);
      
      return () => {
        console.log('Cleaning up work time tracking timer');
        clearInterval(timer);
      };
    }
  }, [isTrackingTime, currentSession, lastTotalWorkTime, calculateDuration]);

  // Load today's attendance status when component mounts
  useEffect(() => {
    loadTodayAttendance();
    fetchStats();
  }, []);

  const loadTodayAttendance = async () => {
    if (!user) return;
    
    try {
      const record = await getTodayAttendance(user.id);
      
      if (record) {
        // If there's a record but no last_clock_out, user is still clocked in
        if (!record.last_clock_out) {
          setIsClockedIn(true);
          clockStateRef.current = true;
          colorTransition.value = withTiming(1, { duration: 500 });
          
          // Set up the current session with the stored total work time
          const currentDate = format(new Date(), 'yyyy-MM-dd');
          const startTime = new Date(`${currentDate}T${record.first_clock_in}`);
          setCurrentSession({
            id: record.id,
            startTime: startTime
          });
          setLastTotalWorkTime(record.total_hours_worked || "00:00:00");
          setIsTrackingTime(true);
        } else {
          // User is clocked out, show last total work time
          setLastTotalWorkTime(record.total_hours_worked || "00:00:00");
          setTotalWorkTime(record.total_hours_worked || "00:00:00");
        }
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  // Check for date change and store final work time
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      if (currentDate !== lastDateRef.current && isClockedIn) {
        // Store final work time for the previous day
        if (user) {
          finalizeDayAttendance(user.id);
        }
        lastDateRef.current = currentDate;
        // Reset states for new day
        setTotalWorkTime("00:00:00");
        setLastTotalWorkTime("00:00:00");
        setIsClockedIn(false);
        setIsTrackingTime(false);
      }
    };

    const interval = setInterval(checkDateChange, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, user]);

  // Add effect to check for midnight and reset attendance records
  useEffect(() => {
    // Function to check if it's midnight and reset attendance records
    const checkMidnight = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Check if time is between 00:00 and 00:01
      if (hours === 0 && minutes === 0) {
        resetAttendanceForNewDay();
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkMidnight, 60000);
    
    // Initial check
    checkMidnight();
    
    return () => clearInterval(intervalId);
  }, []);

  // Add this after the other useEffect hooks
  useEffect(() => {
    fetchUnreadNotifications();
  }, [user]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .contains('user_id', [user.id])
        .eq('read', false);
      
      if (error) throw error;
      
      if (data) {
        setUnreadNotifications(data.length);
      }
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  // Add function to verify user ID
  const verifyUserID = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'User not authenticated or missing ID');
      return false;
    }
    
    console.log('User object for verification:', JSON.stringify(user));
    console.log('User ID for clock operations:', user.id);
    console.log('User ID type:', typeof user.id);
    
    // Test if ID appears to be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(user.id);
    
    console.log('Is user ID a valid UUID format?', isValidUUID);
    
    if (!isValidUUID) {
      Alert.alert('Error', 'User ID is not in valid UUID format required for attendance');
      return false;
    }
    
    return true;
  };

  const handleClockInOut = async () => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Verify user ID before proceeding
    if (!await verifyUserID()) {
      return;
    }

    setIsLoading(true);
    try {
      if (!clockStateRef.current) {
        // CLOCK IN
        console.log('Attempting to clock in user:', user.id);
        console.log('User object:', JSON.stringify(user));
        let result;
        
        try {
          // Always use first clock in for a new session
          // This will create a new record if it's the first clock in of the day
          result = await clockIn(user.id);
          
          if ('message' in result) {
            console.error('Clock in error returned message:', result.message);
            throw new Error(result.message);
          }
        } catch (clockInError) {
          console.error('Clock in operation failed:', clockInError);
          Alert.alert(
            'Clock In Error', 
            `Failed to clock in: ${clockInError instanceof Error ? clockInError.message : 'Unknown error'}. Please try again.`
          );
          setIsLoading(false);
          return;
        }
        
        console.log('Clock in successful:', result);
        const currentDate = format(new Date(), 'yyyy-MM-dd');
        const newSession = {
          id: result.id,
          startTime: new Date(),
        };
        
        setCurrentSession(newSession);
        setIsClockedIn(true);
        setIsTrackingTime(true);
        clockStateRef.current = true;
        colorTransition.value = withTiming(1, { duration: 500 });
        Alert.alert('Success', 'You have clocked in successfully');
      } else {
        // CLOCK OUT
        console.log('Attempting to clock out user:', user.id);
        if (currentSession) {
          try {
            const result = await clockOut(user.id);
            
            if ('message' in result) {
              console.error('Clock out error returned message:', result.message);
              throw new Error(result.message);
            }
            
            console.log('Clock out successful:', result);
            setCurrentSession(null);
            setIsClockedIn(false);
            setIsTrackingTime(false);
            if (result.total_hours_worked) {
              setLastTotalWorkTime(result.total_hours_worked);
              setTotalWorkTime(result.total_hours_worked);
            }
            clockStateRef.current = false;
            colorTransition.value = withTiming(0, { duration: 500 });
            Alert.alert('Success', 'You have clocked out successfully');
          } catch (clockOutError) {
            console.error('Clock out operation failed:', clockOutError);
            Alert.alert(
              'Clock Out Error', 
              `Failed to clock out: ${clockOutError instanceof Error ? clockOutError.message : 'Unknown error'}. Please try again.`
            );
            setIsLoading(false);
            return;
          }
        } else {
          Alert.alert('Error', 'No active session found to clock out from.');
        }
      }
    } catch (error) {
      console.error('Error handling clock in/out:', error);
      Alert.alert(
        'Error',
        `Failed to process clock in/out: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle logout with confirmation
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorTransition.value,
      [0, 1],
      ['rgba(59, 130, 246, 0.2)', 'rgba(239, 68, 68, 0.2)'] // Lighter overlay for better visibility
    );
    
    return {
      backgroundColor
    };
  });

  // Add function to handle refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUnreadNotifications(),
        loadTodayAttendance()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Add function to fetch stats
  const fetchStats = async () => {
    if (!user) return;
    try {
      // Here you would normally fetch actual stats data from your backend
      // For demo purposes, we'll simulate a fetch with updated data
      setStats({
        presentDays: 18,
        leavesTaken: 3,
        tasksLeft: 5,
        totalLeavesAllowed: 24
      });

      // Example of how you might fetch real data:
      // const { data, error } = await supabase
      //   .from('employee_stats')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .single();
      // 
      // if (error) throw error;
      // if (data) {
      //   setStats({
      //     presentDays: data.present_days,
      //     leavesTaken: data.leaves_taken,
      //     tasksLeft: data.tasks_left,
      //     totalLeavesAllowed: data.total_leaves_allowed
      //   });
      // }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#ffffff"
          colors={['#3b82f6']}
        />
      }
    >
      <View style={styles.mainContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LinearGradient
          colors={['#0f172a', '#1e3a8a', '#2563eb']}
          style={[styles.container, { paddingTop: insets.top + 25 }]}
        >
          {/* Add Logo */}
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoText}>
              <ThemedText style={styles.logoHighlight}>Zen</ThemedText>HR
            </ThemedText>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => router.push('/user/notifications')}
              >
                <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <ThemedText style={styles.notificationBadgeText}>
                      {unreadNotifications}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#ffffff" />
                <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
          >
            {/* Date and Time Section */}
            <View style={styles.dateTimeSection}>
              <ThemedText style={styles.timeText}>
                {format(currentTime, 'hh:mm:ss a')}
              </ThemedText>
              <ThemedText style={styles.dateText}>
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </ThemedText>
            </View>

            {/* Clock In/Out Section */}
            <View style={styles.clockSection}>
              <TouchableOpacity 
                style={[styles.clockButton, isLoading && styles.clockButtonDisabled]}
                onPress={handleClockInOut}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isClockedIn 
                    ? ['#ef4444', '#b91c1c']
                    : ['#93c5fd', '#1e40af']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                
                <Animated.View 
                  style={[
                    StyleSheet.absoluteFill, 
                    animatedBackgroundStyle
                  ]} 
                />
                
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <ThemedText style={styles.clockButtonText}>
                      {isClockedIn 
                        ? 'Clock Out' 
                        : 'Clock In'}
                    </ThemedText>
                    <Ionicons 
                      name={isClockedIn ? 'log-out-outline' : 'log-in-outline'} 
                      size={24} 
                      color="#ffffff" 
                      style={styles.clockButtonIcon}
                    />
                  </>
                )}
              </TouchableOpacity>
              
              <View style={styles.workTimeContainer}>
                <ThemedText style={styles.workTimeLabel}>Total Work Time Today</ThemedText>
                <ThemedText style={styles.workTimeText}>{totalWorkTime}</ThemedText>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsSection}>
              <View style={[styles.statBox, { backgroundColor: '#f8fafc' }]}>
                <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>{stats.presentDays}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Team Availability</ThemedText>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
                <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>
                  {stats.leavesTaken}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Leaves Taken</ThemedText>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#fef3c7' }]}>
                <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>{stats.tasksLeft}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Tasks Left</ThemedText>
              </View>
            </View>

            {/* Announcements Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Announcements</ThemedText>
                <TouchableOpacity style={[styles.seeAllButton, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                  <ThemedText style={styles.seeAllText}>See All</ThemedText>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.announcementsScroll}
                contentContainerStyle={styles.announcementsScrollContent}
              >
                {announcements.map((announcement, index) => (
                  <TouchableOpacity 
                    key={announcement.id} 
                    style={[
                      styles.announcementCard, 
                      { backgroundColor: index % 3 === 0 ? '#f1f5f9' : index % 3 === 1 ? '#e0f2fe' : '#fef3c7' }
                    ]}
                  >
                    <View style={styles.announcementContent}>
                      <ThemedText style={styles.announcementTitle}>
                        {announcement.title}
                      </ThemedText>
                      <ThemedText style={styles.announcementDesc}>
                        {announcement.description}
                      </ThemedText>
                      <View style={styles.announcementFooter}>
                        <ThemedText style={styles.announcementDate}>
                          {format(new Date(announcement.date), 'MMM d, yyyy')}
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={16} color="#1e3a8a" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Quick Actions Section */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.quickActionsScroll}
                contentContainerStyle={styles.quickActionsScrollContent}
              >
                <TouchableOpacity 
                  style={[styles.quickActionButton, { backgroundColor: '#f1f5f9' }]}
                  onPress={() => router.push('/user/apply-leave')}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                    <Ionicons name="calendar-outline" size={24} color="#1e3a8a" />
                  </View>
                  <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Apply Leave</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#dbeafe' }]}>
                  <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
                    <Ionicons name="document-text-outline" size={24} color="#1e3a8a" />
                  </View>
                  <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Submit Report</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#fef3c7' }]}>
                  <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                    <Ionicons name="people-outline" size={24} color="#1e3a8a" />
                  </View>
                  <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Team Chat</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#f0fdf4' }]}>
                  <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
                    <Ionicons name="help-circle-outline" size={24} color="#1e3a8a" />
                  </View>
                  <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Help Desk</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 85,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  logoHighlight: {
    color: '#93c5fd',
    fontWeight: '800',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateTimeSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 58, 138, 0.4)',
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
  },
  timeText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 40,
    marginTop: 0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  dateText: {
    fontSize: 14,
    color: '#93c5fd',
    fontWeight: '500',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  clockSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  clockButton: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#93c5fd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    position: 'relative',
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginRight: 10,
  },
  clockButtonIcon: {
    marginLeft: 8,
  },
  workTimeContainer: {
    marginTop: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  workTimeLabel: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  workTimeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 1,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  statBox: {
    borderRadius: 16,
    padding: 15,
    width: width * 0.28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  sectionContainer: {
    marginTop: 25,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  seeAllText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  announcementsScroll: {
    marginHorizontal: -10,
  },
  announcementsScrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  announcementCard: {
    borderRadius: 16,
    marginRight: 15,
    width: width * 0.75,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  announcementContent: {
    padding: 16,
  },
  announcementTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  announcementDesc: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementDate: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  quickActionsScroll: {
    marginTop: 15,
    marginHorizontal: -10,
  },
  quickActionsScrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  quickActionButton: {
    borderRadius: 16,
    padding: 16,
    width: width * 0.3,
    marginRight: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    textAlign: 'center',
  },
  clockButtonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
});

// Use withAuth to protect this screen
export default withAuth(HomeScreen);
