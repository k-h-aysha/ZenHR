import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, Modal, FlatList, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const formWidth = Math.min(400, width * 0.9);

interface User {
    id: string;
    email: string;
    full_name: string;
    email_verified: boolean;
    role: string;
    avatar_url?: string;
    position?: string;
    salary?: number;
    joining_date?: string;
    bank_account?: string;
    bank_name?: string;
    created_at: string;
    updated_at: string;
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

export default function PayrollRecordsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [employees, setEmployees] = useState<User[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
    const [formData, setFormData] = useState<{
        user_id: string;
        month: number;
        year: number;
        basic_salary: string;
        allowances: string;
        deductions: string;
        status: 'pending' | 'paid';
    }>({
        user_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        basic_salary: '',
        allowances: '0',
        deductions: '0',
        status: 'pending'
    });

    useEffect(() => {
        fetchEmployees();
        fetchPayrollRecords();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'employee')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            Alert.alert('Error', 'Failed to fetch employees');
        }
    };

    const fetchPayrollRecords = async () => {
        try {
            const { data, error } = await supabase
                .from('payroll_records')
                .select(`
                    *,
                    user:user_id (
                        id,
                        full_name,
                        email,
                        position,
                        salary,
                        avatar_url
                    )
                `)
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (error) throw error;
            setPayrollRecords(data || []);
        } catch (error) {
            console.error('Error fetching payroll records:', error);
            Alert.alert('Error', 'Failed to fetch payroll records');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchPayrollRecords();
    }, []);

    const openAddModal = () => {
        setSelectedRecord(null);
        setFormData({
            user_id: employees[0]?.id || '',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            basic_salary: '',
            allowances: '0',
            deductions: '0',
            status: 'pending'
        });
        setModalVisible(true);
    };

    const openEditModal = (record: PayrollRecord) => {
        setSelectedRecord(record);
        setFormData({
            user_id: record.user_id,
            month: record.month,
            year: record.year,
            basic_salary: record.basic_salary.toString(),
            allowances: record.allowances.toString(),
            deductions: record.deductions.toString(),
            status: record.status
        });
        setModalVisible(true);
    };

