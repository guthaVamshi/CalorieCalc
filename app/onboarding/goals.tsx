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
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { saveUserProfile } from '../../services/storage';
import { UserProfile, GoalType, WeeklyRate } from '../../types';
import { lbsToKg, computeNutritionTargets } from '../../services/nutrition';
import { saveNutritionTargets } from '../../services/storage';

const GOAL_OPTIONS: { value: GoalType; icon: keyof typeof Feather.glyphMap; label: string; desc: string }[] = [
  { value: 'lose', icon: 'trending-down', label: 'Lose Weight', desc: 'Create a calorie deficit' },
  { value: 'maintain', icon: 'activity', label: 'Maintain', desc: 'Stay at current weight' },
  { value: 'gain', icon: 'trending-up', label: 'Gain Muscle', desc: 'Calorie surplus for growth' },
];

const RATE_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 0.25, label: '0.5 lb/wk', desc: 'Gentle (easier to maintain)' },
  { value: 0.5, label: '1 lb/wk', desc: 'Moderate (recommended)' },
  { value: 0.75, label: '1.5 lb/wk', desc: 'Faster (need discipline)' },
  { value: 1.0, label: '2 lb/wk', desc: 'Aggressive (max safe rate)' },
];

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const params = useLocalSearchParams<{ profile: string }>();
  const partialProfile: Partial<UserProfile> = params.profile ? JSON.parse(params.profile) : {};
  const isImperial = partialProfile.units === 'imperial';

  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [goalWeight, setGoalWeight] = useState('');
  const [weeklyRate, setWeeklyRate] = useState(0.5); // kg/week

  async function handleFinish() {
    let goalWeightKg: number | undefined;

    if (goalType !== 'maintain' && goalWeight) {
      const gw = parseFloat(goalWeight);
      if (isNaN(gw) || gw < 20) {
        Alert.alert('Invalid Goal Weight', 'Please enter a valid goal weight.');
        return;
      }
      goalWeightKg = isImperial ? lbsToKg(gw) : gw;
    }

    const profile: UserProfile = {
      ...(partialProfile as UserProfile),
      goalType,
      goalWeightKg,
      weeklyRateKg: goalType !== 'maintain' ? weeklyRate : undefined,
      setupComplete: false, // will be set after API key step
      createdAt: new Date().toISOString(),
    };

    await saveUserProfile(profile);
    const targets = computeNutritionTargets(profile);
    await saveNutritionTargets(targets);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/onboarding/apikey', params: { profile: JSON.stringify(profile) } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Your Goal</Text>
          <Text style={styles.subtitle}>What are you working towards?</Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        {/* Goal type */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Goal Type</Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.goalBtn, goalType === opt.value && styles.goalBtnActive]}
                onPress={() => { setGoalType(opt.value); Haptics.selectionAsync(); }}
              >
                <Feather name={opt.icon} size={28} color={goalType === opt.value ? colors.green : colors.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={[styles.goalLabel, goalType === opt.value && styles.goalLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.goalDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal weight — only for lose/gain */}
        {goalType !== 'maintain' && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Goal Weight ({isImperial ? 'lbs' : 'kg'}) — Optional
            </Text>
            <TextInput
              style={styles.input}
              placeholder={isImperial ? 'e.g. 160' : 'e.g. 70'}
              placeholderTextColor={colors.textMuted}
              value={goalWeight}
              onChangeText={setGoalWeight}
              keyboardType="decimal-pad"
            />
            <Text style={styles.helperText}>
              We'll calculate how long it'll take to reach your goal.
            </Text>
          </View>
        )}

        {/* Weekly rate — only for lose/gain */}
        {goalType !== 'maintain' && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              {goalType === 'lose' ? 'Weight Loss' : 'Weight Gain'} Rate
            </Text>
            <View style={styles.rateGrid}>
              {RATE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.rateBtn, weeklyRate === opt.value && styles.rateBtnActive]}
                  onPress={() => { setWeeklyRate(opt.value); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.rateLabel, weeklyRate === opt.value && styles.rateLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.rateDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Summary preview */}
        <GoalSummaryPreview
          partialProfile={partialProfile as UserProfile}
          goalType={goalType}
          weeklyRate={weeklyRate}
          colors={colors}
          styles={styles}
        />

        <TouchableOpacity style={styles.nextBtn} onPress={handleFinish} activeOpacity={0.8}>
          <Text style={styles.nextBtnText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoalSummaryPreview({
  partialProfile,
  goalType,
  weeklyRate,
  colors,
  styles,
}: any) {
  if (!partialProfile.weightKg || !partialProfile.heightCm || !partialProfile.age) return null;
  const profile = { ...partialProfile, goalType, weeklyRateKg: weeklyRate, setupComplete: false, createdAt: '' };
  const targets = computeNutritionTargets(profile);
  const deficitLabel = targets.deficit < 0 ? `${Math.abs(targets.deficit)} kcal deficit` : targets.deficit > 0 ? `+${targets.deficit} kcal surplus` : 'at maintenance';

  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>Your Targets Preview</Text>
      <View style={styles.previewGrid}>
        <PreviewStat label="Daily Goal" value={`${targets.calorieGoal}`} unit="kcal" color={colors.green} styles={styles} />
        <PreviewStat label="Protein" value={`${targets.proteinG}`} unit="g" color={colors.blue} styles={styles} />
        <PreviewStat label="Carbs" value={`${targets.carbsG}`} unit="g" color={colors.orange} styles={styles} />
        <PreviewStat label="Fat" value={`${targets.fatG}`} unit="g" color={colors.yellow} styles={styles} />
      </View>
      <View style={styles.deficitRow}>
        <Text style={styles.deficitText}>{deficitLabel}</Text>
        <Text style={styles.deficitSub}>vs. your TDEE of {targets.tdee} kcal/day</Text>
      </View>
    </View>
  );
}

function PreviewStat({ label, value, unit, color, styles }: any) {
  return (
    <View style={[styles.previewStat, { borderColor: color + '33' }]}>
      <Text style={[styles.previewValue, { color }]}>{value}<Text style={styles.previewUnit}>{unit}</Text></Text>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMedium, color: colors.textSecondary },
  header: { marginBottom: Spacing.md },
  title: { ...Typography.displayMedium, color: colors.text },
  subtitle: { ...Typography.bodyMedium, color: colors.textSecondary, marginTop: Spacing.xs },
  progressDots: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.green, width: 24 },
  dotDone: { backgroundColor: colors.greenDim },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  sectionLabel: { ...Typography.headingSmall, color: colors.text, marginBottom: Spacing.sm },
  helperText: { ...Typography.bodySmall, color: colors.textMuted, marginTop: Spacing.xs },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: colors.text,
    ...Typography.bodyLarge,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalGrid: { gap: Spacing.sm },
  goalBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalBtnActive: { backgroundColor: colors.greenBg, borderColor: colors.green },
  goalEmoji: { fontSize: 24 },
  goalLabel: { ...Typography.headingSmall, color: colors.textSecondary, flex: 1 },
  goalLabelActive: { color: colors.green },
  goalDesc: { ...Typography.bodySmall, color: colors.textMuted },
  rateGrid: { gap: Spacing.xs },
  rateBtn: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateBtnActive: { backgroundColor: colors.greenBg, borderColor: colors.green },
  rateLabel: { ...Typography.label, color: colors.textSecondary, fontWeight: '600' },
  rateLabelActive: { color: colors.green },
  rateDesc: { ...Typography.bodySmall, color: colors.textMuted },
  previewCard: {
    backgroundColor: colors.purpleBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.purple + '44',
  },
  previewTitle: { ...Typography.headingSmall, color: colors.purple, marginBottom: Spacing.md },
  previewGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  previewStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  previewValue: { fontSize: 20, fontWeight: '700' },
  previewUnit: { fontSize: 12, fontWeight: '400' },
  previewLabel: { ...Typography.caption, color: colors.textMuted, marginTop: 2 },
  deficitRow: { alignItems: 'center' },
  deficitText: { ...Typography.headingSmall, color: colors.text },
  deficitSub: { ...Typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  nextBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...getShadows(isDark).strong,
  },
  nextBtnText: { ...Typography.headingMedium, color: colors.textInverse, fontWeight: '800' },
});
