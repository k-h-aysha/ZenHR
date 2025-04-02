import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, TextInput, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal } from '@/components/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    position: string;
    department: string;
    join_date: string;
    salary: number;
    bank_name: string;
    bank_account: string;
    bank_iban: string;
    avatar_url: string;
    created_at: string;
    is_verified: boolean;
}

interface Shift {
    id: string;
    user_id: string;
    shift_type: 'First Shift' | 'Second Shift' | 'Split Shift';
    start_time: string;
    end_time: string;
    date: string;
    created_at: string;
    user?: User;
}

export default function ShiftsScreen() {
    const router = useRouter();
    const [employees, setEmployees] = useState<User[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showAddShiftModal, setShowAddShiftModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [selectedShiftType, setSelectedShiftType] = useState<Shift['shift_type']>('First Shift');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const insets = useSafeAreaInsets();

    const defaultAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

    const shiftColors = {
        'First Shift': '#00BFA6',
        'Second Shift': '#4A90E2',
        'Split Shift': '#9C27B0'
    };

    useEffect(() => {
        fetchEmployees();
        fetchShifts();
    }, [selectedDate]);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('full_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchShifts = async () => {
        try {
            const { data, error } = await supabase
                .from('shifts')
                .select(`
                    *,
                    user:users!shifts_user_id_fkey(*)
                `)
                .eq('date', format(selectedDate, 'yyyy-MM-dd'));

            if (error) throw error;
            setShifts(data || []);
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchEmployees(),
                fetchShifts()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [selectedDate]);

    const openAddShiftModal = (employee: User) => {
        setSelectedEmployee(employee);
        setShowAddShiftModal(true);
    };

    const closeAddShiftModal = () => {
        setSelectedEmployee(null);
        setShowAddShiftModal(false);
        setSelectedShiftType('First Shift');
        setStartTime('09:00');
        setEndTime('17:00');
    };

    const saveShift = async () => {
        if (!selectedEmployee) return;

        try {
            const { error } = await supabase
                .from('shifts')
                .insert({
                    user_id: selectedEmployee.id,
                    shift_type: selectedShiftType,
                    start_time: startTime,
                    end_time: endTime,
                    date: format(selectedDate, 'yyyy-MM-dd')
                });

            if (error) throw error;

            await fetchShifts();
            closeAddShiftModal();
        } catch (error) {
            console.error('Error saving shift:', error);
            Alert.alert("Error", "Failed to save shift. Please try again.");
        }
    };

    const getShiftColor = (shiftType: string) => {
        return shiftColors[shiftType as keyof typeof shiftColors] || '#64748b';
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
                        <ThemedText style={styles.headerTitle}>Shift Management</ThemedText>
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
                    <View style={styles.employeesContainer}>
                        {employees.map((employee) => {
                            return (
                                <View key={employee.id} style={styles.employeeCard}>
                                    <View style={styles.employeeInfo}>
                                        <Image
                                            source={{ uri: employee.avatar_url || defaultAvatar }}
                                            style={styles.profilePicture}
                                        />
                                        <View style={styles.employeeDetails}>
                                            <ThemedText style={styles.employeeName}>
                                                {employee.full_name}
                                            </ThemedText>
                                            <ThemedText style={styles.employeePosition}>
                                                {employee.position || 'No position'}
                                            </ThemedText>
                                            <ThemedText style={styles.employeeDepartment}>
                                                {employee.department || 'No department'}
                                            </ThemedText>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.addShiftButton}
                                            onPress={() => openAddShiftModal(employee)}
                                        >
                                            <Ionicons name="add-circle" size={24} color="#3b82f6" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.shiftsContainer}>
                                        {shifts.filter(shift => shift.user_id === employee.id).map((shift) => (
                                            <View key={shift.id} style={styles.shiftInfo}>
                                                <View style={[
                                                    styles.shiftBadge,
                                                    { backgroundColor: getShiftColor(shift.shift_type) }
                                                ]}>
                                                    <ThemedText style={styles.shiftTypeText}>
                                                        {shift.shift_type}
                                                    </ThemedText>
                                                </View>
                                                <View style={styles.timeContainer}>
                                                    <ThemedText style={styles.timeText}>
                                                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                                    </ThemedText>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Alert.alert(
                                                            'Delete Shift',
                                                            'Are you sure you want to delete this shift?',
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                {
                                                                    text: 'Delete',
                                                                    style: 'destructive',
                                                                    onPress: async () => {
                                                                        try {
                                                                            const { error } = await supabase
                                                                                .from('shifts')
                                                                                .delete()
                                                                                .eq('id', shift.id);

                                                                            if (error) throw error;
                                                                            fetchShifts();
                                                                        } catch (error) {
                                                                            console.error('Error deleting shift:', error);
                                                                            Alert.alert('Error', 'Failed to delete shift');
                                                                        }
                                                                    }
                                                                }
                                                            ]
                                                        );
                                                    }}
                                                    style={styles.deleteButton}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        {shifts.filter(shift => shift.user_id === employee.id).length === 0 && (
                                            <View style={styles.noShiftContainer}>
                                                <ThemedText style={styles.noShiftText}>
                                                    No shifts assigned
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Add Shift Modal */}
                {showAddShiftModal && selectedEmployee && (
                    <Modal
                        visible={showAddShiftModal}
                        onClose={closeAddShiftModal}
                        title="Add Shift"
                    >
                        <View style={styles.modalContent}>
                            <ThemedText style={[styles.modalTitle, { color: '#1e293b' }]}>
                                Select Shift Type for {selectedEmployee.full_name}
                            </ThemedText>

                            <View style={styles.shiftTypeSelector}>
                                {(['First Shift', 'Second Shift', 'Split Shift'] as const).map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.shiftTypeOption,
                                            selectedShiftType === type && {
                                                backgroundColor: getShiftColor(type),
                                                borderColor: getShiftColor(type)
                                            }
                                        ]}
                                        onPress={() => setSelectedShiftType(type)}
                                    >
                                        <ThemedText style={[
                                            styles.shiftTypeOptionText,
                                            selectedShiftType === type && styles.selectedShiftTypeText
                                        ]}>
                                            {type}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.timeInputContainer}>
                                <View style={styles.timeInput}>
                                    <ThemedText style={styles.inputLabel}>Start Time:</ThemedText>
                                    <TextInput
                                        style={styles.input}
                                        value={startTime}
                                        onChangeText={setStartTime}
                                        placeholder="HH:MM"
                                    />
                                </View>
                                <View style={styles.timeInput}>
                                    <ThemedText style={styles.inputLabel}>End Time:</ThemedText>
                                    <TextInput
                                        style={styles.input}
                                        value={endTime}
                                        onChangeText={setEndTime}
                                        placeholder="HH:MM"
                                    />
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={closeAddShiftModal}
                                >
                                    <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={saveShift}
                                >
                                    <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )}
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
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        flex: 1,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 8,
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
    employeesContainer: {
        gap: 15,
    },
    employeeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    employeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    profilePicture: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    employeeDetails: {
        flex: 1,
    },
    employeeName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    employeePosition: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 2,
    },
    employeeDepartment: {
        fontSize: 12,
        color: '#94a3b8',
    },
    addShiftButton: {
        padding: 8,
    },
    shiftsContainer: {
        gap: 8,
    },
    shiftInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
    },
    shiftBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    shiftTypeText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '500',
    },
    noShiftContainer: {
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    noShiftText: {
        fontSize: 14,
        color: '#64748b',
        fontStyle: 'italic',
    },
    modalContent: {
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 20,
        textAlign: 'center',
        color: '#000000',
        opacity: 0.8,
    },
    shiftTypeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    shiftTypeOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    shiftTypeOptionText: {
        fontSize: 14,
        color: '#1e293b',
    },
    selectedShiftTypeText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    timeInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeInput: {
        flex: 1,
        marginHorizontal: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 8,
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
    },
    saveButton: {
        backgroundColor: '#3b82f6',
    },
    cancelButtonText: {
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '600',
    },
    inputLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    deleteButton: {
        padding: 8,
    },
}); 