import { View, StyleSheet } from 'react-native';
import React from 'react';
import { ThemedText } from '@/components/ThemedText';
import { withAuth } from '@/lib/auth/AuthContext';

function CalendarScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Calendar</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default withAuth(CalendarScreen); 