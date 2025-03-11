import { Redirect } from 'expo-router';

// This redirects to the user home page
export default function UserIndex() {
  return <Redirect href="/user/home" />;
} 