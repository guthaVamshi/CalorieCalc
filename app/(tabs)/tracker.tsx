import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format, subDays } from 'date-fns';
import Svg, { Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getWeightLog, saveWeightEntry, deleteWeightEntry, getUserProfile, getNutritionTargets, getAllFoodDates, getFoodEntriesForDate } from '../../services/storage';
import { WeightEntry, UserProfile, NutritionTargets } from '../../types';
import { kgToLbs, computeWeightTrend, computeStreak, daysToGoal, computeDailySummary } from '../../services/nutrition';

type RangeKey = '7d' | '30d' | '90d';

function WeightChart({ data, units, colors }: { data: WeightEntry[]; units: 'imperial' | 'metric'; colors: any }) {
  const W = 340;
  const H = 180;
  const PAD = 32;

  if (data.length < 2) {
    return (
      <View style={[{ alignItems: 'center', justifyContent: 'center', width: W, height: H }]}>
        <Text style={{ ...Typography.bodySmall, color: colors.textMuted, textAlign: 'center' }}>
          Log at least 2 weight entries to see chart
        </Text>
      </View>
    );
  }

  const weights = data.map((e) => (units === 'imperial' ? kgToLbs(e.weightKg) : e.weightKg));
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;

  const xStep = (W - PAD * 2) / (data.length - 1);
  const yRange = maxW - minW || 1;
  const yScale = (H - PAD * 2) / yRange;

  const points = data
    .map((_, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - (weights[i] - minW) * yScale;
      return `${x},${y}`;
    })
    .join(' ');

  const dotPoints = data.map((_, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - (weights[i] - minW) * yScale,
  }));

  return (
    <Svg width={W} height={H}>
      <Polyline
        points={points}
        fill="none"
        stroke={colors.green}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dotPoints.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={6} fill={colors.green} stroke={colors.surface} strokeWidth={2} />
      ))}
      <SvgText x={PAD - 8} y={H - PAD + 4} fontSize={10} fontWeight="700" fill={colors.textSecondary} textAnchor="end">
        {minW.toFixed(1)}
      </SvgText>
      <SvgText x={PAD - 8} y={PAD + 4} fontSize={10} fontWeight="700" fill={colors.textSecondary} textAnchor="end">
        {maxW.toFixed(1)}
      </SvgText>
    </Svg>
  );
}

