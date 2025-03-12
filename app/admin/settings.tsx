import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { signOutUser } from '@/lib/supabase';

// Add type for Ionicons names
type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(true);
  const [emailAlerts, setEmailAlerts] = React.useState(true);

  const handleSignOut = async () => {
    const { error } = await signOutUser();
    if (!error) {
      router.replace('/auth/login');
    }
  };

  const settingsOptions = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Profile',
          onPress: () => console.log('Navigate to profile'),
          type: 'link',
        },
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: darkMode,
          onToggle: setDarkMode,
          type: 'toggle',
        },
        {
          icon: 'mail-outline',
          label: 'Email Alerts',
          value: emailAlerts,
          onToggle: setEmailAlerts,
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          onPress: () => console.log('Navigate to help center'),
          type: 'link',
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => console.log('Navigate to terms'),
          type: 'link',
        },
        {
          icon: 'shield-outline',
          label: 'Privacy Policy',
          onPress: () => console.log('Navigate to privacy policy'),
          type: 'link',
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Settings</ThemedText>
            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => console.log('Notifications')}
              >
                <Ionicons name={'notifications-outline' as IconName} size={24} color="#93c5fd" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={handleSignOut}
              >
                <Ionicons name={'exit-outline' as IconName} size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Sections */}
          {settingsOptions.map((section, index) => (
            <View key={section.title} style={[styles.section, index > 0 && { marginTop: 24 }]}>
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              <View style={styles.optionsList}>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.optionItem,
                      itemIndex < section.items.length - 1 && styles.optionItemBorder,
                    ]}
                    onPress={item.type === 'link' ? item.onPress : undefined}
                    activeOpacity={item.type === 'link' ? 0.7 : 1}
                  >
                    <View style={styles.optionContent}>
                      <Ionicons name={item.icon as IconName} size={24} color="#93c5fd" style={styles.optionIcon} />
                      <ThemedText style={styles.optionLabel}>{item.label}</ThemedText>
                    </View>
                    {item.type === 'toggle' ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#475569', true: '#93c5fd' }}
                        thumbColor={item.value ? '#ffffff' : '#94a3b8'}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
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
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 16,
    padding: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    paddingLeft: 12,
  },
  optionsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
}); 