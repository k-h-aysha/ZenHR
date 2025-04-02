import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Dimensions, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format, parseISO, subDays, startOfMonth, startOfYear, endOfMonth } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getCurrentUser } from '../../lib/supabase';

// Define types for attendance data
interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  first_clock_in: string | null;
  last_clock_out: string | null;
  num_clock_ins: number;
  total_hours_worked: string | null;
}

interface AttendanceStats {
  totalDays: number;
  totalHoursWorked: string;
  presentDays: number;
  absentDays: number;
}

// Filter options for date ranges
type DateFilter = '7days' | '30days' | 'month' | 'year' | 'all';

const { width } = Dimensions.get('window');

export default function AttendanceScreen() {
  const colorScheme = useColorScheme();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateFilter>('30days');
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    totalHoursWorked: '00:00:00',
    presentDays: 0,
    absentDays: 0,
  });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  const [sampleDataMessage, setSampleDataMessage] = useState('');

  // Function to fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      setIsUsingSampleData(false);
      setSampleDataMessage('');

      // Get current user from our custom auth
      const user = await getCurrentUser();
      console.log('Current user:', user);

      if (!user) {
        console.log('No authenticated user found');
        setIsUsingSampleData(true);
        setSampleDataMessage('Please log in to view attendance records.');
        return;
      }

      // Fetch attendance records for the authenticated user
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user.id)
        .order('date', { ascending: false });

      console.log('Attendance query result:', { data, error });

      if (error) {
        console.error('Error fetching attendance:', error);
        setIsUsingSampleData(true);
        setSampleDataMessage('Error fetching attendance data. Please try again later.');
        return;
      }

      if (!data || data.length === 0) {
        console.log('No attendance records found for user:', user.id);
        setAttendanceRecords([]);
      } else {
        console.log('Found attendance records:', data.length);
        setAttendanceRecords(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsUsingSampleData(true);
      setSampleDataMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filter to attendance records
  const applyFilter = (filter: DateFilter, records = attendanceRecords) => {
    setActiveFilter(filter);
    
    const today = new Date();
    let filteredData: AttendanceRecord[] = [];
    let startDate: Date;
    
    switch (filter) {
      case '7days':
        startDate = subDays(today, 7);
        filteredData = records.filter(record => 
          new Date(record.date) >= startDate && new Date(record.date) <= today
        );
        break;
      case '30days':
        startDate = subDays(today, 30);
        filteredData = records.filter(record => 
          new Date(record.date) >= startDate && new Date(record.date) <= today
        );
        break;
      case 'month':
        startDate = startOfMonth(today);
        filteredData = records.filter(record => 
          new Date(record.date) >= startDate && new Date(record.date) <= today
        );
        break;
      case 'year':
        startDate = startOfYear(today);
        filteredData = records.filter(record => 
          new Date(record.date) >= startDate && new Date(record.date) <= today
        );
        break;
      case 'all':
      default:
        filteredData = [...records];
        break;
    }
    
    setFilteredRecords(filteredData);
    calculateStats(filteredData, filter);
  };

  // Calculate attendance statistics
  const calculateStats = (records: AttendanceRecord[], filter: DateFilter) => {
    // Count days present (days with records)
    const presentDays = records.length;
    
    // Calculate total working days in the period
    const today = new Date();
    let totalDays = 0;
    
    switch (filter) {
      case '7days':
        totalDays = 7;
        break;
      case '30days':
        totalDays = 30;
        break;
      case 'month':
        totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        break;
      case 'year':
        totalDays = 365;
        break;
      case 'all':
        // For 'all', just use the days between the first and last record
        if (records.length > 0) {
          const dates = records.map(r => new Date(r.date).getTime());
          const earliestDate = new Date(Math.min(...dates));
          const daysDiff = Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDays = daysDiff + 1;
        }
        break;
    }
    
    // Calculate total hours worked
    let totalSeconds = 0;
    records.forEach(record => {
      if (record.total_hours_worked) {
        const [hours, minutes, seconds] = record.total_hours_worked.split(':').map(Number);
        totalSeconds += hours * 3600 + minutes * 60 + seconds;
      }
    });
    
    const hoursWorked = Math.floor(totalSeconds / 3600);
    const minutesWorked = Math.floor((totalSeconds % 3600) / 60);
    const secondsWorked = totalSeconds % 60;
    
    const totalHoursFormatted = 
      `${hoursWorked.toString().padStart(2, '0')}:${minutesWorked.toString().padStart(2, '0')}:${secondsWorked.toString().padStart(2, '0')}`;
      
    setStats({
      totalDays,
      totalHoursWorked: totalHoursFormatted,
      presentDays,
      absentDays: Math.max(0, totalDays - presentDays) // Ensure absentDays is not negative
    });
  };

  // Generate HTML for PDF export
  const generateHTML = () => {
    const filterText = {
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      'month': 'Current Month',
      'year': 'Current Year',
      'all': 'All Time'
    }[activeFilter];

    let tableRows = '';
    filteredRecords.forEach(record => {
      tableRows += `
        <tr>
          <td>${format(parseISO(record.date), 'dd MMM yyyy')}</td>
          <td>${record.first_clock_in || 'N/A'}</td>
          <td>${record.last_clock_out || 'N/A'}</td>
          <td>${record.total_hours_worked || '00:00:00'}</td>
        </tr>
      `;
    });

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e3a8a; text-align: center; }
            h2 { color: #3b82f6; margin-top: 30px; }
            .stats-container { display: flex; flex-wrap: wrap; justify-content: space-between; margin: 20px 0; }
            .stat-box { background-color: #f1f5f9; padding: 15px; border-radius: 8px; width: 45%; margin-bottom: 15px; }
            .stat-title { font-size: 14px; color: #64748b; margin-bottom: 8px; }
            .stat-value { font-size: 24px; color: #0f172a; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #e2e8f0; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            .period { color: #64748b; font-size: 16px; text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p class="period">Period: ${filterText}</p>

          <h2>Summary</h2>
          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-title">Total Working Days</div>
              <div class="stat-value">${stats.totalDays}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Present Days</div>
              <div class="stat-value">${stats.presentDays}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Absent Days</div>
              <div class="stat-value">${stats.absentDays}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Total Hours Worked</div>
              <div class="stat-value">${stats.totalHoursWorked}</div>
            </div>
          </div>

          <h2>Detailed Attendance</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>First Clock In</th>
                <th>Last Clock Out</th>
                <th>Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  // Generate and export PDF
  const exportToPDF = async () => {
    try {
      setGeneratingPdf(true);
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Generate the HTML content
      const html = generateHTML();
      
      // Create the PDF file
      const { uri } = await Print.printToFileAsync({ html });
      
      // Generate filename with employee name
      const fileName = `attendance record - ${user.full_name}.pdf`;
      
      // Share the PDF
      await Sharing.shareAsync(uri, {
        dialogTitle: 'Save Attendance Record',
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate attendance record');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Refresh control handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendanceRecords();
  }, []);

  // Fetch data on component mount and when screen is focused
  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceRecords();
    }, [])
  );

  // Filter buttons component
  const FilterButton = ({ title, filter }: { title: string, filter: DateFilter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => applyFilter(filter)}
    >
      <ThemedText
        style={[
          styles.filterButtonText,
          activeFilter === filter && styles.filterButtonTextActive
        ]}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  // Render a single attendance day item with enhanced UI
  const renderAttendanceItem = (record: AttendanceRecord) => {
    const date = parseISO(record.date);
    const dayOfWeek = format(date, 'EEE');
    
    return (
      <View key={record.id} style={styles.attendanceItem}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(30, 58, 138, 0.1)']}
          style={styles.attendanceItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.attendanceContent}>
            <View style={styles.dateSection}>
              <ThemedText style={styles.dayText}>
                {format(date, 'dd')}
              </ThemedText>
              <ThemedText style={styles.monthYearText}>
                {format(date, 'MMM')}
              </ThemedText>
              <ThemedText style={styles.dayOfWeekText}>{dayOfWeek}</ThemedText>
            </View>
            
            <View style={styles.detailsSection}>
              <View style={styles.timeRow}>
                <View style={styles.timeDetail}>
                  <View style={[styles.timeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                    <Ionicons name="enter-outline" size={14} color="#3b82f6" />
                  </View>
                  <ThemedText style={styles.timeText}>
                    {record.first_clock_in || 'N/A'}
                  </ThemedText>
                </View>
                
                <View style={styles.timeDetail}>
                  <View style={[styles.timeIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Ionicons name="exit-outline" size={14} color="#ef4444" />
                  </View>
                  <ThemedText style={styles.timeText}>
                    {record.last_clock_out || 'N/A'}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.hoursContainer}>
                <View style={styles.hoursWrapper}>
                  <View style={[styles.hoursIcon, { backgroundColor: 'rgba(132, 204, 22, 0.2)' }]}>
                    <MaterialCommunityIcons name="timer-outline" size={16} color="#84cc16" />
                  </View>
                  <ThemedText style={styles.hoursText}>
                    {record.total_hours_worked || '00:00:00'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Function to handle retry after error
  const handleRetry = () => {
    setLoading(true);
    fetchAttendanceRecords();
  };

  // Error component
  const ErrorMessage = () => (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#f43f5e" />
      <ThemedText style={styles.errorText}>{sampleDataMessage}</ThemedText>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );

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
          onPress={() => router.push('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Attendance</ThemedText>
        <View style={{ width: 32 }} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Error Message */}
        {isUsingSampleData && <ErrorMessage />}
        
        {/* Rest of the UI - only show when no error */}
        {!isUsingSampleData && (
          <>
            {/* Filters */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Time Period</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
              >
                <FilterButton title="7 Days" filter="7days" />
                <FilterButton title="30 Days" filter="30days" />
                <FilterButton title="This Month" filter="month" />
                <FilterButton title="This Year" filter="year" />
                <FilterButton title="All Time" filter="all" />
              </ScrollView>
            </View>
            
            {/* Statistics */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#3b82f6" />
                  </View>
                  <View>
                    <ThemedText style={styles.statTitle}>Working Days</ThemedText>
                    <ThemedText style={styles.statValue}>{stats.totalDays}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="account-check-outline" size={22} color="#84cc16" />
                  </View>
                  <View>
                    <ThemedText style={styles.statTitle}>Present Days</ThemedText>
                    <ThemedText style={styles.statValue}>{stats.presentDays}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="account-cancel-outline" size={22} color="#ef4444" />
                  </View>
                  <View>
                    <ThemedText style={styles.statTitle}>Absent Days</ThemedText>
                    <ThemedText style={styles.statValue}>{stats.absentDays}</ThemedText>
                  </View>
                </View>
                
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <MaterialCommunityIcons name="timer-outline" size={22} color="#f59e0b" />
                  </View>
                  <View>
                    <ThemedText style={styles.statTitle}>Hours Worked</ThemedText>
                    <ThemedText style={styles.statValue}>{stats.totalHoursWorked}</ThemedText>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Attendance List */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>Daily Records</ThemedText>
                <View style={styles.headerRightContent}>
                  <View style={styles.recordsCountBadge}>
                    <ThemedText style={styles.recordsCountText}>{filteredRecords.length}</ThemedText>
                  </View>
                  <TouchableOpacity 
                    style={[styles.exportButton, 
                      (generatingPdf || filteredRecords.length === 0) && styles.exportButtonDisabled]}
                    onPress={exportToPDF}
                    disabled={generatingPdf || filteredRecords.length === 0}
                  >
                    {generatingPdf ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="download-outline" size={24} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              
              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <ThemedText style={styles.loaderText}>Loading your attendance data...</ThemedText>
                </View>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map(record => renderAttendanceItem(record))
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-blank" size={64} color="#64748b" />
                  <ThemedText style={styles.emptyText}>No attendance records found</ThemedText>
                  <ThemedText style={styles.emptySubText}>
                    Records will appear here once you start clocking in
                  </ThemedText>
                </View>
              )}
            </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  headerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordsCountBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recordsCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filtersContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#ffffff',
  },
  filterButtonTextActive: {
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  statBox: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statTitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  attendanceItem: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  attendanceItemGradient: {
    borderRadius: 16,
    padding: 16,
  },
  attendanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateSection: {
    width: 100,
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  dayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 36,
  },
  monthYearText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 2,
  },
  dayOfWeekText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  detailsSection: {
    flex: 1,
    marginLeft: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 8,
  },
  timeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.1)',
    paddingTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 8,
  },
  hoursWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hoursText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loaderContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#cbd5e1',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f43f5e',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
}); 