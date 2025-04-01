import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TeamPage() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Sample team members data
  const [teamMembers] = useState([
    { id: '1', name: 'John Doe', role: 'Software Engineer', avatar: 'https://via.placeholder.com/150' },
    { id: '2', name: 'Jane Smith', role: 'Product Manager', avatar: 'https://via.placeholder.com/150' },
    { id: '3', name: 'Alice Johnson', role: 'UI/UX Designer', avatar: 'https://via.placeholder.com/150' },
    { id: '4', name: 'Bob Brown', role: 'QA Engineer', avatar: 'https://via.placeholder.com/150' },
  ]);

  const renderTeamMember = ({ item }: { item: { id: string; name: string; role: string; avatar: string } }) => (
    <TouchableOpacity 
      style={[
        styles.memberCard,
        { backgroundColor: isDark ? '#1f2937' : '#ffffff' }
      ]}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: isDark ? '#f3f4f6' : '#111827' }]}>{item.name}</Text>
        <Text style={[styles.memberRole, { color: isDark ? '#9ca3af' : '#6b7280' }]}>{item.role}</Text>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={isDark ? '#9ca3af' : '#6b7280'} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top,
        backgroundColor: isDark ? '#111827' : '#f9fafb'
      }
    ]}>
      <View style={[
        styles.header,
        { 
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderBottomColor: isDark ? '#374151' : '#e5e7eb'
        }
      ]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDark ? '#f3f4f6' : '#111827'} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#f3f4f6' : '#111827' }]}>
          Team Members
        </Text>
        <TouchableOpacity>
          <Ionicons 
            name="add-circle-outline" 
            size={24} 
            color={isDark ? '#f3f4f6' : '#111827'} 
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderTeamMember}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
  },
});