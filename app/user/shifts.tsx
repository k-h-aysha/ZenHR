import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, RefreshControl, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthContext';

interface Shift {
    id: string;
    user_id: string;
    shift_type: 'First Shift' | 'Second Shift' | 'Split Shift';
    start_time: string;
    end_time: string;
    date: string;
    created_at: string;
}

export default function UserShiftsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const insets = useSafeAreaInsets();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const shiftColors = {
        'First Shift': {
            primary: '#00BFA6',
            secondary: '#00D4B8',
            icon: '#00A892'
        },
        'Second Shift': {
            primary: '#4A90E2',
            secondary: '#5A9FE2',
            icon: '#3A80D2'
        },
        'Split Shift': {
            primary: '#9C27B0',
            secondary: '#A937C0',
            icon: '#8917A0'
        }
    };

    const shiftIcons = {
        'First Shift': 'sunny',
        'Second Shift': 'moon',
        'Split Shift': 'time'
    };

    useEffect(() => {
        if (user) {
            fetchShifts();
        }
    }, [selectedDate, user]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const fetchShifts = async () => {
        if (!user) return;
        
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('shifts')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', format(selectedDate, 'yyyy-MM-dd'))
                .order('start_time');

            if (error) throw error;
            setShifts(data || []);
        } catch (error) {
            console.error('Error fetching shifts:', error);
            Alert.alert('Error', 'Failed to load shifts');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchShifts();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [selectedDate]);

    const getShiftColor = (shiftType: string) => {
        return shiftColors[shiftType as keyof typeof shiftColors] || '#64748b';
    };

    const getShiftIcon = (shiftType: string) => {
        return shiftIcons[shiftType as keyof typeof shiftIcons] || 'time';
    };

    const formatTime = (time: string) => {
        return time.substring(0, 5); // Format as HH:MM
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                style={[styles.container, { paddingTop: insets.top }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <ThemedText style={styles.headerTitle}>My Shifts</ThemedText>
                    </View>
                    <View style={styles.dateSelector}>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => {
                                const date = new Date(selectedDate);
                                date.setDate(date.getDate() - 1);
                                setSelectedDate(date);
                            }}
                        >
                            <Ionicons name="chevron-back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <ThemedText style={styles.dateText}>
                                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => {
                                const date = new Date(selectedDate);
                                date.setDate(date.getDate() + 1);
                                setSelectedDate(date);
                            }}
                        >
                            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setSelectedDate(date);
                        }}
                    />
                )}

                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#93c5fd"
                            colors={['#93c5fd']}
                            progressBackgroundColor="#1e3a8a"
                        />
                    }
                >
                    <Animated.View style={[styles.shiftsContainer, { opacity: fadeAnim }]}>
                        {shifts.length === 0 ? (
                            <View style={styles.noShiftContainer}>
                                <Ionicons name="calendar-outline" size={48} color="#64748b" />
                                <ThemedText style={styles.noShiftText}>
                                    No shifts assigned for this date
                                </ThemedText>
                            </View>
                        ) : (
                            shifts.map((shift) => (
                                <View key={shift.id} style={styles.shiftCard}>
                                    <LinearGradient
                                        colors={[
                                            shiftColors[shift.shift_type].primary,
                                            shiftColors[shift.shift_type].secondary
                                        ]}
                                        style={styles.shiftGradient}
                                    >
                                        <View style={styles.shiftContent}>
                                            <View style={styles.shiftHeader}>
                                                <View style={styles.shiftTypeContainer}>
                                                    <View style={[
                                                        styles.iconContainer,
                                                        { backgroundColor: shiftColors[shift.shift_type].icon }
                                                    ]}>
                                                        <Ionicons 
                                                            name={getShiftIcon(shift.shift_type)} 
                                                            size={24} 
                                                            color="#ffffff" 
                                                        />
                                                    </View>
                                                    <View style={styles.shiftTypeInfo}>
                                                        <ThemedText style={styles.shiftTypeText}>
                                                            {shift.shift_type}
                                                        </ThemedText>
                                                        <ThemedText style={styles.dateText}>
                                                            {format(parseISO(shift.date), 'MMM d, yyyy')}
                                                        </ThemedText>
                                                    </View>
                                                </View>
                                            </View>
                                            
                                            <View style={styles.timeSection}>
                                                <View style={styles.timeBlock}>
                                                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                                                    <View style={styles.timeInfo}>
                                                        <ThemedText style={styles.timeLabel}>Start Time</ThemedText>
                                                        <ThemedText style={styles.timeValue}>
                                                            {formatTime(shift.start_time)}
                                                        </ThemedText>
                                                    </View>
                                                </View>
                                                <View style={styles.timeDivider} />
                                                <View style={styles.timeBlock}>
                                                    <Ionicons name="time-outline" size={20} color="#ffffff" />
                                                    <View style={styles.timeInfo}>
                                                        <ThemedText style={styles.timeLabel}>End Time</ThemedText>
                                                        <ThemedText style={styles.timeValue}>
                                                            {formatTime(shift.end_time)}
                                                        </ThemedText>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </View>
                            ))
                        )}
                    </Animated.View>
                </ScrollView>
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
    headerContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        flex: 1,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dateButton: {
        padding: 8,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginHorizontal: 20,
    },
    content: {
        flex: 1,
        padding: 20,
        paddingBottom: 40,
    },
    shiftsContainer: {
        gap: 15,
    },
    shiftCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    shiftGradient: {
        padding: 24,
    },
    shiftContent: {
        gap: 16,
    },
    shiftHeader: {
        marginBottom: 8,
    },
    shiftTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    shiftTypeInfo: {
        flex: 1,
    },
    shiftTypeText: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    timeSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 16,
    },
    timeBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeInfo: {
        flex: 1,
    },
    timeLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginBottom: 4,
    },
    timeValue: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    timeDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginHorizontal: 16,
    },
    noShiftContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        padding: 48,
        alignItems: 'center',
        marginTop: 20,
    },
    noShiftText: {
        fontSize: 18,
        color: '#ffffff',
        fontStyle: 'italic',
        marginTop: 16,
        textAlign: 'center',
    },
}); 