import { createStackNavigator } from '@react-navigation/stack'; // Added import
import { NavigationContainer } from '@react-navigation/native'; // Added import
import TeamPage from '../user/team'; // Corrected import path

export type RootStackParamList = { // Added export
  Team: undefined; // Define the "Team" route with no parameters
  // Add other routes here if needed
};

const Stack = createStackNavigator<RootStackParamList>(); // Pass the type here

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* ...existing routes... */}
        <Stack.Screen name="Team" component={TeamPage} /> {/* Corrected screen name */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
