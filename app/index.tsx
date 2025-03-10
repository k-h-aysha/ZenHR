import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const taglineAnim = new Animated.Value(0);

  useEffect(() => {
    // Logo animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Tagline animation starts after logo
      Animated.timing(taglineAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Longer display time (3.5 seconds)
    const timer = setTimeout(() => {
      // Redirect to auth/login after animation
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0f172a', '#1e3a8a', '#2563eb']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.logoText}>
            Zen<Text style={styles.logoHighlight}>HR</Text>
          </Text>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineAnim,
              transform: [
                {
                  translateY: taglineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.tagline}>Simplify Your Workforce</Text>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      </View>
      <Redirect href="/auth/login" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  logoHighlight: {
    color: '#93c5fd',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    marginBottom: 20,
  },
  dots: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#93c5fd',
    width: 24,
  },
}); 