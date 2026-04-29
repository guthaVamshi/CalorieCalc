import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { analyzeFoodImage } from '../../services/gemini';
import { getGeminiApiKey, saveFoodEntry } from '../../services/storage';
import { FoodEntry, GeminiFoodResult, MealType } from '../../types';
import { MacroBar } from '../../components/MacroBar';

const MEAL_OPTIONS: { value: MealType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'sunrise' },
  { value: 'lunch', label: 'Lunch', icon: 'sun' },
  { value: 'dinner', label: 'Dinner', icon: 'moon' },
  { value: 'snack', label: 'Snack', icon: 'coffee' },
];

export default function ScanScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GeminiFoodResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [portionMult, setPortionMult] = useState(1.0);
  const [logged, setLogged] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useFocusEffect(
    useCallback(() => {
      getGeminiApiKey().then(setApiKey);
      setPhoto(null);
      setResult(null);
      setLogged(false);
      setPortionMult(1.0);
    }, [])
  );

  async function handleTakePhoto() {
    if (!cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (pic?.uri) {
        setPhoto(pic.uri);
        analyzePhoto(pic.base64 ?? '');
      }
    } catch (e) {
      Alert.alert('Camera Error', 'Could not take photo. Please try again.');
    }
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto(asset.uri);
      analyzePhoto(asset.base64 ?? '');
    }
  }

  async function analyzePhoto(base64: string) {
    if (!apiKey) {
      Alert.alert(
        'No API Key',
        'Add a Gemini API key in Profile > Settings to use food scanning.',
        [{ text: 'OK' }]
      );
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const foodResult = await analyzeFoodImage(apiKey, base64);
      setResult(foodResult);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.message ?? 'Could not analyze the food. Please try again.');
      setPhoto(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleLogFood() {
    if (!result) return;
    const entry: FoodEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      mealType,
      foodName: result.food_name,
      estimatedPortion: result.estimated_portion,
      portionMultiplier: portionMult,
      nutrition: {
        calories: result.calories,
        proteinG: result.protein_g,
        carbsG: result.carbs_g,
        fatG: result.fat_g,
        fiberG: result.fiber_g,
        sugarG: result.sugar_g,
        sodiumMg: result.sodium_mg,
      },
      photoUri: photo ?? undefined,
      confidence: result.confidence,
      addedAt: new Date().toISOString(),
    };
    await saveFoodEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLogged(true);
    setTimeout(() => {
      setPhoto(null);
      setResult(null);
      setLogged(false);
      setPortionMult(1.0);
    }, 1500);
  }

  function handleRetake() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhoto(null);
    setResult(null);
    setPortionMult(1.0);
    setLogged(false);
  }

  // ── No permission ──────────────────────────────────────────────────────────
  if (!permission) return <View style={styles.safe} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.permissionContainer}>
          <Feather name="camera" size={64} color={colors.textSecondary} style={{ marginBottom: Spacing.lg }} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionDesc}>
            CalorieCalc needs camera access to scan and identify food items.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera view (no photo taken yet) ──────────────────────────────────────
  if (!photo) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.cameraContainer}>
          <Text style={styles.cameraTitle}>Scan Food</Text>
          <Text style={styles.cameraSub}>Point at your meal and tap capture</Text>

          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            {/* Corner guides */}
            <View style={styles.overlay}>
              <View style={styles.guide}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
            </View>
          </CameraView>

          {/* Controls */}
          <BlurView tint={isDark ? 'dark' : 'light'} intensity={80} style={styles.cameraControlsContainer}>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
                <Feather name="image" size={24} color={colors.textSecondary} />
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>

              <View style={{ width: 64 }} />
            </View>
          </BlurView>

          {!apiKey && (
            <View style={[styles.noKeyBanner, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
              <Feather name="alert-triangle" size={16} color={colors.orange} style={{ marginRight: 6 }} />
              <Text style={styles.noKeyText}>No API key — add one in Profile to enable AI scanning</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Photo taken — show analysis ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.resultHeader}>
          <TouchableOpacity onPress={handleRetake} style={styles.retakeBtn}>
            <Text style={styles.retakeText}>← Retake</Text>
          </TouchableOpacity>
          <Text style={styles.resultTitle}>Food Analysis</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Photo */}
        <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />

        {/* Loading */}
        {analyzing && (
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text style={styles.analyzingText}>Analyzing food with AI...</Text>
          </View>
        )}

        {/* Result */}
        {result && !analyzing && (
          <>
            {/* Food info */}
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{result.food_name}</Text>
                  <Text style={styles.portionText}>{result.estimated_portion}</Text>
                </View>
                <View style={[styles.confidenceBadge, {
                  backgroundColor: result.confidence === 'high' ? colors.greenBg : result.confidence === 'medium' ? colors.yellowBg : colors.redBg
                }]}>
                  <Text style={[styles.confidenceText, {
                    color: result.confidence === 'high' ? colors.green : result.confidence === 'medium' ? colors.yellow : colors.red
                  }]}>
                    {result.confidence === 'high' ? '✓ Confident' : result.confidence === 'medium' ? '~ Medium' : '? Low'}
                  </Text>
                </View>
              </View>

              {/* Calorie big number */}
              <View style={styles.calorieBig}>
                <Text style={styles.calorieNum}>{Math.round(result.calories * portionMult)}</Text>
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>

              {/* Portion multiplier */}
              <View style={styles.portionRow}>
                <Text style={styles.portionLabel}>Portion Size</Text>
                <View style={styles.portionControls}>
                  <TouchableOpacity
                    style={styles.portionBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPortionMult(Math.max(0.25, portionMult - 0.25));
                    }}
                  >
                    <Text style={styles.portionBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.portionMult}>{portionMult}×</Text>
                  <TouchableOpacity
                    style={styles.portionBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPortionMult(Math.min(5, portionMult + 0.25));
                    }}
                  >
                    <Text style={styles.portionBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Macros */}
              <View style={{ marginTop: Spacing.md }}>
                <MacroBar label="Protein" current={result.protein_g * portionMult} goal={result.protein_g * portionMult} color={colors.blue} colorBg={colors.blueBg} />
                <MacroBar label="Carbs" current={result.carbs_g * portionMult} goal={result.carbs_g * portionMult} color={colors.orange} colorBg={colors.orangeBg} />
                <MacroBar label="Fat" current={result.fat_g * portionMult} goal={result.fat_g * portionMult} color={colors.yellow} colorBg={colors.yellowBg} />
              </View>

              {/* Extra stats */}
              <View style={styles.extraRow}>
                <MiniStat label="Fiber" value={`${Math.round(result.fiber_g * portionMult)}g`} styles={styles} colors={colors} />
                <MiniStat label="Sugar" value={`${Math.round(result.sugar_g * portionMult)}g`} styles={styles} colors={colors} />
                <MiniStat label="Sodium" value={`${Math.round(result.sodium_mg * portionMult)}mg`} styles={styles} colors={colors} />
              </View>
            </View>

            {/* Meal type selector */}
            <View style={styles.mealSelector}>
              <Text style={styles.mealSelectorLabel}>Add to meal:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mealOptions}>
                  {MEAL_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.mealOpt, mealType === opt.value && { backgroundColor: colors.greenBg, borderColor: colors.green }]}
                      onPress={() => { setMealType(opt.value); Haptics.selectionAsync(); }}
                    >
                      <Feather name={opt.icon} size={18} color={mealType === opt.value ? colors.green : colors.textSecondary} />
                      <Text style={[styles.mealOptLabel, mealType === opt.value && { color: colors.green, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Log button */}
            <TouchableOpacity
              style={[styles.logBtn, logged && { backgroundColor: colors.greenDim }]}
              onPress={handleLogFood}
              disabled={logged}
              activeOpacity={0.8}
            >
              <Text style={styles.logBtnText}>
                {logged ? '✓ Logged!' : '+ Log This Food'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value, styles, colors }: any) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  permissionEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  permissionTitle: { ...Typography.headingLarge, color: colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  permissionDesc: { ...Typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  permissionBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...getShadows(isDark).card,
  },
  permissionBtnText: { ...Typography.headingSmall, color: colors.textInverse, fontWeight: '700' },
  cameraContainer: { flex: 1, paddingTop: Spacing.md },
  cameraTitle: { ...Typography.headingLarge, color: colors.text, paddingHorizontal: Spacing.md },
  cameraSub: { ...Typography.bodyMedium, color: colors.textSecondary, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  camera: { flex: 1, marginHorizontal: Spacing.md, borderRadius: Radius.xl, overflow: 'hidden' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guide: { width: 280, height: 280, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: colors.green, borderWidth: 4, borderRadius: 8 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.lg,
    paddingBottom: 100, // accommodate floating tab bar
    paddingHorizontal: Spacing.lg,
  },
  galleryBtn: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  galleryBtnText: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', fontWeight: '600', marginTop: 2 },
  captureBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.green,
    ...getShadows(isDark).strong,
  },
  captureBtnInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.green,
  },
  noKeyBanner: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: colors.orangeBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.orange + '44',
  },
  noKeyText: { ...Typography.bodySmall, color: colors.orange, textAlign: 'center', fontWeight: '600' },
  resultContent: { padding: Spacing.md, paddingBottom: 120 },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  retakeBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  retakeText: { ...Typography.bodyMedium, color: colors.text, fontWeight: '600' },
  resultTitle: { ...Typography.headingLarge, color: colors.text },
  photoPreview: {
    width: '100%',
    height: 240,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },
  analyzingCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    gap: Spacing.md,
    ...getShadows(isDark).card,
  },
  analyzingText: { ...Typography.headingSmall, color: colors.textSecondary },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  foodName: { ...Typography.displayMedium, color: colors.text },
  portionText: { ...Typography.bodyMedium, color: colors.textSecondary, marginTop: 4, fontWeight: '500' },
  confidenceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  confidenceText: { ...Typography.caption, fontWeight: '800', letterSpacing: 0.5 },
  calorieBig: { alignItems: 'center', marginVertical: Spacing.lg },
  calorieNum: { fontSize: 72, fontWeight: '800', color: colors.green, letterSpacing: -3 },
  calorieUnit: { ...Typography.headingMedium, color: colors.textMuted, marginTop: -12, letterSpacing: 1 },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  portionLabel: { ...Typography.headingSmall, color: colors.textSecondary },
  portionControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  portionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionBtnText: { color: colors.green, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  portionMult: { ...Typography.headingMedium, color: colors.text, minWidth: 44, textAlign: 'center' },
  extraRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  miniStatValue: { ...Typography.headingMedium, color: colors.text },
  miniStatLabel: { ...Typography.caption, color: colors.textMuted, marginTop: 4 },
  mealSelector: { marginBottom: Spacing.lg },
  mealSelectorLabel: { ...Typography.headingSmall, color: colors.textSecondary, marginBottom: Spacing.sm },
  mealOptions: { flexDirection: 'row', gap: Spacing.sm },
  mealOpt: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealOptEmoji: { fontSize: 18 },
  mealOptLabel: { ...Typography.label, color: colors.textSecondary },
  logBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...getShadows(isDark).strong,
  },
  logBtnText: { ...Typography.headingLarge, color: colors.textInverse, fontWeight: '800' },
});
