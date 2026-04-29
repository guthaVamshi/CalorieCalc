import {
  UserProfile,
  NutritionTargets,
  ActivityLevel,
  GoalType,
  FoodEntry,
  DailySummary,
  WeightEntry,
} from '../types';

// ─── Activity multipliers ─────────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ─── BMR — Mifflin-St Jeor Equation ──────────────────────────────────────────
export function calculateBMR(profile: UserProfile): number {
  const { weightKg, heightCm, age, sex } = profile;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// ─── TDEE ─────────────────────────────────────────────────────────────────────
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// ─── Calorie goal based on weekly rate ───────────────────────────────────────
// 1 lb = 3500 kcal → 0.45kg = 3500kcal → 1kg = ~7700 kcal
export function calculateCalorieGoal(tdee: number, goalType: GoalType, weeklyRateKg = 0.5): number {
  const dailyAdjustment = (weeklyRateKg * 7700) / 7; // kcal per day
  if (goalType === 'lose') return Math.max(1200, Math.round(tdee - dailyAdjustment));
  if (goalType === 'gain') return Math.round(tdee + dailyAdjustment);
  return tdee;
}

// ─── Macro targets ────────────────────────────────────────────────────────────
export function calculateMacros(
  profile: UserProfile,
  calorieGoal: number
): { proteinG: number; fatG: number; carbsG: number; fiberG: number } {
  // Protein: 1g per lb of bodyweight (0.45 kg) capped at 40% of cals
  const weightLb = profile.weightKg * 2.205;
  const proteinG = Math.min(Math.round(weightLb * 1.0), Math.round((calorieGoal * 0.4) / 4));

  // Fat: 30% of calories
  const fatG = Math.round((calorieGoal * 0.3) / 9);

  // Carbs: remainder
  const carbsG = Math.round((calorieGoal - proteinG * 4 - fatG * 9) / 4);

  // Fiber: 14g per 1000 kcal (FDA guideline)
  const fiberG = Math.round((calorieGoal / 1000) * 14);

  return { proteinG, fatG, carbsG, fiberG };
}

// ─── Full nutrition target computation ────────────────────────────────────────
export function computeNutritionTargets(profile: UserProfile): NutritionTargets {
  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const calorieGoal = calculateCalorieGoal(tdee, profile.goalType, profile.weeklyRateKg ?? 0.5);
  const macros = calculateMacros(profile, calorieGoal);
  const deficit = calorieGoal - tdee;

  return {
    bmr: Math.round(bmr),
    tdee,
    calorieGoal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    deficit,
  };
}

// ─── Weekly projected weight change ──────────────────────────────────────────
export function projectedWeeklyWeightChangeKg(deficitPerDay: number): number {
  // deficitPerDay < 0 means deficit (weight loss)
  return -(deficitPerDay * 7) / 7700;
}

// ─── Days to goal weight ──────────────────────────────────────────────────────
export function daysToGoal(
  currentWeightKg: number,
  goalWeightKg: number,
  weeklyRateKg: number,
  goalType: GoalType
): number | null {
  if (!goalWeightKg || weeklyRateKg === 0) return null;
  const diff = Math.abs(goalWeightKg - currentWeightKg);
  if (diff < 0.1) return 0;
  const daysPerKg = 7 / weeklyRateKg;
  return Math.round(diff * daysPerKg);
}

// ─── Daily summary ────────────────────────────────────────────────────────────
export function computeDailySummary(date: string, entries: FoodEntry[]): DailySummary {
  const totals = entries.reduce(
    (acc, e) => {
      const m = e.portionMultiplier;
      acc.totalCalories += e.nutrition.calories * m;
      acc.totalProteinG += e.nutrition.proteinG * m;
      acc.totalCarbsG += e.nutrition.carbsG * m;
      acc.totalFatG += e.nutrition.fatG * m;
      acc.totalFiberG += e.nutrition.fiberG * m;
      acc.totalSodiumMg += e.nutrition.sodiumMg * m;
      return acc;
    },
    {
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalFiberG: 0,
      totalSodiumMg: 0,
    }
  );

  return {
    date,
    ...Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Math.round(v)])
    ) as typeof totals,
    entries,
  };
}

// ─── Unit converters ──────────────────────────────────────────────────────────
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.205 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.205) * 10) / 10;
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}

// ─── Weight trend (rolling 7-day average) ────────────────────────────────────
export function computeWeightTrend(entries: WeightEntry[]): WeightEntry[] {
  if (entries.length < 2) return entries;
  return entries.map((entry, i) => {
    const window = entries.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, e) => s + e.weightKg, 0) / window.length;
    return { ...entry, weightKg: Math.round(avg * 10) / 10 };
  });
}

// ─── Calorie streak ───────────────────────────────────────────────────────────
export function computeStreak(loggedDates: string[]): number {
  if (!loggedDates.length) return 0;
  const sorted = [...loggedDates].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const curr = new Date(sorted[i - 1]);
    const prev = new Date(sorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}
