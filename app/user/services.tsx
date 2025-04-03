import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Tabs } from 'expo-router';

// Define safe icon names that exist in Ionicons
type IconName = 'calendar' | 'time' | 'checkmark-circle' | 'cash' | 
                'analytics' | 'people' | 'document-text' | 'gift' | 'arrow-back' | 'time-outline';

// Define color themes for service cards - simplified with single background colors
const colorThemes = {
  blue: {
    bgColor: '#93c5fd', // Lighter blue
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#1e40af',
  },
  purple: {
    bgColor: '#c4b5fd', // Lighter purple
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#5b21b6',
  },
  teal: {
    bgColor: '#99f6e4', // Lighter teal
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#0f766e',
  },
  indigo: {
    bgColor: '#a5b4fc', // Lighter indigo
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#3730a3',
  },
  sky: {
    bgColor: '#7dd3fc', // Lighter sky blue
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#0369a1',
  },
  rose: {
    bgColor: '#fda4af', // Lighter rose
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#be123c',
  },
  amber: {
    bgColor: '#fcd34d', // Lighter amber
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#92400e',
  },
  emerald: {
    bgColor: '#6ee7b7', // Lighter emerald
    iconBg: 'rgba(255, 255, 255, 0.5)',
    iconColor: '#047857',
  }
};

type ColorThemeKey = keyof typeof colorThemes;

// Define service categories
type ServiceCategory = 'all' | 'attendance' | 'leave' | 'payroll' | 'other';

interface ServiceCardProps {
  title: string;
  icon: IconName;
  description: string;
  route?: string;
  onPress?: () => void;
  colorTheme?: ColorThemeKey;
  category: ServiceCategory;
}

const ServiceCard = ({ title, icon, description, route, onPress, colorTheme = 'blue', category }: ServiceCardProps) => {
  
  const theme = colorThemes[colorTheme];
  
  const handlePress = () => {
    if (route) {
      console.log('Navigating to route:', route);
      if (route === '/user/shifts') {
        // For shifts page, use navigate instead of push to ensure proper navigation
        router.navigate(route);
      } else {
        router.push(route as any);
      }
    } else if (onPress) {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity
      style={[styles.serviceCard, { backgroundColor: theme.bgColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={icon} size={32} color={theme.iconColor} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={styles.cardDescription}>{description}</ThemedText>
      </View>
    </TouchableOpacity>
  );
};

export default function ServicesScreen() {
  const colorScheme = useColorScheme();

  return (
    <LinearGradient
      colors={['#1e3a8a', '#0f172a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Link>
        <ThemedText style={styles.headerTitle}>Services</ThemedText>
        <View style={{ width: 32 }} />
      </View>

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#38bdf8',
          tabBarInactiveTintColor: '#94a3b8',
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            height: Platform.OS === 'ios' ? 85 : 70,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            elevation: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: Platform.OS === 'ios' ? 0 : 8,
          },
        }}>
        <Tabs.Screen
          name="all"
          options={{
            title: 'All',
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
                <Ionicons name="grid" size={24} color={color} />
              </View>
            ),
            tabBarLabel: 'All',
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
                <Ionicons name="checkmark-circle" size={24} color={color} />
              </View>
            ),
            tabBarLabel: 'Attendance',
          }}
        />
        <Tabs.Screen
          name="leave"
          options={{
            title: 'Leave',
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
                <Ionicons name="calendar" size={24} color={color} />
              </View>
            ),
            tabBarLabel: 'Leave',
          }}
        />
        <Tabs.Screen
          name="payroll"
          options={{
            title: 'Payroll',
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
                <Ionicons name="cash" size={24} color={color} />
              </View>
            ),
            tabBarLabel: 'Payroll',
          }}
        />
        <Tabs.Screen
          name="other"
          options={{
            title: 'Other',
            tabBarIcon: ({ color }) => (
              <View style={[styles.iconWrapper, { backgroundColor: color === '#38bdf8' ? 'rgba(56, 189, 248, 0.2)' : 'transparent' }]}>
                <Ionicons name="apps" size={24} color={color} />
              </View>
            ),
            tabBarLabel: 'Other',
          }}
        />
      </Tabs>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          <ServiceCard
            title="Leave Request"
            icon="calendar"
            description="Request time off or vacation days"
            route="/user/apply-leave"
            colorTheme="blue"
            category="leave"
          />
          
          <ServiceCard
            title="Leave History"
            icon="time"
            description="View your leave history and status"
            route="/user/leave-history"
            colorTheme="purple"
            category="leave"
          />
          
          <ServiceCard
            title="Attendance"
            icon="checkmark-circle"
            description="Check your attendance records"
            route="/user/attendance"
            colorTheme="teal"
            category="attendance"
          />
          
          <ServiceCard
            title="Payroll"
            icon="cash"
            description="View your salary details and pay slips"
            route="/user/payroll"
            colorTheme="sky"
            category="payroll"
          />
          
          <ServiceCard
            title="Shift Management"
            icon="time-outline"
            description="View your work schedule and shifts"
            onPress={() => router.push("/user/shifts")}
            colorTheme="indigo"
            category="other"
          />
          
          <ServiceCard
            title="Team"
            icon="people"
            description="View your team members and structure"
            colorTheme="rose"
            category="other"
          />
          
          <ServiceCard
            title="Documents"
            icon="document-text"
            description="Access company documents"
            colorTheme="amber"
            category="other"
          />
          
          <ServiceCard
            title="Benefits"
            icon="gift"
            description="Explore available employee benefits"
            colorTheme="emerald"
            category="other"
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  serviceCard: {
    width: '48%',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b',
  },
  cardDescription: {
    fontSize: 12,
    color: '#475569',
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
}); 