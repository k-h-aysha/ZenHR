import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TeamPage() {
  const insets = useSafeAreaInsets();

  // Sample team members data
  const [teamMembers] = useState([
    { id: '1', name: 'John Doe', role: 'Software Engineer', avatar: 'https://via.placeholder.com/150' },
    { id: '2', name: 'Jane Smith', role: 'Product Manager', avatar: 'https://via.placeholder.com/150' },
    { id: '3', name: 'Alice Johnson', role: 'UI/UX Designer', avatar: 'https://via.placeholder.com/150' },
    { id: '4', name: 'Bob Brown', role: 'QA Engineer', avatar: 'https://via.placeholder.com/150' },
  ]);

  const renderTeamMember = ({ item }: { item: { id: string; name: string; role: string; avatar: string } }) => (
    <View style={styles.memberCard}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Members</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderTeamMember}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  listContainer: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  memberRole: {
    fontSize: 14,
    color: '#64748b',
  },
});