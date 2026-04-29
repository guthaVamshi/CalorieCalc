import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, Typography, Radius } from '../constants/theme';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color: string;
  colorBg: string;
}

export function MacroBar({ label, current, goal, unit = 'g', color, colorBg }: MacroBarProps) {
  const { colors, isDark } = useTheme();
  
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const isOver = current > goal;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress * 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width doesn't support native driver
    }).start();
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color }]}>
          {Math.round(current)}
          <Text style={[styles.goal, { color: colors.textMuted }]}>/{Math.round(goal)}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.trackBg, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.trackFill,
            { 
              backgroundColor: isOver ? colors.red : color,
              width: widthInterpolation
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    ...Typography.label,
    fontWeight: '700',
  },
  goal: {
    fontWeight: '500',
  },
  trackBg: {
    height: 8, // Thicker neo-style
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
