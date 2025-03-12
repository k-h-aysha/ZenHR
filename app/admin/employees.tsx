import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock data for employees
const mockEmployees = [
  { id: '1', name: 'John Doe', role: 'Software Engineer', department: 'Engineering', status: 'active' },
  { id: '2', name: 'Sarah Smith', role: 'Marketing Manager', department: 'Marketing', status: 'active' },
  { id: '3', name: 'Mike Johnson', role: 'HR Specialist', department: 'Human Resources', status: 'on leave' },
  { id: '4', name: 'Emily Brown', role: 'Product Designer', department: 'Design', status: 'active' },
  { id: '5', name: 'David Wilson', role: 'Sales Executive', department: 'Sales', status: 'active' },
];

export default function EmployeesScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = mockEmployees.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEmployeePress = (employeeId: string) => {
    router.push(`/admin/employee/${employeeId}`);
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
            <ThemedText style={styles.headerTitle}>Employees</ThemedText>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/admin/employee/new')}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Employee List */}
          <View style={styles.employeeList}>
            {filteredEmployees.map(employee => (
              <TouchableOpacity
                key={employee.id}
                style={styles.employeeCard}
                onPress={() => handleEmployeePress(employee.id)}
              >
                <View style={styles.employeeInfo}>
                  <View style={styles.avatarContainer}>
                    <ThemedText style={styles.avatarText}>
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </ThemedText>
                  </View>
                  <View style={styles.employeeDetails}>
                    <ThemedText style={styles.employeeName}>{employee.name}</ThemedText>
                    <ThemedText style={styles.employeeRole}>{employee.role}</ThemedText>
                    <ThemedText style={styles.employeeDepartment}>{employee.department}</ThemedText>
                  </View>
                </View>
                <View style={styles.employeeStatus}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: employee.status === 'active' ? '#4ade80' : '#fbbf24' }
                  ]} />
                  <ThemedText style={styles.statusText}>
                    {employee.status === 'active' ? 'Active' : 'On Leave'}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#ffffff',
    fontSize: 16,
  },
  employeeList: {
    gap: 12,
  },
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(147, 197, 253, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#93c5fd',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#64748b',
  },
  employeeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#94a3b8',
  },
}); 