    const openDetailsModal = (record: PayrollRecord) => {
        setSelectedRecord(record);
        setDetailsModalVisible(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            if (!formData.user_id || !formData.basic_salary) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            // Validate status
            if (formData.status !== 'pending' && formData.status !== 'paid') {
                Alert.alert('Error', 'Invalid status value');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const netSalary = parseFloat(formData.basic_salary) +
                parseFloat(formData.allowances) -
                parseFloat(formData.deductions);

            if (selectedRecord) {
                // Update existing record
                const { error } = await supabase
                    .from('payroll_records')
                    .update({
                        basic_salary: parseFloat(formData.basic_salary),
                        allowances: parseFloat(formData.allowances),
                        deductions: parseFloat(formData.deductions),
                        net_salary: netSalary,
                        status: formData.status,
                        payment_date: formData.status === 'paid' ? new Date().toISOString() : null
                    })
                    .eq('id', selectedRecord.id);

                if (error) throw error;
                Alert.alert('Success', 'Payroll record updated successfully');
            } else {
                // Add new record
                const { error } = await supabase
                    .from('payroll_records')
                    .insert({
                        user_id: formData.user_id,
                        month: formData.month,
                        year: formData.year,
                        basic_salary: parseFloat(formData.basic_salary),
                        allowances: parseFloat(formData.allowances),
                        deductions: parseFloat(formData.deductions),
                        net_salary: netSalary,
                        status: formData.status,
                        payment_date: formData.status === 'paid' ? new Date().toISOString() : null,
                        created_by: user.id
                    });

                if (error) throw error;
                Alert.alert('Success', 'Payroll record added successfully');
            }

            setModalVisible(false);
            fetchPayrollRecords();
        } catch (error) {
            console.error('Error saving payroll record:', error);
            Alert.alert('Error', 'Failed to save payroll record');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (record: PayrollRecord) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete this payroll record?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from('payroll_records')
                                .delete()
                                .eq('id', record.id);

                            if (error) throw error;
                            Alert.alert('Success', 'Payroll record deleted successfully');
                            fetchPayrollRecords();
                        } catch (error) {
                            console.error('Error deleting payroll record:', error);
                            Alert.alert('Error', 'Failed to delete payroll record');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getMonthName = (month: number) => {
        return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
    };

    const renderPayrollItem = ({ item }: { item: PayrollRecord }) => (
        <TouchableOpacity
            style={styles.payrollCard}
            onPress={() => openDetailsModal(item)}
        >
            <View style={styles.payrollHeader}>
                <View style={styles.employeeInfo}>
                    <ThemedText style={styles.employeeName}>
                        {item.user?.full_name || 'Unknown Employee'}
                    </ThemedText>
                    <ThemedText style={styles.payrollPeriod}>
                        {getMonthName(item.month)} {item.year}
                    </ThemedText>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'paid' ? '#22c55e' : '#f59e0b' }
                ]}>
                    <ThemedText style={styles.statusText}>
                        {item.status === 'paid' ? 'Paid' : 'Pending'}
                    </ThemedText>
                </View>
            </View>
            <View style={styles.payrollDetails}>
                <View style={styles.salaryInfo}>
                    <ThemedText style={styles.salaryLabel}>Basic Salary:</ThemedText>
                    <ThemedText style={styles.salaryValue}>SAR {item.basic_salary.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.salaryInfo}>
                    <ThemedText style={styles.salaryLabel}>Net Salary:</ThemedText>
                    <ThemedText style={styles.salaryValue}>SAR {item.net_salary.toFixed(2)}</ThemedText>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderDetailsModal = () => {
        if (!selectedRecord) return null;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={detailsModalVisible}
                onRequestClose={() => setDetailsModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Payroll Record Details</ThemedText>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setDetailsModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color="#93c5fd" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.detailsContainer}>
                            <View style={styles.detailsSection}>
                                <ThemedText style={styles.detailsSectionTitle}>Employee Information</ThemedText>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Name:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        {selectedRecord.user?.full_name || 'Unknown Employee'}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Position:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        {selectedRecord.user?.position || 'Not set'}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Email:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        {selectedRecord.user?.email || 'Not set'}
                                    </ThemedText>
                                </View>
                            </View>

                            <View style={styles.detailsSection}>
                                <ThemedText style={styles.detailsSectionTitle}>Payroll Information</ThemedText>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Period:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        {getMonthName(selectedRecord.month)} {selectedRecord.year}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Basic Salary:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        SAR {selectedRecord.basic_salary.toFixed(2)}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Allowances:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        SAR {selectedRecord.allowances.toFixed(2)}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Deductions:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        SAR {selectedRecord.deductions.toFixed(2)}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Net Salary:</ThemedText>
                                    <ThemedText style={styles.detailsValue}>
                                        SAR {selectedRecord.net_salary.toFixed(2)}
                                    </ThemedText>
                                </View>
                                <View style={styles.detailsRow}>
                                    <ThemedText style={styles.detailsLabel}>Status:</ThemedText>
                                    <ThemedText style={[
                                        styles.detailsValue,
                                        { color: selectedRecord.status === 'paid' ? '#22c55e' : '#f59e0b' }
                                    ]}>
                                        {selectedRecord.status === 'paid' ? 'Paid' : 'Pending'}
                                    </ThemedText>
                                </View>
                                {selectedRecord.payment_date && (
                                    <View style={styles.detailsRow}>
                                        <ThemedText style={styles.detailsLabel}>Payment Date:</ThemedText>
                                        <ThemedText style={styles.detailsValue}>
                                            {new Date(selectedRecord.payment_date).toLocaleDateString()}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>

                            <View style={styles.detailsActions}>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => {
                                        setDetailsModalVisible(false);
                                        openEditModal(selectedRecord);
                                    }}
                                >
                                    <ThemedText style={styles.editButtonText}>Edit Record</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => {
                                        setDetailsModalVisible(false);
                                        handleDelete(selectedRecord);
                                    }}
                                >
                                    <ThemedText style={styles.deleteButtonText}>Delete Record</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#93c5fd" />
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#0f172a', '#1e3a8a', '#2563eb']}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            <View style={styles.header}>
                <ThemedText style={styles.title}>Payroll Records</ThemedText>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={openAddModal}
                >
                    <Ionicons name="add-circle" size={24} color="#93c5fd" />
                    <ThemedText style={styles.addButtonText}>Add Record</ThemedText>
                </TouchableOpacity>
            </View>

            <FlatList
                data={payrollRecords}
                renderItem={renderPayrollItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={onRefresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <ThemedText style={styles.emptyText}>No payroll records found</ThemedText>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>
                                {selectedRecord ? 'Edit Payroll Record' : 'Add Payroll Record'}
                            </ThemedText>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close" size={24} color="#93c5fd" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form}>
                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Employee *</ThemedText>
                                <View style={styles.selectContainer}>
                                    <ScrollView style={styles.selectScroll}>
                                        {employees.map((employee) => (
                                            <TouchableOpacity
                                                key={employee.id}
                                                style={[
                                                    styles.selectOption,
                                                    formData.user_id === employee.id && styles.selectedOption
                                                ]}
                                                onPress={() => setFormData({ ...formData, user_id: employee.id })}
                                            >
                                                <ThemedText style={[
                                                    styles.selectOptionText,
                                                    formData.user_id === employee.id && styles.selectedOptionText
                                                ]}>
                                                    {employee.full_name}
                                                </ThemedText>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={styles.formRow}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <ThemedText style={styles.label}>Month *</ThemedText>
                                    <View style={styles.selectContainer}>
                                        <ScrollView style={styles.selectScroll}>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                                <TouchableOpacity
                                                    key={month}
                                                    style={[
                                                        styles.selectOption,
                                                        formData.month === month && styles.selectedOption
                                                    ]}
                                                    onPress={() => setFormData({ ...formData, month })}
                                                >
                                                    <ThemedText style={[
                                                        styles.selectOptionText,
                                                        formData.month === month && styles.selectedOptionText
                                                    ]}>
                                                        {getMonthName(month)}
                                                    </ThemedText>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>

                                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                    <ThemedText style={styles.label}>Year *</ThemedText>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.year.toString()}
                                        onChangeText={(text) => {
                                            const year = parseInt(text) || new Date().getFullYear();
                                            setFormData({ ...formData, year });
                                        }}
                                        placeholder="Enter year"
                                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Basic Salary (SAR) *</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    value={formData.basic_salary}
                                    onChangeText={(text) => setFormData({ ...formData, basic_salary: text })}
                                    placeholder="Enter basic salary"
                                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Allowances (SAR)</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    value={formData.allowances}
                                    onChangeText={(text) => setFormData({ ...formData, allowances: text })}
                                    placeholder="Enter allowances"
                                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Deductions (SAR)</ThemedText>
                                <TextInput
                                    style={styles.input}
                                    value={formData.deductions}
                                    onChangeText={(text) => setFormData({ ...formData, deductions: text })}
                                    placeholder="Enter deductions"
                                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <ThemedText style={styles.label}>Status *</ThemedText>
                                <View style={styles.selectContainer}>
                                    <ScrollView style={styles.selectScroll} horizontal>
                                        <TouchableOpacity
                                            style={[
                                                styles.selectOption,
                                                formData.status === 'pending' && styles.selectedOption
                                            ]}
                                            onPress={() => setFormData({ ...formData, status: 'pending' })}
                                        >
                                            <ThemedText style={[
                                                styles.selectOptionText,
                                                formData.status === 'pending' && styles.selectedOptionText
                                            ]}>
                                                Pending
                                            </ThemedText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.selectOption,
                                                formData.status === 'paid' && styles.selectedOption
                                            ]}
                                            onPress={() => setFormData({ ...formData, status: 'paid' })}
                                        >
                                            <ThemedText style={[
                                                styles.selectOptionText,
                                                formData.status === 'paid' && styles.selectedOptionText
                                            ]}>
                                                Paid
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSave}
                            >
                                <ThemedText style={styles.saveButtonText}>
                                    {selectedRecord ? 'Update Record' : 'Add Record'}
                                </ThemedText>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {renderDetailsModal()}
        </LinearGradient>
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
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 197, 253, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(147, 197, 253, 0.3)',
    },
    addButtonText: {
        color: '#93c5fd',
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 80,
    },
    payrollCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    payrollHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        letterSpacing: 0.2,
    },
    payrollPeriod: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    payrollDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    salaryInfo: {
        flex: 1,
    },
    salaryLabel: {
        color: '#64748b',
        fontSize: 13,
        marginBottom: 2,
    },
    salaryValue: {
        color: '#0f172a',
        fontSize: 15,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 20,
        width: formWidth,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    closeButton: {
        padding: 4,
    },
    form: {
        maxHeight: '80%',
    },
    formGroup: {
        marginBottom: 16,
    },
    formRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94a3b8',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        color: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    selectContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        maxHeight: 120,
    },
    selectScroll: {
        maxHeight: 120,
    },
    selectOption: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    selectedOption: {
        backgroundColor: 'rgba(147, 197, 253, 0.2)',
    },
    selectOptionText: {
        color: '#ffffff',
        fontSize: 14,
    },
    selectedOptionText: {
        color: '#93c5fd',
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#93c5fd',
        borderRadius: 6,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    detailsContainer: {
        maxHeight: '80%',
    },
    detailsSection: {
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
    },
    detailsSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#93c5fd',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingBottom: 8,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailsLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#94a3b8',
    },
    detailsValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
        textAlign: 'right',
    },
    detailsActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20,
    },
    editButton: {
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        flex: 1,
        marginRight: 8,
    },
    deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        flex: 1,
        marginLeft: 8,
    },
    editButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
}); 