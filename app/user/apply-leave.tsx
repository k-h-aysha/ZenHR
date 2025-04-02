import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { submitLeaveRequest } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

// Define leave types
const leaveTypes = [
  'Annual Leave',
  'Sick Leave',
  'Personal Leave',
  'Family Leave',
  'Bereavement Leave',
  'Unpaid Leave',
  'Other'
];

// Define day parts
const dayParts = [
  'Full Day',
  'Morning Half (AM)',
  'Afternoon Half (PM)'
];

// Helper to create date options for month selection
const getMonthOptions = () => {
  return [
    'January', 'February', 'March', 'April', 
    'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'
  ];
};

// Helper to create date options for day selection
const getDayOptions = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
};

// Helper to create date options for year selection
const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(currentYear + i));
};

export default function ApplyLeaveScreen() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State variables for form
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [showLeaveTypeDropdown, setShowLeaveTypeDropdown] = useState(false);
  
  // From date states
  const [fromDay, setFromDay] = useState(String(currentDate.getDate()));
  const [fromMonth, setFromMonth] = useState(currentDate.getMonth());
  const [fromYear, setFromYear] = useState(String(currentDate.getFullYear()));
  const [showFromDayDropdown, setShowFromDayDropdown] = useState(false);
  const [showFromMonthDropdown, setShowFromMonthDropdown] = useState(false);
  const [showFromYearDropdown, setShowFromYearDropdown] = useState(false);
  
  // To date states
  const [toDay, setToDay] = useState(String(currentDate.getDate()));
  const [toMonth, setToMonth] = useState(currentDate.getMonth());
  const [toYear, setToYear] = useState(String(currentDate.getFullYear()));
  const [showToDayDropdown, setShowToDayDropdown] = useState(false);
  const [showToMonthDropdown, setShowToMonthDropdown] = useState(false);
  const [showToYearDropdown, setShowToYearDropdown] = useState(false);
  
  const [dayPart, setDayPart] = useState('Full Day');
  const [showDayPartDropdown, setShowDayPartDropdown] = useState(false);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1 day');

  // Calculate duration whenever dates change
  React.useEffect(() => {
    calculateDuration();
  }, [fromDay, fromMonth, fromYear, toDay, toMonth, toYear, dayPart]);

  // Calculate the duration of leave
  const calculateDuration = () => {
    // Create date objects from the selected values
    const fromDate = new Date(Number(fromYear), fromMonth, Number(fromDay));
    const toDate = new Date(Number(toYear), toMonth, Number(toDay));
    
    // Calculate the difference in days
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays === 1) {
      if (dayPart === 'Full Day') {
        setDuration('1 day');
      } else {
        setDuration('Half day');
      }
    } else {
      if (dayPart === 'Full Day') {
        setDuration(`${diffDays} days`);
      } else {
        // For multi-day selections with half days, we simplify to just count the days
        setDuration(`${diffDays - 0.5} days`);
      }
    }
  };

  // Format date for display
  const formatDate = (day: string, month: number, year: string) => {
    const date = new Date(Number(year), month, Number(day));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!user || !user.id) {
      Alert.alert('Error', 'User is not authenticated');
      return;
    }

    if (!leaveType) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave request');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create date objects from the selected values
      const fromDate = new Date(Number(fromYear), fromMonth, Number(fromDay));
      const toDate = new Date(Number(toYear), toMonth, Number(toDay));
      
      // Check if dates are valid
      if (fromDate > toDate) {
        Alert.alert('Error', 'From date cannot be after to date');
        setIsSubmitting(false);
        return;
      }
      
      // Submit to Supabase
      const { data, error } = await submitLeaveRequest(
        user.id,
        leaveType,
        fromDate,
        toDate,
        dayPart,
        duration,
        reason
      );
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Show success message and navigate back
      Alert.alert(
        'Success', 
        'Leave request submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting leave request:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to submit leave request'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e3a8a', '#0f172a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Apply for Leave</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Leave Type */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Leave Type</ThemedText>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowLeaveTypeDropdown(!showLeaveTypeDropdown)}
            >
              <ThemedText style={styles.dropdownText}>{leaveType}</ThemedText>
              <Ionicons
                name={showLeaveTypeDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#93c5fd"
              />
            </TouchableOpacity>
            
            {showLeaveTypeDropdown && (
              <View style={styles.dropdownMenu}>
                {leaveTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setLeaveType(type);
                      setShowLeaveTypeDropdown(false);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.dropdownItemText,
                        type === leaveType && styles.selectedText
                      ]}
                    >
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* From Date */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>From Date</ThemedText>
            <View style={styles.datePickerRow}>
              {/* Day Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowFromDayDropdown(!showFromDayDropdown);
                    setShowFromMonthDropdown(false);
                    setShowFromYearDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{fromDay}</ThemedText>
                  <Ionicons
                    name={showFromDayDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showFromDayDropdown && (
                  <View style={[styles.dropdownMenu, styles.dayDropdownMenu]}>
                    <ScrollView style={styles.dayDropdownScroll}>
                      {getDayOptions(fromMonth, Number(fromYear)).map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFromDay(day);
                            setShowFromDayDropdown(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.dropdownItemText,
                              day === fromDay && styles.selectedText
                            ]}
                          >
                            {day}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Month Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowFromMonthDropdown(!showFromMonthDropdown);
                    setShowFromDayDropdown(false);
                    setShowFromYearDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{getMonthOptions()[fromMonth]}</ThemedText>
                  <Ionicons
                    name={showFromMonthDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showFromMonthDropdown && (
                  <View style={[styles.dropdownMenu, styles.monthDropdownMenu]}>
                    <ScrollView style={styles.monthDropdownScroll}>
                      {getMonthOptions().map((month, index) => (
                        <TouchableOpacity
                          key={month}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFromMonth(index);
                            setShowFromMonthDropdown(false);
                            
                            // Ensure the day is valid for the new month
                            const daysInNewMonth = new Date(Number(fromYear), index + 1, 0).getDate();
                            if (Number(fromDay) > daysInNewMonth) {
                              setFromDay(String(daysInNewMonth));
                            }
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.dropdownItemText,
                              index === fromMonth && styles.selectedText
                            ]}
                          >
                            {month}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Year Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowFromYearDropdown(!showFromYearDropdown);
                    setShowFromDayDropdown(false);
                    setShowFromMonthDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{fromYear}</ThemedText>
                  <Ionicons
                    name={showFromYearDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showFromYearDropdown && (
                  <View style={[styles.dropdownMenu, styles.yearDropdownMenu]}>
                    {getYearOptions().map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFromYear(year);
                          setShowFromYearDropdown(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.dropdownItemText,
                            year === fromYear && styles.selectedText
                          ]}
                        >
                          {year}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <ThemedText style={styles.dateDisplay}>
              {formatDate(fromDay, fromMonth, fromYear)}
            </ThemedText>
          </View>
          
          {/* To Date */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>To Date</ThemedText>
            <View style={styles.datePickerRow}>
              {/* Day Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowToDayDropdown(!showToDayDropdown);
                    setShowToMonthDropdown(false);
                    setShowToYearDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{toDay}</ThemedText>
                  <Ionicons
                    name={showToDayDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showToDayDropdown && (
                  <View style={[styles.dropdownMenu, styles.dayDropdownMenu]}>
                    <ScrollView style={styles.dayDropdownScroll}>
                      {getDayOptions(toMonth, Number(toYear)).map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setToDay(day);
                            setShowToDayDropdown(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.dropdownItemText,
                              day === toDay && styles.selectedText
                            ]}
                          >
                            {day}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Month Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowToMonthDropdown(!showToMonthDropdown);
                    setShowToDayDropdown(false);
                    setShowToYearDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{getMonthOptions()[toMonth]}</ThemedText>
                  <Ionicons
                    name={showToMonthDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showToMonthDropdown && (
                  <View style={[styles.dropdownMenu, styles.monthDropdownMenu]}>
                    <ScrollView style={styles.monthDropdownScroll}>
                      {getMonthOptions().map((month, index) => (
                        <TouchableOpacity
                          key={month}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setToMonth(index);
                            setShowToMonthDropdown(false);
                            
                            // Ensure the day is valid for the new month
                            const daysInNewMonth = new Date(Number(toYear), index + 1, 0).getDate();
                            if (Number(toDay) > daysInNewMonth) {
                              setToDay(String(daysInNewMonth));
                            }
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.dropdownItemText,
                              index === toMonth && styles.selectedText
                            ]}
                          >
                            {month}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Year Picker */}
              <View style={styles.datePickerColumn}>
                <TouchableOpacity
                  style={styles.datePartDropdown}
                  onPress={() => {
                    setShowToYearDropdown(!showToYearDropdown);
                    setShowToDayDropdown(false);
                    setShowToMonthDropdown(false);
                  }}
                >
                  <ThemedText style={styles.dropdownText}>{toYear}</ThemedText>
                  <Ionicons
                    name={showToYearDropdown ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#93c5fd"
                  />
                </TouchableOpacity>
                
                {showToYearDropdown && (
                  <View style={[styles.dropdownMenu, styles.yearDropdownMenu]}>
                    {getYearOptions().map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setToYear(year);
                          setShowToYearDropdown(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.dropdownItemText,
                            year === toYear && styles.selectedText
                          ]}
                        >
                          {year}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            <ThemedText style={styles.dateDisplay}>
              {formatDate(toDay, toMonth, toYear)}
            </ThemedText>
          </View>
          
          {/* Duration */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Duration</ThemedText>
            <View style={styles.durationContainer}>
              <ThemedText style={styles.durationText}>{duration}</ThemedText>
            </View>
          </View>
          
          {/* Day Part */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Day Part</ThemedText>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowDayPartDropdown(!showDayPartDropdown)}
            >
              <ThemedText style={styles.dropdownText}>{dayPart}</ThemedText>
              <Ionicons
                name={showDayPartDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#93c5fd"
              />
            </TouchableOpacity>
            
            {showDayPartDropdown && (
              <View style={[styles.dropdownMenu, styles.smallDropdownMenu]}>
                {dayParts.map((part) => (
                  <TouchableOpacity
                    key={part}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDayPart(part);
                      setShowDayPartDropdown(false);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.dropdownItemText,
                        part === dayPart && styles.selectedText
                      ]}
                    >
                      {part}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Reason */}
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Reason for Leave</ThemedText>
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason for leave request..."
              placeholderTextColor="#64748b"
              multiline={true}
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
            />
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Request</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e0f2fe',
  },
  dropdown: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#f8fafc',
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  smallDropdownMenu: {
    maxHeight: 150,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#f8fafc',
  },
  selectedText: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 4,
    position: 'relative',
  },
  datePartDropdown: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateDisplay: {
    marginTop: 8,
    fontSize: 14,
    color: '#93c5fd',
    textAlign: 'center',
  },
  dayDropdownMenu: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    maxHeight: 200,
  },
  monthDropdownMenu: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    maxHeight: 200,
  },
  yearDropdownMenu: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    maxHeight: 200,
  },
  dayDropdownScroll: {
    maxHeight: 200,
  },
  monthDropdownScroll: {
    maxHeight: 200,
  },
  durationContainer: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 16,
    color: '#f8fafc',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
}); 