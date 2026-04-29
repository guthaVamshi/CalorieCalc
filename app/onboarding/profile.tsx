import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { saveUserProfile } from '../../services/storage';
import { UserProfile, Sex, ActivityLevel, Units } from '../../types';
import { lbsToKg, ftInToCm } from '../../services/nutrition';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Hard exercise daily' },
];

export default function ProfileSetupScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [units, setUnits] = useState<Units>('imperial');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [weightLbs, setWeightLbs] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  function handleNext() {
    const ageNum = parseInt(age);
    if (!ageNum || ageNum < 10 || ageNum > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 10 and 120.');
      return;
    }

    let weightKgNum: number;
    let heightCmNum: number;

    if (units === 'imperial') {
      const lbs = parseFloat(weightLbs);
      if (!lbs || lbs < 50 || lbs > 700) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight in lbs.');
        return;
      }
      const ft = parseInt(heightFt) || 0;
      const inches = parseInt(heightIn) || 0;
      if (ft < 3 || ft > 8) {
        Alert.alert('Invalid Height', 'Please enter a valid height.');
        return;
      }
      weightKgNum = lbsToKg(lbs);
      heightCmNum = ftInToCm(ft, inches);
    } else {
      const kg = parseFloat(weightKg);
      const cm = parseFloat(heightCm);
      if (!kg || kg < 20 || kg > 300) {
        Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
        return;
      }
      if (!cm || cm < 100 || cm > 250) {
        Alert.alert('Invalid Height', 'Please enter a valid height in cm.');
        return;
      }
      weightKgNum = kg;
      heightCmNum = cm;
    }

    const profile: Partial<UserProfile> = {
      name: name.trim() || undefined,
      age: ageNum,
      sex,
      weightKg: weightKgNum,
      heightCm: heightCmNum,
      activityLevel: activity,
      units,
    };

    router.push({ pathname: '/onboarding/goals', params: { profile: JSON.stringify(profile) } });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Feather name="activity" size={48} color={colors.green} />
          </View>
          <Text style={styles.title}>Welcome to CalorieCalc</Text>
          <Text style={styles.subtitle}>
            Let's set up your personal nutrition profile.{'\n'}
            Everything stays private on your device.
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Units toggle */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Units</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, units === 'imperial' && styles.toggleActive]}
              onPress={() => { setUnits('imperial'); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.toggleText, units === 'imperial' && styles.toggleTextActive]}>
                Imperial (lbs, ft)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, units === 'metric' && styles.toggleActive]}
              onPress={() => { setUnits('metric'); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.toggleText, units === 'metric' && styles.toggleTextActive]}>
                Metric (kg, cm)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name (optional) */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>

        {/* Age */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            placeholderTextColor={colors.textMuted}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </View>

        {/* Sex */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Biological Sex</Text>
          <Text style={styles.helperText}>Used for accurate calorie calculations</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, sex === 'male' && styles.toggleActive]}
              onPress={() => { setSex('male'); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.toggleText, sex === 'male' && styles.toggleTextActive]}>♂ Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, sex === 'female' && styles.toggleActive]}
              onPress={() => { setSex('female'); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.toggleText, sex === 'female' && styles.toggleTextActive]}>♀ Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Height */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Height</Text>
          {units === 'imperial' ? (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: Spacing.sm }]}
                placeholder="ft"
                placeholderTextColor={colors.textMuted}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="in"
                placeholderTextColor={colors.textMuted}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
              />
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Height in cm"
              placeholderTextColor={colors.textMuted}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
            />
          )}
        </View>

        {/* Weight */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current Weight</Text>
          <TextInput
            style={styles.input}
            placeholder={units === 'imperial' ? 'Weight in lbs' : 'Weight in kg'}
            placeholderTextColor={colors.textMuted}
            value={units === 'imperial' ? weightLbs : weightKg}
            onChangeText={units === 'imperial' ? setWeightLbs : setWeightKg}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Activity */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Activity Level</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.activityBtn, activity === opt.value && styles.activityBtnActive]}
                onPress={() => { setActivity(opt.value); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.activityLabel, activity === opt.value && styles.activityLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.activityDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          🔒 All data stored locally on your device. Nothing is shared or sold.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoRow: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.green + '44',
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    ...Typography.displayMedium,
    color: colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.green,
    width: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  sectionLabel: {
    ...Typography.headingSmall,
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  helperText: {
    ...Typography.bodySmall,
    color: colors.textMuted,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: colors.text,
    ...Typography.bodyLarge,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  toggleActive: {
    backgroundColor: colors.greenBg,
    borderColor: colors.green,
  },
  toggleText: {
    ...Typography.label,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.green,
    fontWeight: '600',
  },
  activityGrid: {
    gap: Spacing.xs,
  },
  activityBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityBtnActive: {
    backgroundColor: colors.greenBg,
    borderColor: colors.green,
  },
  activityLabel: {
    ...Typography.label,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activityLabelActive: {
    color: colors.green,
  },
  activityDesc: {
    ...Typography.bodySmall,
    color: colors.textMuted,
  },
  nextBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...getShadows(isDark).strong,
  },
  nextBtnText: {
    ...Typography.headingMedium,
    color: colors.textInverse,
    fontWeight: '800',
  },
  privacyNote: {
    ...Typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
