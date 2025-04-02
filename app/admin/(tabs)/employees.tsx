import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, validatePassword } from '../../../lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const formWidth = Math.min(400, width * 0.9);

type User = {
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
};

export default function AdminEmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    position: '',
    salary: '',
    joining_date: new Date().toISOString().split('T')[0],
    bank_account: '',
    bank_name: ''
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin') // Filter out admin users
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Log the data to check the values
      console.log('Fetched users:', data);

      const processedData = data?.map(user => ({
        ...user,
        email_verified: Boolean(user.email_verified)
      })) || [];

      setEmployees(processedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEmployees();
  }, []);

  const handleConfirmEmployee = async (userId: string) => {
    Alert.alert(
      'Confirm Employee',
      'Are you sure you want to confirm this employee?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({
                  role: 'employee',
                  email_verified: true
                })
                .eq('id', userId);

              if (error) throw error;

              // Refresh the users list
              fetchEmployees();
              Alert.alert('Success', 'Employee confirmed successfully');
            } catch (error) {
              console.error('Error confirming employee:', error);
              Alert.alert('Error', 'Failed to confirm employee');
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setSelectedEmployee(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      position: '',
      salary: '',
      joining_date: new Date().toISOString().split('T')[0],
      bank_account: '',
      bank_name: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (employee: User) => {
    setSelectedEmployee(employee);
    setFormData({
      email: employee.email || '',
      name: employee.full_name || '',
      password: '',
      position: employee.position || '',
      salary: employee.salary?.toString() || '',
      joining_date: employee.joining_date || new Date().toISOString().split('T')[0],
      bank_account: employee.bank_account || '',
      bank_name: employee.bank_name || ''
    });
    setModalVisible(true);
  };

  const openDetailsModal = (employee: User) => {
    setSelectedEmployee(employee);
    setDetailsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!formData.name || !formData.position || !formData.salary || !formData.joining_date) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      if (selectedEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: formData.name,
            position: formData.position,
            salary: parseFloat(formData.salary),
            joining_date: formData.joining_date,
            bank_account: formData.bank_account,
            bank_name: formData.bank_name
          })
          .eq('id', selectedEmployee.id);

        if (updateError) throw updateError;

        Alert.alert('Success', 'Employee updated successfully');
      } else {
        // Add new employee
        if (!formData.email || !formData.password) {
          Alert.alert('Error', 'Please fill in all required fields');
          return;
        }

        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          Alert.alert('Error', passwordValidation.message);
          return;
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('email', formData.email)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingUser) {
          Alert.alert('Error', 'An employee with this email already exists');
          return;
        }

        // First, sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              role: 'employee'
            }
          }
        });

        if (authError) throw authError;

        if (!authData.user?.id) {
          throw new Error('Failed to get user ID from auth response');
        }

        // Create user profile in users table with employee details
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              full_name: formData.name,
              email_verified: true,
              role: 'employee',
              position: formData.position,
              salary: parseFloat(formData.salary),
              joining_date: formData.joining_date,
              bank_account: formData.bank_account,
              bank_name: formData.bank_name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;

        Alert.alert('Success', 'Employee added successfully');
      }

      setModalVisible(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employee: User) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${employee.full_name || 'this employee'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Delete user record
              const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', employee.id);

              if (deleteError) throw deleteError;

              Alert.alert('Success', 'Employee deleted successfully');
              fetchEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleEmailVerification = async (userId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Unverify Email' : 'Verify Email',
      `Are you sure you want to ${currentStatus ? 'unverify' : 'verify'} this user's email?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: currentStatus ? 'Unverify' : 'Verify',
          style: currentStatus ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({
                  email_verified: !currentStatus
                })
                .eq('id', userId);

              if (error) throw error;

              fetchEmployees();
              Alert.alert('Success', `Email ${currentStatus ? 'unverified' : 'verified'} successfully`);
            } catch (error) {
              console.error('Error updating email verification:', error);
              Alert.alert('Error', 'Failed to update email verification status');
            }
          },
        },
      ]
    );
  };

  const renderEmployeeItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => openDetailsModal(item)}
    >
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <ThemedText style={styles.userName}>{item.full_name}</ThemedText>
          <View style={styles.headerActions}>
            {item.role !== 'employee' && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmEmployee(item.id)}
              >
                <ThemedText style={styles.confirmButtonText}>Confirm as Employee</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                { backgroundColor: item.email_verified ? '#22c55e' : '#ef4444' }
              ]}
              onPress={() => handleToggleEmailVerification(item.id, item.email_verified)}
            >
              <ThemedText style={styles.statusText}>
                {item.email_verified ? 'Verified' : 'Unverified'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
        <ThemedText style={styles.userRole}>Role: {item.role}</ThemedText>
        {item.role === 'employee' && (
          <ThemedText style={styles.userPosition}>Position: {item.position || 'Not set'}</ThemedText>
        )}
        <ThemedText style={styles.userDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => {
    if (!selectedEmployee) return null;

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
              <ThemedText style={styles.modalTitle}>Employee Details</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#93c5fd" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsContainer}>
              <View style={styles.detailsSection}>
                <ThemedText style={styles.detailsSectionTitle}>Basic Information</ThemedText>
                <View style={styles.detailsRow}>
                  <ThemedText style={styles.detailsLabel}>Name:</ThemedText>
                  <ThemedText style={styles.detailsValue}>{selectedEmployee.full_name}</ThemedText>
                </View>
                <View style={styles.detailsRow}>
                  <ThemedText style={styles.detailsLabel}>Email:</ThemedText>
                  <ThemedText style={styles.detailsValue}>{selectedEmployee.email}</ThemedText>
                </View>
                <View style={styles.detailsRow}>
                  <ThemedText style={styles.detailsLabel}>Role:</ThemedText>
                  <ThemedText style={styles.detailsValue}>{selectedEmployee.role}</ThemedText>
                </View>
                <View style={styles.detailsRow}>
                  <ThemedText style={styles.detailsLabel}>Email Verified:</ThemedText>
                  <ThemedText style={[
                    styles.detailsValue,
                    { color: selectedEmployee.email_verified ? '#22c55e' : '#ef4444' }
                  ]}>
                    {selectedEmployee.email_verified ? 'Yes' : 'No'}
                  </ThemedText>
                </View>
                <View style={styles.detailsRow}>
                  <ThemedText style={styles.detailsLabel}>Joined:</ThemedText>
                  <ThemedText style={styles.detailsValue}>
                    {new Date(selectedEmployee.created_at).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>

              {selectedEmployee.role === 'employee' && (
                <View style={styles.detailsSection}>
                  <ThemedText style={styles.detailsSectionTitle}>Employment Details</ThemedText>
                  <View style={styles.detailsRow}>
                    <ThemedText style={styles.detailsLabel}>Position:</ThemedText>
                    <ThemedText style={styles.detailsValue}>{selectedEmployee.position || 'Not set'}</ThemedText>
                  </View>
                  <View style={styles.detailsRow}>
                    <ThemedText style={styles.detailsLabel}>Salary:</ThemedText>
                    <ThemedText style={styles.detailsValue}>SAR {selectedEmployee.salary?.toFixed(2) || '0.00'}</ThemedText>
                  </View>
                  <View style={styles.detailsRow}>
                    <ThemedText style={styles.detailsLabel}>Joining Date:</ThemedText>
                    <ThemedText style={styles.detailsValue}>
                      {selectedEmployee.joining_date ? new Date(selectedEmployee.joining_date).toLocaleDateString() : 'Not set'}
                    </ThemedText>
                  </View>
                </View>
              )}

              {selectedEmployee.role === 'employee' && (
                <View style={styles.detailsSection}>
                  <ThemedText style={styles.detailsSectionTitle}>Bank Details</ThemedText>
                  <View style={styles.detailsRow}>
                    <ThemedText style={styles.detailsLabel}>Bank Account:</ThemedText>
                    <ThemedText style={styles.detailsValue}>{selectedEmployee.bank_account || 'Not set'}</ThemedText>
                  </View>
                  <View style={styles.detailsRow}>
                    <ThemedText style={styles.detailsLabel}>Bank Name:</ThemedText>
                    <ThemedText style={styles.detailsValue}>{selectedEmployee.bank_name || 'Not set'}</ThemedText>
                  </View>
                </View>
              )}

              <View style={styles.detailsActions}>
                {selectedEmployee.role === 'user' && (
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleConfirmEmployee(selectedEmployee.id);
                    }}
                  >
                    <ThemedText style={styles.confirmButtonText}>Confirm as Employee</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    openEditModal(selectedEmployee);
                  }}
                >
                  <ThemedText style={styles.editButtonText}>Edit Details</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    handleDelete(selectedEmployee);
                  }}
                >
                  <ThemedText style={styles.deleteButtonText}>Delete Employee</ThemedText>
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
        <ThemedText style={styles.title}>Employees</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <Ionicons name="add-circle" size={24} color="#93c5fd" />
          <ThemedText style={styles.addButtonText}>Add Employee</ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={employees}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No employees found</ThemedText>
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
                {selectedEmployee ? 'Edit Employee' : 'Add Employee'}
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#93c5fd" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              {!selectedEmployee && (
                <>
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Email *</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={text => setFormData({ ...formData, email: text })}
                      placeholder="Enter email"
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Password *</ThemedText>
                    <TextInput
                      style={styles.input}
                      value={formData.password}
                      onChangeText={text => setFormData({ ...formData, password: text })}
                      placeholder="Enter password"
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      secureTextEntry
                    />
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Full Name *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={text => setFormData({ ...formData, name: text })}
                  placeholder="Enter full name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Position *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.position}
                  onChangeText={text => setFormData({ ...formData, position: text })}
                  placeholder="Enter position"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Salary (SAR) *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.salary}
                  onChangeText={text => setFormData({ ...formData, salary: text })}
                  placeholder="Enter salary"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Joining Date *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.joining_date}
                  onChangeText={text => setFormData({ ...formData, joining_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Bank Account</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.bank_account}
                  onChangeText={text => setFormData({ ...formData, bank_account: text })}
                  placeholder="Enter bank account"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Bank Name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.bank_name}
                  onChangeText={text => setFormData({ ...formData, bank_name: text })}
                  placeholder="Enter bank name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <ThemedText style={styles.saveButtonText}>
                  {selectedEmployee ? 'Update Employee' : 'Add Employee'}
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
  userItem: {
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
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  userEmail: {
    color: '#475569',
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  userRole: {
    color: '#64748b',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  userPosition: {
    color: '#64748b',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  userSalary: {
    color: '#64748b',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  userJoiningDate: {
    color: '#64748b',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  userDate: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 6,
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
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.81)',
  },
  editButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 131, 246, 0.77)',
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
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 