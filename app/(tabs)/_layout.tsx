import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { Radius, getShadows } from '../../constants/theme';

import { Feather } from '@expo/vector-icons';

function TabIcon({ name, focused, color, isDark }: { name: keyof typeof Feather.glyphMap; focused: boolean; color: string; isDark: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: isDark ? 'rgba(0, 255, 102, 0.15)' : 'rgba(0, 209, 102, 0.12)' }]}>
      <Feather name={name} size={20} color={color} style={[focused && { transform: [{ scale: 1.1 }] }]} />
    </View>
  );
}

export default function TabLayout() {
  const { colors, isDark, mode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          elevation: 0,
          height: 64,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          backgroundColor: isDark ? 'rgba(17, 19, 23, 0.8)' : 'rgba(244, 245, 247, 0.8)',
          ...getShadows(isDark).card,
        },
        tabBarBackground: () => (
          <BlurView 
            tint={isDark ? "dark" : "light"} 
            intensity={80} 
            style={StyleSheet.absoluteFill} 
          />
        ),
      }}
    >
      <Tabs.Screen
        name="today"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color }) => <TabIcon name="camera" focused={focused} color={color} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused, color }) => <TabIcon name="trending-up" focused={focused} color={color} isDark={isDark} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIcon name="settings" focused={focused} color={color} isDark={isDark} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});
