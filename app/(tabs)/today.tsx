import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CalorieRing } from '../../components/CalorieRing';
import { MacroBar } from '../../components/MacroBar';
import { MealSection } from '../../components/FoodCard';
import {
  getFoodEntriesForDate,
  getNutritionTargets,
  getUserProfile,
  deleteFoodEntry,
  saveFoodEntry,
} from '../../services/storage';
import { computeDailySummary } from '../../services/nutrition';
import { FoodEntry, NutritionTargets, MealType, UserProfile } from '../../types';
import { router } from 'expo-router';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const TODAY = new Date().toISOString().slice(0, 10);

// Manual food entry modal
function ManualEntryModal({
  visible,
  mealType,
  date,
  onClose,
  onSave,
}: {
  visible: boolean;
  mealType: MealType;
  date: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors, isDark } = useTheme();
  const modalStyles = getModalStyles(colors, isDark);
  
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('1 serving');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  function reset() {
    setName(''); setPortion('1 serving'); setCalories('');
    setProtein(''); setCarbs(''); setFat('');
  }

  async function handleSave() {
    if (!name.trim() || !calories) {
      Alert.alert('Required', 'Please enter at least a food name and calories.');
      return;
    }
    const entry: FoodEntry = {
      id: Date.now().toString(),
      date,
      mealType,
      foodName: name.trim(),
      estimatedPortion: portion || '1 serving',
      portionMultiplier: 1,
      nutrition: {
        calories: parseFloat(calories) || 0,
        proteinG: parseFloat(protein) || 0,
        carbsG: parseFloat(carbs) || 0,
        fatG: parseFloat(fat) || 0,
        fiberG: 0,
        sugarG: 0,
        sodiumMg: 0,
      },
      addedAt: new Date().toISOString(),
      isManual: true,
    };
    await saveFoodEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onSave();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>Manual Entry</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={modalStyles.save}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={modalStyles.content} keyboardShouldPersistTaps="handled">
          <Field label="Food Name *" value={name} onChangeText={setName} placeholder="e.g., Grilled Chicken" colors={colors} modalStyles={modalStyles} />
          <Field label="Portion" value={portion} onChangeText={setPortion} placeholder="e.g., 1 cup (240g)" colors={colors} modalStyles={modalStyles} />
          <Field label="Calories *" value={calories} onChangeText={setCalories} placeholder="kcal" keyboardType="decimal-pad" colors={colors} modalStyles={modalStyles} />
          <View style={modalStyles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field label="Protein (g)" value={protein} onChangeText={setProtein} placeholder="0" keyboardType="decimal-pad" colors={colors} modalStyles={modalStyles} />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} placeholder="0" keyboardType="decimal-pad" colors={colors} modalStyles={modalStyles} />
            </View>
          </View>
          <Field label="Fat (g)" value={fat} onChangeText={setFat} placeholder="0" keyboardType="decimal-pad" colors={colors} modalStyles={modalStyles} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, colors, modalStyles }: any) {
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={modalStyles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

// ─── Main Today Screen ─────────────────────────────────────────────────────────
export default function TodayScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate] = useState(TODAY);
  const [manualMeal, setManualMeal] = useState<MealType | null>(null);

  const loadData = useCallback(async () => {
    const [e, t, p] = await Promise.all([
      getFoodEntriesForDate(selectedDate),
      getNutritionTargets(),
      getUserProfile(),
    ]);
    setEntries(e);
    setTargets(t);
    setProfile(p);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteFoodEntry(selectedDate, id);
    loadData();
  }

  const summary = computeDailySummary(selectedDate, entries);
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = profile?.name ? `, ${profile.name}` : '';

  const netCalories = (targets?.calorieGoal ?? 0) - summary.totalCalories;
  const isDeficit = netCalories >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={colors.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}{displayName} 👋</Text>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <TouchableOpacity
            style={styles.scanFAB}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/(tabs)/scan');
            }}
            activeOpacity={0.8}
          >
            <Feather name="camera" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={styles.scanFABText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie Ring */}
        <View style={styles.ringSection}>
          <CalorieRing
            consumed={summary.totalCalories}
            goal={targets?.calorieGoal ?? 2000}
            size={240}
          />

          {/* Net calories label */}
          <View style={[styles.netBadge, { backgroundColor: isDeficit ? colors.greenBg : colors.redBg }]}>
            <Text style={[styles.netText, { color: isDeficit ? colors.green : colors.red }]}>
              {isDeficit ? `${Math.round(netCalories)} kcal under goal` : `${Math.round(Math.abs(netCalories))} kcal over goal`}
            </Text>
          </View>
        </View>

        {/* Macro bars */}
        {targets && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macros</Text>
            <MacroBar label="Protein" current={summary.totalProteinG} goal={targets.proteinG} color={colors.blue} colorBg={colors.blueBg} />
            <MacroBar label="Carbs" current={summary.totalCarbsG} goal={targets.carbsG} color={colors.orange} colorBg={colors.orangeBg} />
            <MacroBar label="Fat" current={summary.totalFatG} goal={targets.fatG} color={colors.yellow} colorBg={colors.yellowBg} />
            <MacroBar label="Fiber" current={summary.totalFiberG} goal={targets.fiberG} color={colors.purple} colorBg={colors.purpleBg} />
          </View>
        )}

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatChip label="Sodium" value={`${Math.round(summary.totalSodiumMg)}mg`} styles={styles} colors={colors} />
          <StatChip label="Meals" value={`${entries.length}`} styles={styles} colors={colors} />
          <StatChip
            label="vs Goal"
            value={isDeficit ? `−${Math.round(netCalories)}` : `+${Math.round(Math.abs(netCalories))}`}
            color={isDeficit ? colors.green : colors.red}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Food log by meal */}
        <View style={styles.logSection}>
          <Text style={styles.cardTitle}>Food Log</Text>
          {MEAL_TYPES.map((meal) => (
            <MealSection
              key={meal}
              mealType={meal}
              entries={entries.filter((e) => e.mealType === meal)}
              onDelete={handleDelete}
              onAddPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  'Add Food',
                  'How would you like to add food?',
                  [
                    { text: 'Scan with Camera', onPress: () => router.push('/(tabs)/scan') },
                    { text: 'Manual Entry', onPress: () => setManualMeal(meal) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Manual entry modal */}
      {manualMeal && (
        <ManualEntryModal
          visible={!!manualMeal}
          mealType={manualMeal}
          date={selectedDate}
          onClose={() => setManualMeal(null)}
          onSave={loadData}
        />
      )}
    </SafeAreaView>
  );
}

function StatChip({ label, value, color, styles, colors }: any) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  greeting: { ...Typography.headingLarge, color: colors.text, letterSpacing: -0.5 },
  dateText: { ...Typography.bodyMedium, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
  scanFAB: {
    backgroundColor: colors.green,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...getShadows(isDark).strong,
  },
  scanFABText: { ...Typography.label, color: colors.textInverse, fontWeight: '800', letterSpacing: 0.5 },
  ringSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  netBadge: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  netText: { ...Typography.label, fontWeight: '700', letterSpacing: 0.5 },
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  statValue: { ...Typography.headingMedium, color: colors.text },
  statLabel: { ...Typography.caption, color: colors.textSecondary, marginTop: 4 },
  logSection: { marginBottom: Spacing.md },
});

const getModalStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...Typography.headingMedium, color: colors.text },
  cancel: { ...Typography.bodyMedium, color: colors.textSecondary },
  save: { ...Typography.bodyMedium, color: colors.green, fontWeight: '700' },
  content: { padding: Spacing.md, gap: Spacing.md },
  row: { flexDirection: 'row' },
  field: { gap: 8 },
  fieldLabel: { ...Typography.label, color: colors.textSecondary, marginLeft: 4 },
  fieldInput: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: colors.text,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...Typography.bodyMedium,
  },
});
