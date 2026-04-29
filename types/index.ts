// ─── User Profile ────────────────────────────────────────────────
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type WeeklyRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;
export type Units = 'imperial' | 'metric';

export interface UserProfile {
  name?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  units: Units;
  goalType: GoalType;
  goalWeightKg?: number;
  weeklyRateKg?: number; // kg per week
  setupComplete: boolean;
  createdAt: string;
}

// ─── Nutrition Targets ───────────────────────────────────────────
export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calorieGoal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  deficit: number; // negative = deficit, positive = surplus
}

// ─── Food / Meal ─────────────────────────────────────────────────
export interface NutritionInfo {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodName: string;
  estimatedPortion: string;
  portionMultiplier: number; // 1.0 = base portion
  nutrition: NutritionInfo;
  photoUri?: string;
  confidence?: 'high' | 'medium' | 'low';
  addedAt: string; // ISO timestamp
  isManual?: boolean;
}

// ─── Weight Log ──────────────────────────────────────────────────
export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  loggedAt: string; // ISO timestamp
}

// ─── Daily Summary (computed) ────────────────────────────────────
export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSodiumMg: number;
  entries: FoodEntry[];
}

// ─── Gemini API ──────────────────────────────────────────────────
export interface GeminiFoodResult {
  food_name: string;
  estimated_portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  confidence: 'high' | 'medium' | 'low';
}
