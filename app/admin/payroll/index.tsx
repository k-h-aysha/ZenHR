import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, TextInput, Alert, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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

interface PayrollRecord {
    id: string;
    user_id: string;
    month: number;
    year: number;
    basic_salary: number;
    allowances: number;
    deductions: number;
    net_salary: number;
    status: 'pending' | 'paid';
    payment_date: string | null;
    user?: User;
}

export default function PayrollScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [employees, setEmployees] = useState<User[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
    const [allowances, setAllowances] = useState<string>('');
    const [deductions, setDeductions] = useState<string>('');
    const [showYearSelector, setShowYearSelector] = useState(false);

    useEffect(() => {
        fetchEmployees();
        fetchPayrollRecords();
    }, [selectedMonth, selectedYear]);

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

    const fetchPayrollRecords = async () => {
        try {
            const { data, error } = await supabase
                .from('payroll_records')
                .select(`
                    *,
                    user:users!payroll_records_user_id_fkey(*)
                `)
                .eq('month', selectedMonth)
                .eq('year', selectedYear)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayrollRecords(data || []);
        } catch (error) {
            console.error('Error fetching payroll records:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePayroll = async () => {
        try {
            setLoading(true);

            // Get the current user's ID from the auth session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get the current user's ID from the users table
            const { data: currentUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single();

            if (userError || !currentUser) {
                console.error('Error fetching current user:', userError);
                throw new Error('Could not find current user in users table');
            }

            // First, get existing payroll records for the selected month and year
            const { data: existingRecords, error: existingError } = await supabase
                .from('payroll_records')
                .select('user_id')
                .eq('month', selectedMonth)
                .eq('year', selectedYear);

            if (existingError) throw existingError;

            // Create a set of user IDs that already have records
            const existingUserIds = new Set(existingRecords?.map(record => record.user_id) || []);

            // Filter out employees that already have records
            const employeesToProcess = employees.filter(employee => !existingUserIds.has(employee.id));

            if (employeesToProcess.length === 0) {
                Alert.alert('Info', 'Payroll records already exist for all employees for this period.');
                return;
            }

            // Create payroll records only for employees without existing records
            const newRecords = employeesToProcess.map(employee => ({
                user_id: employee.id,
                month: selectedMonth,
                year: selectedYear,
                basic_salary: employee.salary || 0,
                allowances: 0,
                deductions: 0,
                net_salary: employee.salary || 0,
                status: 'pending' as const,
                created_by: currentUser.id
            }));

            const { error } = await supabase
                .from('payroll_records')
                .insert(newRecords);

            if (error) throw error;
            
            Alert.alert('Success', `Generated ${newRecords.length} new payroll records.`);
            await fetchPayrollRecords();
        } catch (error) {
            console.error('Error generating payroll:', error);
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate payroll records');
        } finally {
            setLoading(false);
        }
    };

    const processPayment = async (recordId: string) => {
        Alert.alert(
            "Confirm Payment",
            "Are you sure you want to process this payment?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('payroll_records')
                                .update({
                                    status: 'paid',
                                    payment_date: new Date().toISOString()
                                })
                                .eq('id', recordId);

                            if (error) throw error;
                            await fetchPayrollRecords();
                        } catch (error) {
                            console.error('Error processing payment:', error);
                            Alert.alert("Error", "Failed to process payment. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (record: PayrollRecord) => {
        setEditingRecord(record);
        setAllowances(record.allowances.toString());
        setDeductions(record.deductions.toString());
    };

    const closeEditModal = () => {
        setEditingRecord(null);
        setAllowances('');
        setDeductions('');
    };

    const saveEdits = async () => {
        if (!editingRecord) return;

        try {
            const newAllowances = parseFloat(allowances) || 0;
            const newDeductions = parseFloat(deductions) || 0;
            const newNetSalary = editingRecord.basic_salary + newAllowances - newDeductions;

            const { error } = await supabase
                .from('payroll_records')
                .update({
                    allowances: newAllowances,
                    deductions: newDeductions,
                    net_salary: newNetSalary
                })
                .eq('id', editingRecord.id);

            if (error) throw error;

            await fetchPayrollRecords();
            closeEditModal();
        } catch (error) {
            console.error('Error updating payroll record:', error);
            Alert.alert("Error", "Failed to update payroll record. Please try again.");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchEmployees(),
                fetchPayrollRecords()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        // Generate years from 5 years ago to 5 years in the future
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            years.push(i);
        }
        return years;
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
                        <ThemedText style={styles.headerTitle}>Payroll Management</ThemedText>
                    </View>
                    <View style={styles.dateSelector}>
                        <View style={styles.monthSelector}>
                            <TouchableOpacity
                                style={styles.monthButton}
                                onPress={() => {
                                    if (selectedMonth === 1) {
                                        setSelectedMonth(12);
                                        setSelectedYear(selectedYear - 1);
                                    } else {
                                        setSelectedMonth(selectedMonth - 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-back" size={24} color="#ffffff" />
                            </TouchableOpacity>
                            <ThemedText style={styles.monthText}>
                                {getMonthName(selectedMonth)}
                            </ThemedText>
                            <TouchableOpacity
                                style={styles.monthButton}
                                onPress={() => {
                                    if (selectedMonth === 12) {
                                        setSelectedMonth(1);
                                        setSelectedYear(selectedYear + 1);
                                    } else {
                                        setSelectedMonth(selectedMonth + 1);
                                    }
                                }}
                            >
                                <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.yearSelector}
                            onPress={() => setShowYearSelector(!showYearSelector)}
                        >
                            <ThemedText style={styles.yearText}>{selectedYear}</ThemedText>
                            <Ionicons name="chevron-down" size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>

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
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={generatePayroll}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
                            <ThemedText style={styles.generateButtonText}>
                                Generate Payroll
                            </ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.recordsContainer}>
                        {payrollRecords.map((record) => {
                            const employee = record.user;
                            if (!employee) return null;

                            return (
                                <View key={record.id} style={styles.recordCard}>
                                    <View style={styles.employeeInfo}>
                                        <Image
                                            source={{ uri: employee.avatar_url || 'https://via.placeholder.com/50' }}
                                            style={styles.profilePicture}
                                        />
                                        <View style={styles.employeeDetails}>
                                            <ThemedText style={styles.employeeName}>
                                                {employee.full_name}
                                            </ThemedText>
                                            <ThemedText style={styles.employeePosition}>
                                                {employee.position || 'No position'}
                                            </ThemedText>
                                            <ThemedText style={styles.joiningDate}>
                                                Joined: {employee.join_date ? new Date(employee.join_date).getFullYear() : 'N/A'}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    <View style={styles.salaryInfo}>
                                        <View style={styles.salaryRow}>
                                            <ThemedText style={styles.salaryLabel}>Basic Salary:</ThemedText>
                                            <ThemedText style={styles.salaryValue}>
                                                {formatCurrency(record.basic_salary)}
                                            </ThemedText>
                                        </View>
                                        <View style={styles.salaryRow}>
                                            <ThemedText style={styles.salaryLabel}>Allowances:</ThemedText>
                                            <ThemedText style={styles.salaryValue}>
                                                {formatCurrency(record.allowances)}
                                            </ThemedText>
                                            {record.status === 'pending' && (
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => openEditModal(record)}
                                                >
                                                    <Ionicons name="pencil" size={16} color="#3b82f6" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <View style={styles.salaryRow}>
                                            <ThemedText style={styles.salaryLabel}>Deductions:</ThemedText>
                                            <ThemedText style={styles.salaryValue}>
                                                {formatCurrency(record.deductions)}
                                            </ThemedText>
                                            {record.status === 'pending' && (
                                                <TouchableOpacity
                                                    style={styles.editButton}
                                                    onPress={() => openEditModal(record)}
                                                >
                                                    <Ionicons name="pencil" size={16} color="#3b82f6" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <View style={[styles.salaryRow, styles.netSalaryRow]}>
                                            <ThemedText style={styles.netSalaryLabel}>Net Salary:</ThemedText>
                                            <ThemedText style={styles.netSalaryValue}>
                                                {formatCurrency(record.net_salary)}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    <View style={styles.statusContainer}>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: record.status === 'paid' ? '#22c55e' : '#f59e0b' }
                                        ]}>
                                            <ThemedText style={styles.statusText}>
                                                {record.status === 'paid' ? 'Paid' : 'Pending'}
                                            </ThemedText>
                                        </View>
                                        {record.status === 'pending' && (
                                            <TouchableOpacity
                                                style={styles.payButton}
                                                onPress={() => processPayment(record.id)}
                                            >
                                                <Ionicons name="cash" size={20} color="#ffffff" />
                                                <ThemedText style={styles.payButtonText}>Process Payment</ThemedText>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>

                {showYearSelector && (
                    <View style={styles.yearDropdown}>
                        <ScrollView style={styles.yearScrollView}>
                            {getYearOptions().map((year) => (
                                <TouchableOpacity
                                    key={year}
                                    style={[
                                        styles.yearOption,
                                        selectedYear === year && styles.selectedYearOption
                                    ]}
                                    onPress={() => {
                                        setSelectedYear(year);
                                        setShowYearSelector(false);
                                    }}
                                >
                                    <ThemedText style={[
                                        styles.yearOptionText,
                                        selectedYear === year && styles.selectedYearOptionText
                                    ]}>
                                        {year}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </LinearGradient>

            {/* Edit Modal */}
            {editingRecord && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Edit Payroll Record</ThemedText>

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.inputLabel}>Allowances:</ThemedText>
                            <TextInput
                                style={styles.input}
                                value={allowances}
                                onChangeText={setAllowances}
                                keyboardType="numeric"
                                placeholder="Enter allowances"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.inputLabel}>Deductions:</ThemedText>
                            <TextInput
                                style={styles.input}
                                value={deductions}
                                onChangeText={setDeductions}
                                keyboardType="numeric"
                                placeholder="Enter deductions"
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={closeEditModal}
                            >
                                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveEdits}
                            >
                                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
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
        gap: 10,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 8,
    },
    monthButton: {
        padding: 8,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginHorizontal: 20,
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 8,
        paddingHorizontal: 12,
    },
    yearText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginRight: 4,
    },
    content: {
        flex: 1,
        padding: 20,
        paddingBottom: 40,
    },
    actionsContainer: {
        marginBottom: 20,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        padding: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    generateButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    recordsContainer: {
        gap: 15,
    },
    recordCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
    joiningDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    salaryInfo: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
    },
    salaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    netSalaryRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    salaryLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    salaryValue: {
        fontSize: 14,
        color: '#1e293b',
        fontWeight: '500',
    },
    netSalaryLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    netSalaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3b82f6',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    payButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    editButton: {
        marginLeft: 8,
        padding: 4,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 8,
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
    yearDropdown: {
        position: 'absolute',
        top: 100,
        left: '50%',
        transform: [{ translateX: -100 }],
        width: 200,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
        maxHeight: 200,
    },
    yearScrollView: {
        maxHeight: 180,
    },
    yearOption: {
        padding: 12,
        borderRadius: 8,
    },
    selectedYearOption: {
        backgroundColor: '#3b82f6',
    },
    yearOptionText: {
        fontSize: 16,
        color: '#1e293b',
        textAlign: 'center',
    },
    selectedYearOptionText: {
        color: '#ffffff',
        fontWeight: '600',
    },
}); 