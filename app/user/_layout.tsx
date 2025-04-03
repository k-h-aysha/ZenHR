import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function UserLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="services" />
        <Stack.Screen name="leave-history" />
        <Stack.Screen name="apply-leave" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="payroll" />
        <Stack.Screen name="shifts" />
        <Stack.Screen name="account-info" />
        <Stack.Screen name="edit-profile" />
      </Stack>
    </>
  );
} 