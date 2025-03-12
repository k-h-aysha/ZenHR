import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';

interface ThemedViewProps extends ViewProps {
  lightBg?: string;
  darkBg?: string;
}

export function ThemedView({ 
  style, 
  lightBg = '#ffffff',
  darkBg = '#1e293b',
  ...props 
}: ThemedViewProps) {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        {
          backgroundColor: colorScheme === 'dark' ? darkBg : lightBg,
        },
        style,
      ]}
      {...props}
    />
  );
} 