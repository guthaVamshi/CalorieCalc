import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { getUserProfile } from '../services/storage';
import { Feather } from '@expo/vector-icons';
import { Typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    getUserProfile()
      .then((profile) => {
        setIsOnboarded(!!profile?.setupComplete);
      })
      .catch(() => {
        setIsOnboarded(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Feather name="activity" size={64} color={colors.green} style={{ marginBottom: 12 }} />
        <Text style={[styles.title, { color: colors.text }]}>CalorieCalc</Text>
        <ActivityIndicator color={colors.green} size="large" style={styles.spinner} />
      </View>
    );
  }

  if (isOnboarded) {
    return <Redirect href="/(tabs)/today" />;
  }

  return <Redirect href="/onboarding/profile" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 64,
  },
  title: {
    ...Typography.displayMedium,
  },
  spinner: {
    marginTop: 24,
  },
});