function LogWeightModal({
  visible,
  units,
  onClose,
  onSave,
}: {
  visible: boolean;
  units: 'imperial' | 'metric';
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors, isDark } = useTheme();
  const styles = getModalStyles(colors, isDark);
  const [weight, setWeight] = useState('');

  async function handleSave() {
    const num = parseFloat(weight);
    if (isNaN(num) || num < 20) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }
    const weightKg = units === 'imperial' ? num / 2.205 : num;
    const entry: WeightEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      weightKg: Math.round(weightKg * 10) / 10,
      loggedAt: new Date().toISOString(),
    };
    await saveWeightEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWeight('');
    onSave();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Log Weight</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <Text style={styles.weightUnit}>{units === 'imperial' ? 'lbs' : 'kg'}</Text>
          <TextInput
            style={styles.weightInput}
            placeholder={units === 'imperial' ? '165.4' : '75.0'}
            placeholderTextColor={colors.textMuted}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={styles.weightHint}>Enter your weight in {units === 'imperial' ? 'pounds' : 'kilograms'}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function TrackerScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [range, setRange] = useState<RangeKey>('30d');
  const [showLogModal, setShowLogModal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [avgCalories, setAvgCalories] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const [wLog, prof, tgt, dates] = await Promise.all([
      getWeightLog(),
      getUserProfile(),
      getNutritionTargets(),
      getAllFoodDates(),
    ]);
    setWeightLog(wLog);
    setProfile(prof);
    setTargets(tgt);
    setStreak(computeStreak(dates));

    if (dates.length > 0) {
      const recentDates = dates.slice(-30);
      const summaries = await Promise.all(
        recentDates.map(async (d) => {
          const entries = await getFoodEntriesForDate(d);
          return computeDailySummary(d, entries).totalCalories;
        })
      );
      const avg = summaries.reduce((s, c) => s + c, 0) / (summaries.length || 1);
      setAvgCalories(Math.round(avg));
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const units = profile?.units ?? 'imperial';
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = subDays(new Date(), rangeDays).toISOString().slice(0, 10);
  const filteredLog = weightLog.filter((e) => e.date >= cutoff);
  const trendData = computeWeightTrend(filteredLog);

  const currentWeight = weightLog[weightLog.length - 1];
  const startWeight = weightLog[0];
  const goalWeightKg = profile?.goalWeightKg;

  const totalLost = startWeight && currentWeight
    ? startWeight.weightKg - currentWeight.weightKg
    : 0;

  const daysLeft = profile && goalWeightKg && currentWeight
    ? daysToGoal(currentWeight.weightKg, goalWeightKg, profile.weeklyRateKg ?? 0.5, profile.goalType)
    : null;

  function displayWeight(kg: number) {
    return units === 'imperial' ? `${kgToLbs(kg)} lbs` : `${kg.toFixed(1)} kg`;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <TouchableOpacity
            style={styles.logWeightBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowLogModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.logWeightBtnText}>+ Log Weight</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <BigStat
            label="Current"
            value={currentWeight ? displayWeight(currentWeight.weightKg) : '—'}
            color={colors.text}
            styles={styles}
          />
          {goalWeightKg && (
            <BigStat
              label="Goal"
              value={displayWeight(goalWeightKg)}
              color={colors.green}
              styles={styles}
            />
          )}
          <BigStat
            label={totalLost >= 0 ? 'Lost' : 'Gained'}
            value={totalLost !== 0 ? displayWeight(Math.abs(totalLost)) : '—'}
            color={totalLost >= 0 && totalLost !== 0 ? colors.green : totalLost < 0 ? colors.red : colors.textMuted}
            styles={styles}
          />
        </View>

        {/* Goal progress bar */}
        {startWeight && currentWeight && goalWeightKg && (
          <View style={styles.card}>
            <View style={styles.goalProgressHeader}>
              <Text style={styles.cardTitle}>Goal Progress</Text>
              {daysLeft !== null && (
                <Text style={styles.daysLeft}>~{daysLeft} days to go</Text>
              )}
            </View>
            <GoalProgressBar
              start={startWeight.weightKg}
              current={currentWeight.weightKg}
              goal={goalWeightKg}
              styles={styles}
              colors={colors}
            />
            <View style={styles.goalLabels}>
              <Text style={styles.goalLabelText}>Start: {displayWeight(startWeight.weightKg)}</Text>
              <Text style={styles.goalLabelText}>Goal: {displayWeight(goalWeightKg)}</Text>
            </View>
          </View>
        )}

        {/* Weight chart */}
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Weight Over Time</Text>
            <View style={styles.rangeRow}>
              {(['7d', '30d', '90d'] as RangeKey[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeBtn, range === r && { backgroundColor: colors.greenBg, borderColor: colors.green }]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRange(r);
                  }}
                >
                  <Text style={[styles.rangeBtnText, range === r && { color: colors.green, fontWeight: '800' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <WeightChart data={trendData} units={units} colors={colors} />
          </ScrollView>
        </View>

        {/* Calorie & streak stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statBig}>{streak}</Text>
            <Text style={styles.statSub}>Day streak</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statBig}>{avgCalories ?? '—'}</Text>
            <Text style={styles.statSub}>Avg kcal/day</Text>
          </View>
          {targets && (
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statEmoji}>🎯</Text>
              <Text style={styles.statBig}>{targets.calorieGoal}</Text>
              <Text style={styles.statSub}>Daily goal</Text>
            </View>
          )}
        </View>

        {/* Weight log list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weight History</Text>
          {weightLog.length === 0 ? (
            <Text style={styles.empty}>No weight entries yet. Tap "Log Weight" to start.</Text>
          ) : (
            [...weightLog].reverse().slice(0, 10).map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.weightRow}
                onLongPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Delete Entry', 'Remove this weight entry?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteWeightEntry(entry.id);
                        loadData();
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.weightDate}>{format(new Date(entry.date), 'MMM d, yyyy')}</Text>
                <Text style={styles.weightValue}>{displayWeight(entry.weightKg)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <LogWeightModal
        visible={showLogModal}
        units={units}
        onClose={() => setShowLogModal(false)}
        onSave={loadData}
      />
    </SafeAreaView>
  );
}

function BigStat({ label, value, color, styles }: any) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigStatValue, { color }]}>{value}</Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

function GoalProgressBar({
  start,
  current,
  goal,
  styles,
  colors,
}: any) {
  const totalChange = Math.abs(goal - start);
  const achieved = Math.abs(current - start);
  const progress = totalChange > 0 ? Math.min(achieved / totalChange, 1) : 0;
  
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress * 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.progressBar}>
      <Animated.View style={[styles.progressFill, { backgroundColor: colors.green, width: widthInterpolation }]} />
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: Spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  title: { ...Typography.displayMedium, color: colors.text },
  logWeightBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    ...getShadows(isDark).strong,
  },
  logWeightBtnText: { ...Typography.label, color: colors.textInverse, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  bigStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  bigStatValue: { ...Typography.headingLarge, fontWeight: '800', letterSpacing: -1 },
  bigStatLabel: { ...Typography.caption, color: colors.textMuted, marginTop: 4, letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  cardTitle: { ...Typography.headingLarge, color: colors.text, marginBottom: Spacing.md },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rangeRow: { flexDirection: 'row', gap: Spacing.xs },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rangeBtnText: { ...Typography.caption, color: colors.textSecondary, fontWeight: '600' },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  daysLeft: { ...Typography.label, color: colors.green, fontWeight: '700' },
  progressBar: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  goalLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalLabelText: { ...Typography.caption, color: colors.textSecondary, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  statEmoji: { fontSize: 28, marginBottom: Spacing.sm },
  statBig: { ...Typography.headingLarge, color: colors.text, fontWeight: '800' },
  statSub: { ...Typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: 4, fontWeight: '600' },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weightDate: { ...Typography.bodyMedium, color: colors.textSecondary, fontWeight: '600' },
  weightValue: { ...Typography.headingMedium, color: colors.text, fontWeight: '800' },
  empty: { ...Typography.bodyMedium, color: colors.textMuted, textAlign: 'center', padding: Spacing.xl },
});

const getModalStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: { ...Typography.headingLarge, color: colors.text },
  modalCancel: { ...Typography.bodyMedium, color: colors.textSecondary },
  modalSave: { ...Typography.bodyMedium, color: colors.green, fontWeight: '800' },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  weightUnit: { ...Typography.displayMedium, color: colors.textSecondary },
  weightInput: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    borderBottomWidth: 3,
    borderBottomColor: colors.green,
    minWidth: 200,
    paddingBottom: Spacing.sm,
  },
  weightHint: { ...Typography.bodyMedium, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.lg },
});
