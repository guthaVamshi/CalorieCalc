import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, FoodEntry, WeightEntry, NutritionTargets } from '../types';

const KEYS = {
  USER_PROFILE: 'cc_user_profile',
  NUTRITION_TARGETS: 'cc_nutrition_targets',
  FOOD_LOG_PREFIX: 'cc_food_log_', // + YYYY-MM-DD
  WEIGHT_LOG: 'cc_weight_log',
  GEMINI_API_KEY: 'cc_gemini_key',
  ALL_FOOD_DATES: 'cc_food_dates',
};

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

// ─── Nutrition Targets ────────────────────────────────────────────────────────
export async function saveNutritionTargets(targets: NutritionTargets): Promise<void> {
  await AsyncStorage.setItem(KEYS.NUTRITION_TARGETS, JSON.stringify(targets));
}

export async function getNutritionTargets(): Promise<NutritionTargets | null> {
  const raw = await AsyncStorage.getItem(KEYS.NUTRITION_TARGETS);
  return raw ? JSON.parse(raw) : null;
}

// ─── Food Log ─────────────────────────────────────────────────────────────────
export async function getFoodEntriesForDate(date: string): Promise<FoodEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_LOG_PREFIX + date);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFoodEntry(entry: FoodEntry): Promise<void> {
  const existing = await getFoodEntriesForDate(entry.date);
  const updated = [...existing.filter((e) => e.id !== entry.id), entry];
  await AsyncStorage.setItem(KEYS.FOOD_LOG_PREFIX + entry.date, JSON.stringify(updated));
  // track dates
  await addFoodDate(entry.date);
}

export async function deleteFoodEntry(date: string, id: string): Promise<void> {
  const existing = await getFoodEntriesForDate(date);
  const updated = existing.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEYS.FOOD_LOG_PREFIX + date, JSON.stringify(updated));
}

export async function getAllFoodDates(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.ALL_FOOD_DATES);
  return raw ? JSON.parse(raw) : [];
}

async function addFoodDate(date: string): Promise<void> {
  const existing = await getAllFoodDates();
  if (!existing.includes(date)) {
    await AsyncStorage.setItem(KEYS.ALL_FOOD_DATES, JSON.stringify([...existing, date].sort()));
  }
}

export async function getFoodEntriesForDateRange(
  startDate: string,
  endDate: string
): Promise<FoodEntry[]> {
  const dates = await getAllFoodDates();
  const inRange = dates.filter((d) => d >= startDate && d <= endDate);
  const results = await Promise.all(inRange.map((d) => getFoodEntriesForDate(d)));
  return results.flat();
}

// ─── Weight Log ───────────────────────────────────────────────────────────────
export async function getWeightLog(): Promise<WeightEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.WEIGHT_LOG);
  return raw ? JSON.parse(raw) : [];
}

export async function saveWeightEntry(entry: WeightEntry): Promise<void> {
  const existing = await getWeightLog();
  const updated = [...existing.filter((e) => e.id !== entry.id), entry].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  await AsyncStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify(updated));
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const existing = await getWeightLog();
  const updated = existing.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEYS.WEIGHT_LOG, JSON.stringify(updated));
}

// ─── Gemini API Key (SecureStore) ─────────────────────────────────────────────
export async function saveGeminiApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.GEMINI_API_KEY, key);
}

export async function getGeminiApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEYS.GEMINI_API_KEY);
}

export async function deleteGeminiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.GEMINI_API_KEY);
}

// ─── Clear All Data ───────────────────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  const dates = await getAllFoodDates();
  const dateKeys = dates.map((d) => KEYS.FOOD_LOG_PREFIX + d);
  await AsyncStorage.multiRemove([
    KEYS.USER_PROFILE,
    KEYS.NUTRITION_TARGETS,
    KEYS.WEIGHT_LOG,
    KEYS.ALL_FOOD_DATES,
    ...dateKeys,
  ]);
  await deleteGeminiApiKey();
}

// ─── Export All Data (JSON) ───────────────────────────────────────────────────
export async function exportAllData(): Promise<string> {
  const profile = await getUserProfile();
  const targets = await getNutritionTargets();
  const weightLog = await getWeightLog();
  const dates = await getAllFoodDates();
  const foodByDate: Record<string, FoodEntry[]> = {};
  for (const date of dates) {
    foodByDate[date] = await getFoodEntriesForDate(date);
  }
  return JSON.stringify({ profile, targets, weightLog, foodByDate, exportedAt: new Date().toISOString() }, null, 2);
}
