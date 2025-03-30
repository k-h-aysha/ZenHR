import { Redirect } from 'expo-router';

// This redirects to the user home page
export default function UserIndex() {
  // Redirect to the home screen
  return <Redirect href="/user/home" />;
} 