import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, FlatList, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { withAuth } from '@/lib/auth/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, addMonths, parseISO, addDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MarkedDates } from 'react-native-calendars/src/types';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  type: 'reminder' | 'meeting' | 'holiday';
  is_all_day: boolean;
  description?: string;
  user_id?: string;
  is_public: boolean;
  created_at?: string;
}

function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isAddReminderModalVisible, setIsAddReminderModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    description: '', 
    is_all_day: true, 
    addTime: false,
    start_time: format(new Date().setHours(9, 0, 0, 0), 'HH:mm'),
    end_time: format(new Date().setHours(10, 0, 0, 0), 'HH:mm'),
    hasEndDate: false,
    end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    start_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'reminder' as 'reminder' | 'meeting' | 'holiday',
    is_public: false
  });

  // Helper function for date formatting and validation
  const formatDateForDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return format(new Date(), 'MMMM d, yyyy');
      }
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      console.error("Error formatting date:", e);
      return format(new Date(), 'MMMM d, yyyy');
    }
  };

  // Helper function to validate date input
  const validateDate = (dateStr: string): boolean => {
    // For incomplete dates or empty string, return true to allow typing
    if (dateStr === '' || dateStr.length < 10) {
      return true;
    }
    
    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return false;
    }
    
    // Check if it's a valid date
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          await fetchEvents(user.id);
        } else {
          console.error('No authenticated user found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, []);

  const fetchEvents = async (userId: string) => {
    try {
      // Fetch events where the user_id array contains the current user's ID
      // or if the event is public
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .or(`user_id.cs.{${userId}},is_public.eq.true`);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setEvents(data);
        updateMarkedDates(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const updateMarkedDates = (eventsList: CalendarEvent[]) => {
    const marked: MarkedDates = {};
    
    eventsList.forEach(event => {
      // Define colors for each event type
      let dotColor = '';
      switch (event.type) {
        case 'reminder':
          dotColor = '#3b82f6'; // blue
          break;
        case 'holiday':
          dotColor = '#ef4444'; // red
          break;
        case 'meeting':
          dotColor = '#8b5cf6'; // purple
          break;
      }
      
      // Get the display date (start_date)
      const displayDate = event.start_date;
      
      // Add this date to marked dates
      if (marked[displayDate]) {
        // If this date already has dots, add another one
        if (marked[displayDate].dots) {
          marked[displayDate].dots!.push({
            key: event.id,
            color: dotColor,
          });
        } else {
          // Convert from single dot to multi-dot format
          const existingColor = marked[displayDate].color;
          marked[displayDate] = {
            ...marked[displayDate],
            dots: [
              { key: 'existing', color: existingColor || '#3b82f6' },
              { key: event.id, color: dotColor }
            ],
            color: undefined // Remove single dot color
          };
        }
      } else {
        // First event for this date
        marked[displayDate] = {
          dots: [{ key: event.id, color: dotColor }],
          selected: displayDate === selectedDate,
          selectedColor: 'rgba(59, 130, 246, 0.2)'
        };
      }
      
      // If event has an end_date different from start_date, mark all days in between
      if (event.end_date && event.end_date !== event.start_date) {
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        
        // For each day between start and end, add a marker
        let currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + 1); // Start from next day
        
        while (currentDate <= endDate) {
          const dateString = format(currentDate, 'yyyy-MM-dd');
          
          if (marked[dateString]) {
            // Add this event to existing date
            if (marked[dateString].dots) {
              marked[dateString].dots!.push({
                key: `${event.id}-continue`,
                color: dotColor,
              });
            } else {
              const existingColor = marked[dateString].color;
              marked[dateString] = {
                ...marked[dateString],
                dots: [
                  { key: 'existing', color: existingColor || '#3b82f6' },
                  { key: `${event.id}-continue`, color: dotColor }
                ],
                color: undefined
              };
            }
          } else {
            // Create new marker for this date
            marked[dateString] = {
              dots: [{ key: `${event.id}-continue`, color: dotColor }],
              selected: dateString === selectedDate,
              selectedColor: 'rgba(59, 130, 246, 0.2)'
            };
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });

    // Make sure selected date is marked
    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: 'rgba(59, 130, 246, 0.2)'
      };
    } else {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: 'rgba(59, 130, 246, 0.2)'
      };
    }

    setMarkedDates(marked);
  };

  const handleDateSelect = (date: DateData) => {
    setSelectedDate(date.dateString);
    
    // Update marked dates to reflect the new selection
    const updatedMarkedDates = { ...markedDates };
    
    // Update previous selected date
    if (updatedMarkedDates[selectedDate]) {
      updatedMarkedDates[selectedDate] = {
        ...updatedMarkedDates[selectedDate],
        selected: false
      };
    }
    
    // Update newly selected date
    if (updatedMarkedDates[date.dateString]) {
      updatedMarkedDates[date.dateString] = {
        ...updatedMarkedDates[date.dateString],
        selected: true,
        selectedColor: 'rgba(59, 130, 246, 0.2)'
      };
    } else {
      updatedMarkedDates[date.dateString] = {
        selected: true,
        selectedColor: 'rgba(59, 130, 246, 0.2)'
      };
    }
    
    setMarkedDates(updatedMarkedDates);
  };

  const getEventsForSelectedDate = () => {
    // Return events that either start on selected date, end on selected date,
    // or have selected date between start and end
    return events.filter(event => {
      // Event starts on selected date
      if (event.start_date === selectedDate) return true;
      
      // Event ends on selected date
      if (event.end_date === selectedDate) return true;
      
      // Selected date is between start and end
      if (event.end_date && event.start_date < selectedDate && event.end_date > selectedDate) {
        return true;
      }
      
      return false;
    });
  };

  const renderEventItem = ({ item }: { item: CalendarEvent }) => {
    let iconName: string = 'alert-circle-outline';
    let iconColor = '#3b82f6';
    let backgroundColor = 'rgba(59, 130, 246, 0.1)';

    switch (item.type) {
      case 'reminder':
        iconName = 'bell-outline';
        iconColor = '#3b82f6';
        backgroundColor = 'rgba(59, 130, 246, 0.1)';
        break;
      case 'holiday':
        iconName = 'pine-tree';
        iconColor = '#ef4444';
        backgroundColor = 'rgba(239, 68, 68, 0.1)';
        break;
      case 'meeting':
        iconName = 'account-group-outline';
        iconColor = '#8b5cf6';
        backgroundColor = 'rgba(139, 92, 246, 0.1)';
        break;
    }

    // Format time display if applicable
    let timeDisplay = null;
    if (!item.is_all_day && item.start_time) {
      const startTime = item.start_time.substring(11, 16); // Extract HH:MM from datetime
      const endTime = item.end_time ? item.end_time.substring(11, 16) : startTime;
      timeDisplay = (
        <ThemedText style={styles.eventTime}>
          {startTime} - {endTime}
        </ThemedText>
      );
    }

    // Calculate if this is a multi-day event
    let dateRangeDisplay = null;
    if (item.end_date && item.end_date !== item.start_date) {
      dateRangeDisplay = (
        <ThemedText style={styles.eventDateRange}>
          {format(new Date(item.start_date), 'MMM d')} - {format(new Date(item.end_date), 'MMM d, yyyy')}
        </ThemedText>
      );
    }

    return (
      <View style={[styles.eventItem, { backgroundColor }]}>
        <View style={[styles.eventIconContainer, { backgroundColor: `${iconColor}20` }]}>
          <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} />
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <ThemedText style={styles.eventTitle}>{item.title}</ThemedText>
          </View>
          {dateRangeDisplay}
          {item.description && (
            <ThemedText style={styles.eventDescription}>{item.description}</ThemedText>
          )}
          {timeDisplay}
        </View>
      </View>
    );
  };

  const saveReminder = async () => {
    if (!newReminder.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your reminder');
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare data for inserting into the database
      const eventData = {
        title: newReminder.title,
        description: newReminder.description || null,
        start_date: newReminder.start_date,
        end_date: newReminder.hasEndDate ? newReminder.end_date : newReminder.start_date,
        start_time: newReminder.addTime ? `${newReminder.start_date}T${newReminder.start_time}:00` : null,
        end_time: newReminder.addTime ? `${newReminder.start_date}T${newReminder.end_time}:00` : null,
        type: newReminder.type,
        is_all_day: !newReminder.addTime,
        user_id: [userId], // Store user_id as an array
        is_public: newReminder.is_public
      };

      // Insert into database
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Update local state with the new event
        const updatedEvents = [...events, data];
        setEvents(updatedEvents);
        updateMarkedDates(updatedEvents);
        
        // Reset form
        setNewReminder({ 
          title: '', 
          description: '', 
          is_all_day: true, 
          addTime: false,
          start_time: format(new Date().setHours(9, 0, 0, 0), 'HH:mm'),
          end_time: format(new Date().setHours(10, 0, 0, 0), 'HH:mm'),
          hasEndDate: false,
          end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          start_date: format(new Date(), 'yyyy-MM-dd'),
          type: 'reminder',
          is_public: false
        });
        
        // Close modal
        setIsAddReminderModalVisible(false);
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e3a8a', '#0f172a']}
      style={[styles.container, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Calendar</ThemedText>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            // Set the reminderDate to the selected date when opening the modal
            setNewReminder(prev => ({ 
              ...prev, 
              start_date: selectedDate,
              is_all_day: true,
              addTime: false
            }));
            setIsAddReminderModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.calendarContainer}>
          <Calendar
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: '#94a3b8',
              textSectionTitleDisabledColor: '#64748b',
              selectedDayBackgroundColor: '#3b82f6',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#3b82f6',
              dayTextColor: '#ffffff',
              textDisabledColor: '#64748b',
              dotColor: '#3b82f6',
              selectedDotColor: '#ffffff',
              arrowColor: '#3b82f6',
              disabledArrowColor: '#64748b',
              monthTextColor: '#ffffff',
              indicatorColor: '#3b82f6',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13
            }}
            onDayPress={handleDateSelect}
            markingType="multi-dot"
            markedDates={markedDates}
            enableSwipeMonths={true}
            hideExtraDays={false}
          />
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <ThemedText style={styles.legendText}>Reminder</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <ThemedText style={styles.legendText}>Holiday</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <ThemedText style={styles.legendText}>Meeting</ThemedText>
          </View>
        </View>

        <View style={styles.eventsContainer}>
          <View style={styles.eventsSectionHeader}>
            <ThemedText style={styles.eventsSectionTitle}>
              Events on {format(parseISO(selectedDate), 'MMMM d, yyyy')}
            </ThemedText>
            <ThemedText style={styles.eventsCount}>
              {getEventsForSelectedDate().length} events
            </ThemedText>
          </View>

          {getEventsForSelectedDate().length > 0 ? (
            <FlatList
              data={getEventsForSelectedDate()}
              renderItem={renderEventItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.eventsListContent}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noEventsContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#64748b" />
              <ThemedText style={styles.noEventsText}>No events on this day</ThemedText>
              <TouchableOpacity 
                style={styles.addReminderButton}
                onPress={() => {
                  setNewReminder(prev => ({ 
                    ...prev, 
                    start_date: selectedDate,
                    is_all_day: true,
                    addTime: false
                  }));
                  setIsAddReminderModalVisible(true);
                }}
              >
                <ThemedText style={styles.addReminderButtonText}>Add Reminder</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddReminderModalVisible}
        onRequestClose={() => setIsAddReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Reminder</ThemedText>
              <TouchableOpacity 
                onPress={() => setIsAddReminderModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.input}
                placeholder="Reminder title"
                placeholderTextColor="#94a3b8"
                value={newReminder.title}
                onChangeText={title => setNewReminder(prev => ({ ...prev, title }))}
              />
              
              <View style={styles.datePickerSection}>
                <ThemedText style={styles.sectionLabel}>Date:</ThemedText>
                <TouchableOpacity 
                  style={styles.dateSelectButton}
                  onPress={() => {
                    Alert.alert(
                      "Date Format",
                      "Please enter date in YYYY-MM-DD format (e.g. 2023-11-25)",
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <ThemedText style={styles.dateButtonText}>
                    {formatDateForDisplay(newReminder.start_date)}
                  </ThemedText>
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={newReminder.start_date}
                onChangeText={(text) => {
                  // Always update the text value
                  setNewReminder(prev => ({
                    ...prev,
                    start_date: text
                  }));
                  
                  // Only process when we have complete input
                  if (text.length === 10) {
                    // Check if it's a valid date in YYYY-MM-DD format
                    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(text);
                    const dateObj = new Date(text);
                    const isValidDate = !isNaN(dateObj.getTime());
                    
                    if (isValidFormat && isValidDate) {
                      // If the user has an end date set and it's now before the start date,
                      // update the end date to match the new start date
                      if (newReminder.hasEndDate) {
                        const endDate = new Date(newReminder.end_date);
                        if (!isNaN(endDate.getTime()) && endDate < dateObj) {
                          setNewReminder(prev => ({
                            ...prev,
                            end_date: text
                          }));
                        }
                      }
                    }
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
              
              <TouchableOpacity 
                style={styles.optionsButton}
                onPress={() => {
                  setNewReminder(prev => ({ 
                    ...prev, 
                    hasEndDate: !prev.hasEndDate,
                    end_date: !prev.hasEndDate ? prev.start_date : prev.end_date 
                  }));
                }}
              >
                <ThemedText style={styles.optionsButtonText}>
                  {newReminder.hasEndDate ? "Hide End Date" : "Show End Date Options"}
                </ThemedText>
                <Ionicons name={newReminder.hasEndDate ? "chevron-up" : "chevron-down"} size={18} color="#3b82f6" />
              </TouchableOpacity>

              {newReminder.hasEndDate && (
                <>
                  <View style={styles.datePickerSection}>
                    <ThemedText style={styles.sectionLabel}>End Date:</ThemedText>
                    <TouchableOpacity 
                      style={styles.dateSelectButton}
                      onPress={() => {
                        Alert.alert(
                          "Date Format",
                          "Please enter date in YYYY-MM-DD format (e.g. 2023-11-25)",
                          [{ text: "OK" }]
                        );
                      }}
                    >
                      <ThemedText style={styles.dateButtonText}>
                        {formatDateForDisplay(newReminder.end_date)}
                      </ThemedText>
                      <Ionicons name="calendar" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    value={newReminder.end_date}
                    onChangeText={(text) => {
                      // Always update the text value
                      setNewReminder(prev => ({
                        ...prev,
                        end_date: text
                      }));
                      
                      // Only show validation when we have complete input
                      if (text.length === 10) {
                        // Check if it's a valid date in YYYY-MM-DD format
                        const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(text);
                        const dateObj = new Date(text);
                        const isValidDate = !isNaN(dateObj.getTime());
                        
                        if (isValidFormat && isValidDate) {
                          const startDate = new Date(newReminder.start_date);
                          // Check if end date is before start date
                          if (dateObj < startDate) {
                            Alert.alert(
                              "Invalid Date Range",
                              "End date cannot be before start date",
                              [{ text: "OK" }]
                            );
                          }
                        }
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                  />
                </>
              )}
              
              <TouchableOpacity 
                style={styles.addTimeButton}
                onPress={() => setNewReminder(prev => ({ 
                  ...prev, 
                  addTime: !prev.addTime,
                  is_all_day: prev.addTime // If removing time, set to all day
                }))}
              >
                <ThemedText style={styles.addTimeButtonText}>
                  {newReminder.addTime ? "Remove Time" : "Add Time"}
                </ThemedText>
              </TouchableOpacity>
              
              {newReminder.addTime && (
                <View style={styles.timeContainer}>
                  <View style={styles.timeSection}>
                    <ThemedText style={styles.timeLabel}>Start time:</ThemedText>
                    <TextInput
                      style={styles.timeInput}
                      value={newReminder.start_time}
                      onChangeText={start_time => setNewReminder(prev => ({ ...prev, start_time }))}
                      keyboardType="numbers-and-punctuation"
                      placeholder="09:00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  
                  <View style={styles.timeSection}>
                    <ThemedText style={styles.timeLabel}>End time:</ThemedText>
                    <TextInput
                      style={styles.timeInput}
                      value={newReminder.end_time}
                      onChangeText={end_time => setNewReminder(prev => ({ ...prev, end_time }))}
                      keyboardType="numbers-and-punctuation"
                      placeholder="10:00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              )}
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={newReminder.description}
                onChangeText={description => setNewReminder(prev => ({ ...prev, description }))}
              />
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveReminder}
              >
                <ThemedText style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Reminder'}
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 15,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  eventsContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 85,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  eventsCount: {
    fontSize: 14,
    color: '#94a3b8',
  },
  eventsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 15,
    marginBottom: 20,
  },
  addReminderButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addReminderButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.3)',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dateSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    flex: 1,
    marginLeft: 12,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#334155',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    minWidth: 80,
  },
  optionsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  optionsButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 85,
  },
  eventTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  timeSection: {
    width: '48%',
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  timeInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addTimeButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  addTimeButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  eventDateRange: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 4,
  },
}); 

export default withAuth(CalendarScreen); 