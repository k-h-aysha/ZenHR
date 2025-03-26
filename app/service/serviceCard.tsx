import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack'; // Import StackNavigationProp
import { RootStackParamList } from '../navigation/AppNavigator'; // Corrected import

interface ServiceCardProps {
  title?: string; // Optional if not used
  icon: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'Team'>; // Define the navigation prop type

export default function ServiceCard({ title, icon }: ServiceCardProps) {
  const navigation = useNavigation<NavigationProp>(); // Use the typed navigation

  const handlePress = () => {
    if (icon === 'people') {
      navigation.navigate('Team'); // Corrected screen name
    }
    // ...existing code for other icons...
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* Use title here if needed, or remove it */}
      {/* ...existing code for rendering the card... */}
    </TouchableOpacity>
  );
}
