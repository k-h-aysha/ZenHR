import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Dimensions, Alert, StatusBar, Platform, Modal, RefreshControl } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolateColor, useDerivedValue, withSpring } from 'react-native-reanimated';
import { useAuth, withAuth } from '../../lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { clockIn, clockOut, getTodayAttendance, finalizeDayAttendance, resetAttendanceForNewDay, resumeClockIn } from '@/lib/attendance';

import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  content: string;
  created_at: string;
};

// Helper function to add two time strings in format HH:MM:SS
const addTimes = (time1: string, time2: string): string => {
  const [h1, m1, s1] = time1.split(':').map(Number);
  const [h2, m2, s2] = time2.split(':').map(Number);
  
  let totalSeconds = s1 + s2;
  let totalMinutes = m1 + m2;
  let totalHours = h1 + h2;
  
  if (totalSeconds >= 60) {
    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds %= 60;
  }
  
  if (totalMinutes >= 60) {
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes %= 60;
  }
  
  return `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
};

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    startTime: Date;
  } | null>(null);
  const [totalWorkTime, setTotalWorkTime] = useState("00:00:00");
  const [currentSessionTime, setCurrentSessionTime] = useState("00:00:00");
  const [previouslyAccumulatedTime, setPreviouslyAccumulatedTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const slidePosition = useSharedValue(0);
  const slideProgress = useSharedValue(0);
  const maxSlideDistance = width * 0.6; // 60% of screen width
  const colorTransition = useSharedValue(isClockedIn ? 1 : 0);
  
  // Stats state
  const [stats, setStats] = useState({
    presentDays: 18,
    leavesTaken: 0,
    tasksLeft: 0,
    totalLeavesAllowed: 24
  });

  // Announcements from database
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const router = useRouter();
  const { user } = useAuth();

  // Add a ref to track the current state reliably
  const clockStateRef = useRef(false);

  // Update ref whenever isClockedIn changes
  useEffect(() => {
    clockStateRef.current = isClockedIn;
  }, [isClockedIn]);

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch tasks from the database to update stats
  const fetchTasksCount = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching task count for user ID:', user.id);
      
      // Convert user.id to string to match with assigned_to if needed
      const userIdString = String(user.id);
      
      // Fetch tasks for the current user
      const { data, error } = await supabase
        .from('tasks')
        .select('status')
        .or(`assigned_to.eq.${user.id},assigned_to.eq.${userIdString}`);
        
      if (error) {
        console.error('Error fetching tasks count:', error);
        return;
      }
      
      if (data) {
        // Count tasks that are still pending or in progress
        const pendingAndInProgressTasks = data.filter(
          task => task.status === 'pending' || task.status === 'in_progress'
        ).length;
        
        console.log(`Found ${pendingAndInProgressTasks} pending/in-progress tasks`);
        
        // Update stats with real-time count
        setStats(prevStats => ({
          ...prevStats,
          tasksLeft: pendingAndInProgressTasks
        }));
      }
    } catch (error) {
      console.error('Exception fetching tasks count:', error);
    }
  };

  // Fetch leaves count from the database
  const fetchLeavesCount = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching approved leaves count for user ID:', user.id);
      
      // Convert user.id to string to match with user_id if needed
      const userIdString = String(user.id);
      
      // First check if the leave_requests table exists
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('leave_requests')
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.error('Error checking leave_requests table:', tableError);
          if (tableError.message.includes('relation "leave_requests" does not exist')) {
            console.log('The leave_requests table does not exist in the database.');
            return;
          }
        }
        
        if (tableCheck) {
          console.log('leave_requests table exists, checking data structure...', 
            tableCheck.length > 0 ? JSON.stringify(tableCheck[0], null, 2) : 'no sample data');
        }
      } catch (e) {
        console.error('Exception checking leave_requests table:', e);
      }
      
      // Attempt several different queries to locate the user's leave requests
      
      // First try checking for a 'user_id' field
      const { data: userIdData, error: userIdError } = await supabase
        .from('leave_requests')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.eq.${userIdString}`)
        .eq('status', 'approved');
      
      if (userIdError) {
        console.error('Error fetching leaves with user_id:', userIdError);
      } else if (userIdData && userIdData.length > 0) {
        console.log(`Found ${userIdData.length} approved leaves with user_id field`);
        
        // Update stats with real-time count of approved leaves
        setStats(prevStats => ({
          ...prevStats,
          leavesTaken: userIdData.length
        }));
        return;
      }
      
      // Try checking for an 'employee_id' field
      const { data: employeeIdData, error: employeeIdError } = await supabase
        .from('leave_requests')
        .select('*')
        .or(`employee_id.eq.${user.id},employee_id.eq.${userIdString}`)
        .eq('status', 'approved');
      
      if (employeeIdError) {
        console.error('Error fetching leaves with employee_id:', employeeIdError);
      } else if (employeeIdData && employeeIdData.length > 0) {
        console.log(`Found ${employeeIdData.length} approved leaves with employee_id field`);
        
        // Update stats with real-time count of approved leaves
        setStats(prevStats => ({
          ...prevStats,
          leavesTaken: employeeIdData.length
        }));
        return;
      }
      
      // Last resort, try to list all leave requests to see structure
      const { data: allLeaves, error: allLeavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .limit(5);
        
      if (allLeavesError) {
        console.error('Error fetching all leaves:', allLeavesError);
      } else if (allLeaves && allLeaves.length > 0) {
        console.log('Sample leave requests found:', JSON.stringify(allLeaves.slice(0, 2), null, 2));
        console.log('Available fields:', Object.keys(allLeaves[0]));
        
        // Try to determine the correct user ID field from the data
        const userIdField = Object.keys(allLeaves[0]).find(key => 
          key.includes('user') || key.includes('employee') || key === 'id'
        );
        
        if (userIdField) {
          console.log(`Attempting to use detected field: ${userIdField}`);
          
          // Filter leaves manually
          const userApprovedLeaves = allLeaves.filter(leave => 
            String(leave[userIdField]) === userIdString && 
            leave.status === 'approved'
          );
          
          console.log(`Found ${userApprovedLeaves.length} approved leaves using ${userIdField} field`);
          
          if (userApprovedLeaves.length > 0) {
            setStats(prevStats => ({
              ...prevStats,
              leavesTaken: userApprovedLeaves.length
            }));
          }
        }
      } else {
        console.log('No leave requests found in the database');
      }
    } catch (error) {
      console.error('Exception fetching leaves count:', error);
    }
  };

  // Fetch announcements from database
  const fetchAnnouncements = async () => {
    try {
      console.log('Fetching announcements...');
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Error fetching announcements:', error);
        return;
      }
      
      console.log('Announcements data received:', data);
      if (data && data.length > 0) {
        setAnnouncements(data);
      } else {
        console.log('No announcements found');
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error in fetchAnnouncements:', error);
    }
  };

  // Add refresh function
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAnnouncements(),
        fetchTasksCount(),
        fetchLeavesCount()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    fetchTasksCount(); // Fetch tasks count when component mounts
    fetchLeavesCount(); // Fetch leaves count when component mounts
    checkCurrentAttendance(); // Check if user is already clocked in
  }, []);

  // Check current attendance status
  const checkCurrentAttendance = async () => {
    if (!user) return;
    
    try {
      const record = await getTodayAttendance(user.id);
      
      if (record) {
        // Get existing total hours as starting point
        if (record.total_hours_worked) {
          setTotalWorkTime(record.total_hours_worked);
          
          // If there's a last_clock_out, it means we need to save the previous time
          // for when the user clocks back in
          if (record.last_clock_out) {
            setPreviouslyAccumulatedTime(record.total_hours_worked);
          }
        }
        
        // Check if user is currently clocked in (has first_clock_in but no last_clock_out)
        if (record.first_clock_in && !record.last_clock_out) {
          // User is already clocked in
          const startTime = new Date();
          // Extract hours, minutes, seconds from first_clock_in
          const [hours, minutes, seconds] = record.first_clock_in.split(':').map(Number);
          startTime.setHours(hours, minutes, seconds, 0);
          
          setCurrentSession({
            id: record.id,
            startTime: startTime
          });
          setIsClockedIn(true);
          clockStateRef.current = true;
          // Transition to red color
          colorTransition.value = withTiming(1, { duration: 500 });
        }
      }
    } catch (error) {
      console.error('Error checking current attendance:', error);
    }
  };

  useEffect(() => {
    if (currentSession) {
      // Update total work time every second when clocked in
      const timer = setInterval(() => {
        const now = new Date();
        const sessionDuration = calculateDuration(currentSession.startTime, now);
        setCurrentSessionTime(sessionDuration);
        
        // If there's previously accumulated time, add it to the current session
        if (previouslyAccumulatedTime) {
          const totalDuration = addTimes(previouslyAccumulatedTime, sessionDuration);
          setTotalWorkTime(totalDuration);
        } else {
          setTotalWorkTime(sessionDuration);
        }
      }, 1000);

      // Set up a timer to finalize day's attendance just before midnight
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 0, 0);
      const timeUntilMidnight = midnight.getTime() - now.getTime();
      
      const midnightTimer = setTimeout(async () => {
        if (clockStateRef.current && user) {
          try {
            // Finalize the day's attendance and start a new day
            await finalizeDayAttendance(user.id);
            await resetAttendanceForNewDay();
            
            // Clock in for the next day automatically if still working
            const nextDaySession = await clockIn(user.id);
            if (!('message' in nextDaySession)) {
              setCurrentSession({
                id: nextDaySession.id,
                startTime: new Date()
              });
              // Reset work time for the new day
              setTotalWorkTime("00:00:00");
            }
          } catch (error) {
            console.error('Error handling day change:', error);
          }
        }
      }, timeUntilMidnight);

      return () => {
        clearInterval(timer);
        clearTimeout(midnightTimer);
      };
    }
  }, [currentSession, user]);

  const calculateDuration = (startTime: Date, endTime: Date) => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClockInOut = async () => {
    console.log(`Before state change: isClockedIn=${isClockedIn}, ref=${clockStateRef.current}`);
    
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    try {
      // Use the current value of clockStateRef instead of isClockedIn
      if (!clockStateRef.current) {
        // CLOCK IN - Either first clock in or resuming
        let response;
        const todayRecord = await getTodayAttendance(user.id);
        
        if (todayRecord && todayRecord.last_clock_out) {
          // Resume clock in - already have a record for today but were clocked out
          response = await resumeClockIn(user.id);
          console.log("Resuming clock in with existing record");
          
          // Keep the existing total hours as base
          if (todayRecord.total_hours_worked) {
            setPreviouslyAccumulatedTime(todayRecord.total_hours_worked);
            setTotalWorkTime(todayRecord.total_hours_worked);
          }
        } else {
          // First clock in for the day
          response = await clockIn(user.id);
          console.log("First clock in for today");
          setTotalWorkTime("00:00:00");
          setPreviouslyAccumulatedTime(null);
        }
        
        if ('message' in response) {
          throw new Error(response.message);
        }
        
        const startTime = new Date();
        // Get current time components for consistent calculation
        const now = new Date();
        startTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
        
        const newSession = {
          id: response.id,
          startTime: startTime,
        };
        
        setCurrentSession(newSession);
        setIsClockedIn(true);
        clockStateRef.current = true;
        // Transition to red color
        colorTransition.value = withTiming(1, { duration: 500 });
        console.log("Clocked IN successfully");
        Alert.alert('Success', 'You have clocked in successfully');
      } else {
        // CLOCK OUT
        if (currentSession) {
          const response = await clockOut(user.id);
          
          if ('message' in response) {
            throw new Error(response.message);
          }
          
          // Save the latest total hours worked from the database
          if (response.total_hours_worked) {
            setTotalWorkTime(response.total_hours_worked);
          }
          
          setCurrentSession(null);
          setIsClockedIn(false);
          clockStateRef.current = false;
          // Explicitly transition back to blue color
          colorTransition.value = withTiming(0, { duration: 500 });
          console.log("Clocked OUT successfully");
          Alert.alert('Success', 'You have clocked out successfully');
        }
      }
    } catch (error) {
      console.error('Clock in/out operation failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process attendance');
    }
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

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Update the settings icon press handler in the header
  const headerIcons = (
    <View style={styles.headerIcons}>
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="notifications-outline" size={24} color="#ffffff" />
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => setIsSettingsVisible(true)}
      >
        <Ionicons name="settings-outline" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  // Add settings modal
  const settingsModal = (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isSettingsVisible}
      onRequestClose={() => setIsSettingsVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Settings</ThemedText>
            <TouchableOpacity 
              onPress={() => setIsSettingsVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <ThemedText style={styles.settingsButtonText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top + 25 }]}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={['#3b82f6']}
            />
          }
        >
          {/* Top Header Section */}
          <View style={styles.topHeader}>
            <ThemedText style={styles.logoText}>
              Zen<ThemedText style={styles.logoHighlight}>HR</ThemedText>
            </ThemedText>
            {headerIcons}
          </View>

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
              style={styles.clockButton}
              onPress={handleClockInOut}
            >
              <LinearGradient
                colors={isClockedIn 
                  ? ['#ef4444', '#b91c1c'] // Light red to dark red when clocked in
                  : ['#93c5fd', '#1e40af']} // Light blue to dark blue when clocked out
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              
              {/* Add an animated overlay for smooth color transitions */}
          <Animated.View
            style={[
                  StyleSheet.absoluteFill, 
                  animatedBackgroundStyle
                ]} 
              />
              
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
            </TouchableOpacity>
            
            <View style={styles.workTimeContainer}>
              {previouslyAccumulatedTime ? (
                <>
                  <View style={styles.workTimeRow}>
                    <ThemedText style={styles.workTimeLabel}>Previous Hours</ThemedText>
                    <ThemedText style={styles.previousTimeText}>{previouslyAccumulatedTime}</ThemedText>
                  </View>
                  <View style={styles.workTimeRow}>
                    <ThemedText style={styles.workTimeLabel}>Current Session</ThemedText>
                    <ThemedText style={styles.sessionTimeText}>{currentSessionTime}</ThemedText>
                  </View>
                  <View style={styles.workTimeDivider} />
                  <View style={styles.workTimeTotalRow}>
                    <ThemedText style={styles.workTimeLabel}>Total Today</ThemedText>
                    <ThemedText style={styles.workTimeText}>{totalWorkTime}</ThemedText>
                  </View>
                </>
              ) : (
                <View style={styles.workTimeSingleRow}>
                  <ThemedText style={styles.workTimeLabel}>Work Time Today</ThemedText>
                  <ThemedText style={styles.workTimeText}>{totalWorkTime}</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={[styles.statBox, { backgroundColor: '#f8fafc' }]}>
              <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>{stats.presentDays}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Team Availability</ThemedText>
            </View>
            <TouchableOpacity 
              style={[styles.statBox, { backgroundColor: '#dbeafe' }]}
              onPress={() => router.push('/user/leave-history')}
            >
              <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>
                {stats.leavesTaken}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Leaves Taken</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statBox, { backgroundColor: '#fef3c7' }]}
              onPress={() => router.push('/(tabs)/tasks')}
            >
              <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>{stats.tasksLeft}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Tasks Left</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Announcements Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Announcements</ThemedText>
            </View>
            {announcements.length === 0 ? (
              <View style={styles.noAnnouncementsContainer}>
                <ThemedText style={styles.noAnnouncementsText}>No announcements available</ThemedText>
              </View>
            ) : (
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
                        {announcement.content}
                      </ThemedText>
                      <View style={styles.announcementFooter}>
                        <ThemedText style={styles.announcementDate}>
                          {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                        </ThemedText>
                        <Ionicons name="chevron-forward" size={16} color="#1e3a8a" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
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
              
              <TouchableOpacity 
                style={[styles.quickActionButton, { backgroundColor: '#dbeafe' }]}
                onPress={() => router.push('/user/services')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
                  <Ionicons name="grid-outline" size={24} color="#1e3a8a" />
                </View>
                <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Services</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickActionButton, { backgroundColor: '#fef3c7' }]}
                onPress={() => router.push('/user/payroll')}
              >
                <View style={[styles.quickActionIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                  <Ionicons name="cash-outline" size={24} color="#1e3a8a" />
                </View>
                <ThemedText style={[styles.quickActionText, { color: '#1e3a8a' }]}>Payroll</ThemedText>
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
        
        {settingsModal}
      </LinearGradient>
    </View>
  );
}

export default withAuth(HomeScreen);

const styles = StyleSheet.create({
  container: {
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
  logoText: {
    fontSize: 24,
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
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    width: 8,
    height: 8,
    borderRadius: 4,
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
  workTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 3,
  },
  workTimeDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 5,
  },
  workTimeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 3,
  },
  previousTimeText: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  sessionTimeText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 1,
  },
  workTimeSingleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 3,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    padding: 5,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    marginBottom: 10,
  },
  settingsButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  servicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#38bdf8',
  },
  servicesButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  noAnnouncementsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  noAnnouncementsText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});