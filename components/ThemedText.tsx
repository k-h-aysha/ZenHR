import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';

interface ThemedTextProps extends TextProps {
  type?: 'default' | 'title' | 'subtitle' | 'link';
  lightColor?: string;
  darkColor?: string;
}

export function ThemedText({ 
  style, 
  lightColor = '#000000', 
  darkColor = '#ffffff',
  type = 'default',
  ...props 
}: ThemedTextProps) {
  const colorScheme = useColorScheme();

  return (
    <Text
      style={[
        styles[type],
        {
          color: colorScheme === 'dark' ? darkColor : lightColor,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  link: {
    fontSize: 16,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
}); 