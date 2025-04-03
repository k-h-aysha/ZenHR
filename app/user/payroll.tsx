import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, FlatList, RefreshControl, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth/AuthContext';
import { format, parseISO } from 'date-fns';

const { width, height } = Dimensions.get('window');

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
  created_at: string;
}

export default function UserPayrollScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchPayrollRecords();
  }, [user]);

  useEffect(() => {
    if (payrollRecords.length > 0) {
      filterRecordsByYear(selectedYear);
    }
  }, [selectedYear, payrollRecords]);

  const fetchPayrollRecords = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Fetching payroll records for user ID:', user.id);
      
      // Convert user.id to string to match with user_id if needed
      const userIdString = String(user.id);
      
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.eq.${userIdString}`)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
        
      if (error) {
        console.error('Error fetching payroll records:', error);
        return;
      }
      
      console.log(`Found ${data?.length || 0} payroll records`);
      
      if (data && data.length > 0) {
        setPayrollRecords(data);
        
        // Extract available years from the data
        const years = [...new Set(data.map(record => record.year))];
        setAvailableYears(years.sort((a, b) => b - a)); // Sort years in descending order
        
        // Set the default selected year to the most recent
        if (years.length > 0) {
          setSelectedYear(Math.max(...years));
        }
        
        // Filter records by the selected year
        filterRecordsByYear(selectedYear);
      } else {
        setPayrollRecords([]);
        setFilteredRecords([]);
      }
    } catch (error) {
      console.error('Exception fetching payroll records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRecordsByYear = (year: number) => {
    const filtered = payrollRecords.filter(record => record.year === year);
    setFilteredRecords(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayrollRecords();
  };

  const openDetailsModal = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setDetailsModalVisible(true);
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const renderPayrollItem = ({ item }: { item: PayrollRecord }) => (
    <TouchableOpacity
      style={styles.payrollCard}
      onPress={() => openDetailsModal(item)}
      activeOpacity={0.8}
    >
      <View style={styles.payrollHeader}>
        <View style={styles.payPeriod}>
          <ThemedText style={styles.monthText}>
            {getMonthName(item.month)}
          </ThemedText>
          <ThemedText style={styles.yearText}>
            {item.year}
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
      
      <View style={styles.salaryPreview}>
        <ThemedText style={styles.salaryAmount}>
          {formatCurrency(item.net_salary)}
        </ThemedText>
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#94a3b8" 
          style={styles.arrowIcon} 
        />
      </View>
    </TouchableOpacity>
  );

  const changeYear = (direction: 'prev' | 'next') => {
    const currentIndex = availableYears.indexOf(selectedYear);
    if (direction === 'prev' && currentIndex < availableYears.length - 1) {
      // Go to previous year (older)
      setSelectedYear(availableYears[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      // Go to next year (newer)
      setSelectedYear(availableYears[currentIndex - 1]);
    }
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    const paymentDate = selectedRecord.payment_date 
      ? format(parseISO(selectedRecord.payment_date), 'MMM d, yyyy')
      : 'Pending';

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
              <ThemedText style={styles.modalTitle}>Salary Details</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#93c5fd" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalSection}>
                <ThemedText style={styles.sectionTitle}>Payment Information</ThemedText>
                
                <View style={styles.paymentPeriodRow}>
                  <View style={styles.periodBadge}>
                    <ThemedText style={styles.periodText}>
                      {getMonthName(selectedRecord.month)} {selectedRecord.year}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: selectedRecord.status === 'paid' ? '#22c55e' : '#f59e0b' }
                  ]}>
                    <ThemedText style={styles.statusText}>
                      {selectedRecord.status === 'paid' ? 'Paid' : 'Pending'}
                    </ThemedText>
                  </View>
                </View>
                
                {selectedRecord.status === 'paid' && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="calendar" size={20} color="#3b82f6" />
                    </View>
                    <ThemedText style={styles.infoLabel}>Payment Date:</ThemedText>
                    <ThemedText style={styles.infoValue}>{paymentDate}</ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.modalSection}>
                <ThemedText style={styles.sectionTitle}>Salary Breakdown</ThemedText>
                
                <View style={styles.salaryRow}>
                  <View style={styles.infoIconContainer}>
                    <MaterialIcons name="payments" size={20} color="#3b82f6" />
                  </View>
                  <ThemedText style={styles.infoLabel}>Basic Salary:</ThemedText>
                  <ThemedText style={styles.infoValue}>{formatCurrency(selectedRecord.basic_salary)}</ThemedText>
                </View>
                
                <View style={styles.salaryRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="add-circle" size={20} color="#22c55e" />
                  </View>
                  <ThemedText style={styles.infoLabel}>Allowances:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: '#22c55e' }]}>
                    +{formatCurrency(selectedRecord.allowances)}
                  </ThemedText>
                </View>
                
                <View style={styles.salaryRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="remove-circle" size={20} color="#ef4444" />
                  </View>
                  <ThemedText style={styles.infoLabel}>Deductions:</ThemedText>
                  <ThemedText style={[styles.infoValue, { color: '#ef4444' }]}>
                    -{formatCurrency(selectedRecord.deductions)}
                  </ThemedText>
                </View>
                
                <View style={styles.totalRow}>
                  <ThemedText style={styles.totalLabel}>Net Salary:</ThemedText>
                  <ThemedText style={styles.totalValue}>
                    {formatCurrency(selectedRecord.net_salary)}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.modalSection}>
                <ThemedText style={styles.sectionTitle}>Reference Information</ThemedText>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="receipt" size={20} color="#3b82f6" />
                  </View>
                  <ThemedText style={styles.infoLabel}>Payment ID:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {selectedRecord.id.substring(0, 8)}...
                  </ThemedText>
                </View>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="time" size={20} color="#3b82f6" />
                  </View>
                  <ThemedText style={styles.infoLabel}>Created Date:</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {format(parseISO(selectedRecord.created_at), 'MMM d, yyyy')}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderYearSelector = () => {
    if (availableYears.length === 0) return null;
    
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={yearPickerVisible}
        onRequestClose={() => setYearPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.yearPickerOverlay}
          activeOpacity={1}
          onPress={() => setYearPickerVisible(false)}
        >
          <View style={styles.yearPickerContainer}>
            <FlatList
              data={availableYears}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.yearOption,
                    selectedYear === item && styles.selectedYearOption
                  ]}
                  onPress={() => {
                    setSelectedYear(item);
                    setYearPickerVisible(false);
                  }}
                >
                  <ThemedText style={[
                    styles.yearOptionText,
                    selectedYear === item && styles.selectedYearOptionText
                  ]}>
                    {item}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading && !payrollRecords.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <ThemedText style={styles.loadingText}>Loading payroll history...</ThemedText>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#2563eb']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Payroll History</ThemedText>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryIcon}>
          <Ionicons name="wallet-outline" size={28} color="#ffffff" />
        </View>
        <View style={styles.yearNavigator}>
          <TouchableOpacity 
            style={[
              styles.yearNavButton,
              availableYears.indexOf(selectedYear) >= availableYears.length - 1 && styles.yearNavButtonDisabled
            ]}
            onPress={() => changeYear('prev')}
            disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
          >
            <Ionicons name="chevron-back" size={18} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.yearSelectorButton}
            onPress={() => setYearPickerVisible(true)}
          >
            <ThemedText style={styles.yearSelectorText}>{selectedYear}</ThemedText>
            <Ionicons name="chevron-down" size={18} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.yearNavButton,
              availableYears.indexOf(selectedYear) <= 0 && styles.yearNavButtonDisabled
            ]}
            onPress={() => changeYear('next')}
            disabled={availableYears.indexOf(selectedYear) <= 0}
          >
            <Ionicons name="chevron-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {payrollRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="payments" size={80} color="#64748b" />
          <ThemedText style={styles.emptyText}>No payroll records found</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Your salary information will appear here once processed
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderPayrollItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#93c5fd']}
              tintColor="#ffffff"
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText style={styles.sectionTitle}>
                {filteredRecords.length > 0 
                  ? `${filteredRecords.length} Payment${filteredRecords.length !== 1 ? 's' : ''}`
                  : 'No payments found'}
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="payments" size={80} color="#64748b" />
              <ThemedText style={styles.emptyText}>No records for {selectedYear}</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Try selecting a different year
              </ThemedText>
            </View>
          }
        />
      )}

      {renderDetailsModal()}
      {renderYearSelector()}
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
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  yearNavigator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  yearSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  yearSelectorText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  yearNavButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearNavButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    opacity: 0.6,
  },
  listHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  payrollCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  payrollHeader: {
    flex: 1,
  },
  payPeriod: {
    marginBottom: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  yearText: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  salaryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalBody: {
    maxHeight: height * 0.7,
    paddingBottom: 16,
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  paymentPeriodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
  },
  periodBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  periodText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    padding: 10,
    borderRadius: 8,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  yearPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  yearPickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: width * 0.6,
    maxHeight: 300,
  },
  yearOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedYearOption: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
  },
  selectedYearOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});