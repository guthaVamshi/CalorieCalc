import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { Typography } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
  style?: ViewStyle;
}

export function CalorieRing({
  consumed,
  goal,
  size = 220,
  strokeWidth = 16, // Thicker neo-style ring
  style,
}: CalorieRingProps) {
  const { colors, isDark } = useTheme();
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = Math.max(0, goal - consumed);
  const isOver = consumed > goal;

  const ringColor = isOver ? colors.red : progress > 0.85 ? colors.orange : colors.green;
  
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const circleRef = useRef<any>(null);

  useEffect(() => {
    // We use a listener to manually update the SVG prop for maximum compatibility
    const id = animatedProgress.addListener((v) => {
      if (circleRef.current) {
        const strokeDashoffset = circumference * (1 - v.value);
        circleRef.current.setNativeProps({ strokeDashoffset });
      }
    });

    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedProgress.removeListener(id);
    };
  }, [progress, circumference]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ringColor} stopOpacity="1" />
            <Stop offset="1" stopColor={ringColor} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc (Animated) */}
        <AnimatedCircle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference} // Initial value
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.centerContent}>
        <Text style={[styles.consumedText, { color: isDark ? colors.text : ringColor }]}>
          {Math.round(consumed)}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>of {Math.round(goal)}</Text>
        <Text style={[styles.kcalLabel, { color: colors.textMuted }]}>kcal</Text>
        {isOver ? (
          <View style={[styles.badge, { backgroundColor: colors.redBg }]}>
            <Text style={[styles.badgeText, { color: colors.red }]}>
              +{Math.round(consumed - goal)} over
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.greenBg }]}>
            <Text style={[styles.badgeText, { color: colors.green }]}>
              {remaining} left
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consumedText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 52,
  },
  label: {
    ...Typography.bodyMedium,
    fontWeight: '500',
    marginTop: 4,
  },
  kcalLabel: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  badge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
