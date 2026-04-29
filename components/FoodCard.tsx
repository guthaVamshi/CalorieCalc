import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Spacing, Typography, Radius, getShadows } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { FoodEntry, MealType } from '../types';
import * as Haptics from 'expo-haptics';

const MEAL_ICONS: Record<MealType, keyof typeof Feather.glyphMap> = {
  breakfast: 'sunrise',
  lunch: 'sun',
  dinner: 'moon',
  snack: 'coffee',
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface FoodItemCardProps {
  entry: FoodEntry;
  onDelete?: (id: string) => void;
}

export function FoodItemCard({ entry, onDelete }: FoodItemCardProps) {
  const { colors, isDark } = useTheme();
  const styles = getCardStyles(colors, isDark);

  const { nutrition, portionMultiplier } = entry;
  const cal = Math.round(nutrition.calories * portionMultiplier);
  const prot = Math.round(nutrition.proteinG * portionMultiplier);
  const carbs = Math.round(nutrition.carbsG * portionMultiplier);
  const fat = Math.round(nutrition.fatG * portionMultiplier);

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Food', `Remove "${entry.foodName}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDelete?.(entry.id),
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={handleDelete}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{entry.foodName}</Text>
        <Text style={styles.portion}>{entry.estimatedPortion}</Text>
        <View style={styles.macroRow}>
          <MacroPill label="P" value={prot} color={colors.blue} colors={colors} />
          <MacroPill label="C" value={carbs} color={colors.orange} colors={colors} />
          <MacroPill label="F" value={fat} color={colors.yellow} colors={colors} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{cal}</Text>
        <Text style={styles.kcal}>kcal</Text>
      </View>
    </TouchableOpacity>
  );
}

function MacroPill({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={[{ borderColor: color + '44' }, pillStyles.pill]}>
      <Text style={[pillStyles.pillLabel, { color }]}>{label}</Text>
      <Text style={[pillStyles.pillValue, { color: colors.textSecondary }]}>{value}g</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  pillValue: {
    fontSize: 11,
    fontWeight: '600',
  },
});

interface MealSectionProps {
  mealType: MealType;
  entries: FoodEntry[];
  onDelete?: (id: string) => void;
  onAddPress?: () => void;
}

export function MealSection({ mealType, entries, onDelete, onAddPress }: MealSectionProps) {
  const { colors, isDark } = useTheme();
  const styles = getSectionStyles(colors, isDark);

  const totalCal = entries.reduce(
    (s, e) => s + Math.round(e.nutrition.calories * e.portionMultiplier),
    0
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.iconWrap}>
            <Feather name={MEAL_ICONS[mealType]} size={20} color={colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
            {entries.length > 0 && (
              <Text style={styles.mealCal}>{totalCal} kcal</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.empty}>Tap + to log food</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <FoodItemCard key={entry.id} entry={entry} onDelete={onDelete} />
        ))
      )}
    </View>
  );
}

const getSectionStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIcon: {
    fontSize: 20,
  },
  mealLabel: {
    ...Typography.headingMedium,
    color: colors.text,
  },
  mealCal: {
    ...Typography.bodySmall,
    color: colors.green,
    fontWeight: '600',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...getShadows(isDark).card,
  },
  addBtnText: {
    color: colors.textInverse,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    ...Typography.bodyMedium,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

const getCardStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  left: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    ...Typography.headingSmall,
    color: colors.text,
    marginBottom: 4,
  },
  portion: {
    ...Typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  right: {
    alignItems: 'flex-end',
  },
  calories: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  kcal: {
    ...Typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
