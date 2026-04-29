import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserProfile, getNutritionTargets, clearAllData, exportAllData, getGeminiApiKey, saveGeminiApiKey, deleteGeminiApiKey } from '../../services/storage';
import { UserProfile, NutritionTargets } from '../../types';
import { kgToLbs, cmToFtIn } from '../../services/nutrition';

export default function ProfileScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const styles = getStyles(colors, isDark);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const loadData = useCallback(async () => {
    const [p, t, k] = await Promise.all([getUserProfile(), getNutritionTargets(), getGeminiApiKey()]);
    setProfile(p);
    setTargets(t);
    setHasApiKey(!!k);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function handleExport() {
    try {
      const json = await exportAllData();
      const fileUri = (FileSystem as any).cacheDirectory + 'caloriecalc_export.json';
      await (FileSystem as any).writeAsStringAsync(fileUri, json, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export CalorieCalc Data' });
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    }
  }

  async function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your food logs, weight entries, and profile data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllData();
            router.replace('/onboarding/profile');
          },
        },
      ]
    );
  }

  async function handleRemoveApiKey() {
    Alert.alert('Remove API Key', 'AI food scanning will be disabled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteGeminiApiKey();
          setHasApiKey(false);
        },
      },
    ]);
  }

  function displayHeight() {
    if (!profile) return '—';
    if (profile.units === 'imperial') {
      const { ft, inches } = cmToFtIn(profile.heightCm);
      return `${ft}′${inches}″`;
    }
    return `${profile.heightCm} cm`;
  }

  function displayWeight(kg: number) {
    if (!profile) return '—';
    return profile.units === 'imperial' ? `${kgToLbs(kg)} lbs` : `${kg} kg`;
  }

  const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Active',
    very_active: 'Very Active',
  };

  const GOAL_LABELS: Record<string, string> = {
    lose: 'Lose Weight',
    maintain: 'Maintain',
    gain: 'Gain Muscle',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {profile?.name ? (
              <Text style={styles.avatarEmoji}>{profile.name.charAt(0).toUpperCase()}</Text>
            ) : (
              <Feather name="user" size={40} color={colors.textSecondary} />
            )}
          </View>
          <Text style={styles.name}>{profile?.name ?? 'Your Profile'}</Text>
          <Text style={styles.subtitle}>
            {profile?.goalType ? `Goal: ${GOAL_LABELS[profile.goalType]}` : 'Set your goals'}
          </Text>
        </View>

        {/* Appearance Setting */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <View style={styles.themeSelector}>
            {[
              { id: 'system', icon: 'smartphone', label: 'System' },
              { id: 'light', icon: 'sun', label: 'Light' },
              { id: 'dark', icon: 'moon', label: 'Dark' }
            ].map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.themeBtn, mode === m.id && { backgroundColor: colors.greenBg, borderColor: colors.green }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMode(m.id as any);
                }}
              >
                <Feather name={m.icon as any} size={16} color={mode === m.id ? colors.green : colors.textSecondary} style={{ marginBottom: 4 }} />
                <Text style={[styles.themeBtnText, mode === m.id && { color: colors.green, fontWeight: '700' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Profile info */}
        {profile && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Info</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding/profile')}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            </View>
            <InfoRow icon="calendar" label="Age" value={`${profile.age} years`} styles={styles} colors={colors} />
            <InfoRow icon="maximize-2" label="Height" value={displayHeight()} styles={styles} colors={colors} />
            <InfoRow icon="activity" label="Weight" value={displayWeight(profile.weightKg)} styles={styles} colors={colors} />
            {profile.goalWeightKg && (
              <InfoRow icon="target" label="Goal Weight" value={displayWeight(profile.goalWeightKg)} styles={styles} colors={colors} />
            )}
            <InfoRow icon="zap" label="Activity" value={ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel} styles={styles} colors={colors} />
            <InfoRow icon="globe" label="Units" value={profile.units === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'} styles={styles} colors={colors} />
          </View>
        )}

        {/* Nutrition targets */}
        {targets && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Targets</Text>
            <Text style={styles.formulaNote}>Calculated using Mifflin-St Jeor</Text>

            <View style={styles.targetsGrid}>
              <TargetStat icon="activity" label="BMR" value={`${targets.bmr}`} unit="kcal" color={colors.textSecondary} styles={styles} colors={colors} />
              <TargetStat icon="zap" label="TDEE" value={`${targets.tdee}`} unit="kcal" color={colors.blue} styles={styles} colors={colors} />
              <TargetStat icon="target" label="Daily Goal" value={`${targets.calorieGoal}`} unit="kcal" color={colors.green} styles={styles} colors={colors} />
              <TargetStat
                icon={targets.deficit < 0 ? 'arrow-down-circle' : 'arrow-up-circle'}
                label={targets.deficit < 0 ? 'Deficit' : 'Surplus'}
                value={`${Math.abs(targets.deficit)}`}
                unit="kcal"
                color={targets.deficit < 0 ? colors.green : colors.orange}
                styles={styles} colors={colors}
              />
            </View>

            <View style={styles.macroDivider} />

            <View style={styles.targetsGrid}>
              <TargetStat icon="disc" label="Protein" value={`${targets.proteinG}`} unit="g" color={colors.blue} styles={styles} colors={colors} />
              <TargetStat icon="pie-chart" label="Carbs" value={`${targets.carbsG}`} unit="g" color={colors.orange} styles={styles} colors={colors} />
              <TargetStat icon="droplet" label="Fat" value={`${targets.fatG}`} unit="g" color={colors.yellow} styles={styles} colors={colors} />
              <TargetStat icon="leaf" label="Fiber" value={`${targets.fiberG}`} unit="g" color={colors.purple} styles={styles} colors={colors} />
            </View>

            {targets.deficit !== 0 && profile?.weeklyRateKg && (
              <View style={styles.projectionBox}>
                <Text style={styles.projectionText}>
                  📊 Projected {profile.goalType === 'lose' ? 'loss' : 'gain'}: ~{profile.weeklyRateKg * 2.205 < 1.5 ? `${(profile.weeklyRateKg * 2.205).toFixed(1)} lbs` : `${profile.weeklyRateKg.toFixed(2)} kg`} / week
                </Text>
                {profile.goalWeightKg && (
                  <Text style={styles.projectionSub}>
                    ~{Math.round(Math.abs((profile.weightKg - profile.goalWeightKg) / profile.weeklyRateKg * 7))} days to goal
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* AI Scanner */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI Vision Settings</Text>
          <View style={styles.apiKeyRow}>
            <View style={[styles.apiKeyStatus, { backgroundColor: hasApiKey ? colors.greenBg : colors.redBg, flexDirection: 'row', alignItems: 'center' }]}>
              <Feather name={hasApiKey ? 'check-circle' : 'alert-circle'} size={14} color={hasApiKey ? colors.green : colors.red} style={{ marginRight: 6 }} />
              <Text style={[styles.apiKeyStatusText, { color: hasApiKey ? colors.green : colors.red }]}>
                {hasApiKey ? 'API Key Active' : 'No API Key'}
              </Text>
            </View>
          </View>
          {hasApiKey ? (
            <TouchableOpacity style={styles.dangerRow} onPress={handleRemoveApiKey}>
              <Text style={styles.dangerText}>Remove API Key</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/onboarding/apikey')}
            >
              <Text style={styles.actionBtnText}>Add Gemini API Key →</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}>
            <Text style={styles.link}>Get a free key at aistudio.google.com →</Text>
          </TouchableOpacity>
        </View>

        {/* Data management */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Privacy</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
            <Feather name="lock" size={16} color={colors.textMuted} style={{ marginTop: 2, marginRight: 8 }} />
            <Text style={[styles.privacyNote, { flex: 1, marginBottom: 0 }]}>
              All your data is stored locally. Nothing is sent to any server. Your food logs, weight data, and profile are yours alone.
            </Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleExport}>
            <Feather name="share" size={16} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Export All Data (JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} onPress={handleClearData}>
            <Feather name="trash-2" size={16} color={colors.red} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Erase All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <Text style={styles.version}>CalorieCalc v2.0 · Made with </Text>
          <Feather name="heart" size={12} color={colors.red} />
          <Text style={styles.version}> for your health</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <Text style={styles.version}>Developed by Vamshi Gutha</Text>

        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <Text style={styles.version}>New Features Coming Soon!</Text>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, styles, colors }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name={icon} size={16} color={colors.textSecondary} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TargetStat({ icon, label, value, unit, color, styles, colors }: any) {
  return (
    <View style={styles.targetStat}>
      <View style={[styles.targetIconWrap, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.targetValue, { color }]}>
        {value}
        <Text style={styles.targetUnit}>{unit}</Text>
      </Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: Spacing.md, paddingBottom: 120 },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.green + '44',
    marginBottom: Spacing.md,
    ...getShadows(isDark).card,
  },
  avatarEmoji: { fontSize: 48 },
  name: { ...Typography.displayMedium, color: colors.text },
  subtitle: { ...Typography.bodyMedium, color: colors.textSecondary, marginTop: Spacing.xs, fontWeight: '500' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: { ...Typography.headingLarge, color: colors.text, marginBottom: Spacing.md },
  editBtn: { ...Typography.label, color: colors.green },
  themeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeBtnText: { ...Typography.bodyMedium, color: colors.textSecondary, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  infoLabel: { ...Typography.bodyMedium, color: colors.textSecondary },
  infoValue: { ...Typography.bodyMedium, color: colors.text, fontWeight: '700' },
  formulaNote: { ...Typography.bodySmall, color: colors.textMuted, marginBottom: Spacing.lg, marginTop: -8 },
  targetsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  targetStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'transparent',
  },
  targetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  targetValue: { fontSize: 26, fontWeight: '800' },
  targetUnit: { fontSize: 14, fontWeight: '500' },
  targetLabel: { ...Typography.caption, color: colors.textMuted, marginTop: 4 },
  macroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Spacing.md,
  },
  projectionBox: {
    backgroundColor: colors.greenBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.green + '33',
  },
  projectionText: { ...Typography.bodyMedium, color: colors.green, fontWeight: '600' },
  projectionSub: { ...Typography.caption, color: colors.green, marginTop: 4, opacity: 0.8 },
  apiKeyRow: { marginBottom: Spacing.md },
  apiKeyStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  apiKeyStatusText: { ...Typography.label, fontWeight: '700' },
  actionBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: { ...Typography.label, color: colors.text },
  dangerBtn: { borderColor: colors.red + '44', backgroundColor: colors.redBg },
  dangerBtnText: { color: colors.red },
  dangerRow: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dangerText: { ...Typography.label, color: colors.red },
  link: { ...Typography.bodySmall, color: colors.purple, textDecorationLine: 'underline', marginTop: Spacing.xs },
  privacyNote: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
    backgroundColor: colors.greenBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.green + '33',
  },
  version: {
    ...Typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
