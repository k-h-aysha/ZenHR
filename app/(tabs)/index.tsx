import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Dimensions, Alert, StatusBar, Platform, Modal } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolateColor, useDerivedValue, withSpring } from 'react-native-reanimated';
import { useAuth } from '../../lib/auth/AuthContext';

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
  description: string;
  date: string;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    startTime: Date;
  } | null>(null);
  const [totalWorkTime, setTotalWorkTime] = useState("00:00:00");
  const [isDragging, setIsDragging] = useState(false);
  const slidePosition = useSharedValue(0);
  const slideProgress = useSharedValue(0);
  const maxSlideDistance = width * 0.6; // 60% of screen width
  const colorTransition = useSharedValue(isClockedIn ? 1 : 0);
  
  // Demo data for leaves and stats
  const [stats] = useState({
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

  useEffect(() => {
    if (currentSession) {
      // Update total work time every second when clocked in
      const timer = setInterval(() => {
        const duration = calculateDuration(currentSession.startTime, new Date());
        setTotalWorkTime(duration);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentSession]);

  const calculateDuration = (startTime: Date, endTime: Date) => {
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClockInOut = () => {
    console.log(`Before state change: isClockedIn=${isClockedIn}, ref=${clockStateRef.current}`);
    
    // Use the current value of clockStateRef instead of isClockedIn
    if (!clockStateRef.current) {
      // CLOCK IN
      const newSession = {
        id: Date.now().toString(),
        startTime: new Date(),
      };
      setCurrentSession(newSession);
      setIsClockedIn(true);
      clockStateRef.current = true;
      // Transition to red color
      colorTransition.value = withTiming(1, { duration: 500 });
      console.log("Clocking IN - changed state to true");
      Alert.alert('Success', 'You have clocked in successfully');
    } else {
      // CLOCK OUT
      if (currentSession) {
        setCurrentSession(null);
        setIsClockedIn(false);
        clockStateRef.current = false;
        setTotalWorkTime("00:00:00");
        // Explicitly transition back to blue color
        colorTransition.value = withTiming(0, { duration: 500 });
        console.log("Clocking OUT - changed state to false");
        Alert.alert('Success', 'You have clocked out successfully');
      }
    }
    
    // Give the state time to update before logging
    setTimeout(() => {
      console.log(`After state change: isClockedIn=${isClockedIn}, ref=${clockStateRef.current}`);
    }, 100);
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
              <ThemedText style={styles.workTimeLabel}>Total Work Time Today</ThemedText>
              <ThemedText style={styles.workTimeText}>{totalWorkTime}</ThemedText>
            </View>

            {/* Debug text - shows both states for comparison */}
            <View style={{marginTop: 5, alignItems: 'center'}}>
              <ThemedText style={{fontSize: 12, color: '#ffffff', opacity: 0.7}}>
                Current state: {isClockedIn ? 'Clocked In' : 'Clocked Out'} (Ref: {clockStateRef.current ? 'In' : 'Out'})
              </ThemedText>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={[styles.statBox, { backgroundColor: '#f8fafc' }]}>
              <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>{stats.presentDays}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: '#1e3a8a' }]}>Present Days</ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
              <ThemedText style={[styles.statNumber, { color: '#0f172a' }]}>
                {stats.leavesTaken}/{stats.totalLeavesAllowed}
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
        
        {settingsModal}
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
});