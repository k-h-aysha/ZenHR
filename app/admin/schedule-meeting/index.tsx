import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ScheduleMeetingScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [isAllDay, setIsAllDay] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [includeGoogleMeet, setIncludeGoogleMeet] = useState(false);
    const [meetLink, setMeetLink] = useState('');

    const generateMeetLink = () => {
        // Generate a random string for the meet link
        const randomString = Math.random().toString(36).substring(2, 8);
        return `https://meet.google.com/${randomString}`;
    };

    const handleScheduleMeeting = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a meeting title');
            return;
        }

        try {
            // Get the current user's ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Generate meet link if needed
            const meetingLink = includeGoogleMeet ? generateMeetLink() : null;

            // Create the calendar event
            const { data: eventData, error: eventError } = await supabase
                .from('calendar_events')
                .insert([
                    {
                        title,
                        description: meetingLink ? `${description}\n\nGoogle Meet Link: ${meetingLink}` : description,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        type: 'meeting',
                        is_all_day: isAllDay,
                        user_id: user.id,
                        is_public: true
                    }
                ])
                .select()
                .single();

            if (eventError) throw eventError;

            // Create an announcement for the meeting
            const { error: announcementError } = await supabase
                .from('announcements')
                .insert([
                    {
                        title: `New Meeting Scheduled: ${title}`,
                        content: `A new meeting has been scheduled:\n\nTitle: ${title}\nDate: ${startDate.toLocaleDateString()}\nTime: ${startDate.toLocaleTimeString()}\n\n${description}${meetingLink ? `\n\nGoogle Meet Link: ${meetingLink}` : ''}`,
                        created_by: user.id
                    }
                ]);

            if (announcementError) throw announcementError;

            Alert.alert('Success', 'Meeting scheduled successfully');
            router.back();
        } catch (error) {
            console.error('Error scheduling meeting:', error);
            Alert.alert('Error', 'Failed to schedule meeting');
        }
    };

    const onStartDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || startDate;
        setShowStartPicker(false);

        if (event.type !== 'dismissed') {
            setStartDate(currentDate);
            // Set end date to 1 hour after start date
            const newEndDate = new Date(currentDate);
            newEndDate.setHours(newEndDate.getHours() + 1);
            setEndDate(newEndDate);
        }
    };

    const onEndDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || endDate;
        setShowEndPicker(false);

        if (event.type !== 'dismissed') {
            setEndDate(currentDate);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                style={[styles.container, { paddingTop: insets.top }]}
            >
                <ScrollView style={styles.scrollView}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <ThemedText style={styles.headerTitle}>Schedule Meeting</ThemedText>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.label}>Meeting Title</ThemedText>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter meeting title"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.label}>Description</ThemedText>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Enter meeting description"
                                placeholderTextColor="#94a3b8"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.label}>Start Date & Time</ThemedText>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowStartPicker(true)}
                            >
                                <ThemedText style={styles.dateButtonText}>
                                    {startDate.toLocaleString()}
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.label}>End Date & Time</ThemedText>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowEndPicker(true)}
                            >
                                <ThemedText style={styles.dateButtonText}>
                                    {endDate.toLocaleString()}
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.switchContainer}>
                            <ThemedText style={styles.label}>All Day Meeting</ThemedText>
                            <TouchableOpacity
                                style={[styles.switch, isAllDay && styles.switchActive]}
                                onPress={() => setIsAllDay(!isAllDay)}
                            >
                                <View style={[styles.switchThumb, isAllDay && styles.switchThumbActive]} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.switchContainer}>
                            <View style={styles.switchLabelContainer}>
                                <ThemedText style={styles.label}>Include Google Meet</ThemedText>
                                <ThemedText style={styles.switchDescription}>
                                    Create a Google Meet link for this meeting
                                </ThemedText>
                            </View>
                            <TouchableOpacity
                                style={[styles.switch, includeGoogleMeet && styles.switchActive]}
                                onPress={() => setIncludeGoogleMeet(!includeGoogleMeet)}
                            >
                                <View style={[styles.switchThumb, includeGoogleMeet && styles.switchThumbActive]} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleScheduleMeeting}
                        >
                            <ThemedText style={styles.submitButtonText}>Schedule Meeting</ThemedText>
                        </TouchableOpacity>
                    </View>

                    {(showStartPicker || showEndPicker) && (
                        <DateTimePicker
                            value={showStartPicker ? startDate : endDate}
                            mode="datetime"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={showStartPicker ? onStartDateChange : onEndDateChange}
                        />
                    )}
                </ScrollView>
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
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    form: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#ffffff',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    dateButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
    },
    dateButtonText: {
        color: '#ffffff',
        fontSize: 16,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    switch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 2,
    },
    switchActive: {
        backgroundColor: '#3b82f6',
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
    },
    switchThumbActive: {
        transform: [{ translateX: 22 }],
    },
    submitButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    switchLabelContainer: {
        flex: 1,
    },
    switchDescription: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
}); 