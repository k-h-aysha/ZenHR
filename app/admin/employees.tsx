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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, validatePassword } from '../../lib/supabase';
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
  created_at: string;
  role: string;
};

export default function AdminEmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
  });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Log the data to check the values
      console.log('Fetched users:', data);
      
      const processedData = data?.map(user => ({
        ...user,
        email_verified: Boolean(user.email_verified)
      })) || [];
      
      setUsers(processedData);
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
    fetchUsers();
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
              fetchUsers();
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

              // Refresh the users list
              fetchUsers();
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

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(newUser.password);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.message);
      return;
    }

    Alert.alert(
      'Add New Employee',
      'Are you sure you want to add this employee?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add',
          onPress: async () => {
            try {
              setAddingUser(true);

              // Check if user already exists
              const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('email', newUser.email)
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
                email: newUser.email,
                password: newUser.password,
                options: {
                  data: {
                    full_name: newUser.name,
                    role: 'employee'
                  }
                }
              });

              if (authError) throw authError;

              if (!authData.user?.id) {
                throw new Error('Failed to get user ID from auth response');
              }

              // Create user profile in users table
              const { error: insertError } = await supabase
                .from('users')
                .insert([
                  {
                    id: authData.user.id,
                    email: newUser.email,
                    full_name: newUser.name,
                    email_verified: true,
                    role: 'employee',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ]);

              if (insertError) throw insertError;

              // Update the user's role and verification status in auth.users
              const { error: updateError } = await supabase
                .from('auth.users')
                .update({
                  role: 'employee',
                  email_confirmed_at: new Date().toISOString()
                })
                .eq('id', authData.user.id);

              if (updateError) throw updateError;

              Alert.alert('Success', 'Employee added successfully');
              setModalVisible(false);
              setNewUser({ email: '', name: '', password: '' });
              fetchUsers();
            } catch (error) {
              console.error('Error adding user:', error);
              Alert.alert('Error', 'Failed to add employee');
            } finally {
              setAddingUser(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = async (userId: string, userName: string, role: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

              if (error) throw error;

              // Refresh the users list
              fetchUsers();
              Alert.alert('Success', `${role === 'employee' ? 'Employee' : 'User'} deleted successfully`);
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <ThemedText style={styles.userName}>{item.full_name}</ThemedText>
          <View style={styles.headerActions}>
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
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteUser(item.id, item.full_name, item.role)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <ThemedText style={styles.userEmail}>{item.email}</ThemedText>
        <View style={styles.roleContainer}>
          <ThemedText style={styles.userRole}>Role: {item.role}</ThemedText>
          {item.role === 'user' && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleConfirmEmployee(item.id)}
            >
              <ThemedText style={styles.confirmButtonText}>Confirm as Employee</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <ThemedText style={styles.userDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>
    </View>
  );

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
          onPress={() => setModalVisible(true)}
            >
          <Ionicons name="add-circle" size={24} color="#93c5fd" />
          <ThemedText style={styles.addButtonText}>Add Employee</ThemedText>
            </TouchableOpacity>
          </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
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
              <ThemedText style={styles.modalTitle}>Add New Employee</ThemedText>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#93c5fd" />
              </TouchableOpacity>
                  </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={newUser.name}
                onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                autoCapitalize="words"
              />
                  </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={newUser.email}
                onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
                </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                secureTextEntry
              />
                </View>

            <TouchableOpacity
              style={[styles.submitButton, addingUser && styles.submitButtonDisabled]}
              onPress={handleAddUser}
              disabled={addingUser}
            >
              {addingUser ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <ThemedText style={styles.submitButtonText}>Add Employee</ThemedText>
              )}
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
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
  inputContainer: {
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
  submitButton: {
    backgroundColor: '#93c5fd',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
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
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
}); 