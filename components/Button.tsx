import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

interface ButtonProps {
    title: string;
    onPress: () => void;
}

export function Button({ title, onPress }: ButtonProps) {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress}>
            <ThemedText style={styles.text}>{title}</ThemedText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#00bfa5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 