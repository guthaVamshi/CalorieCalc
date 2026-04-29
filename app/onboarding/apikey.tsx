import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Spacing, Radius, Typography, getShadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { saveGeminiApiKey, saveUserProfile } from '../../services/storage';
import { validateGeminiApiKey } from '../../services/gemini';
import { UserProfile } from '../../types';

export default function ApiKeyScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const params = useLocalSearchParams<{ profile: string }>();
  const profile: UserProfile = params.profile ? JSON.parse(params.profile) : {};

  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  async function handleValidateAndSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      handleSkip();
      return;
    }
    setLoading(true);
    try {
      await validateGeminiApiKey(trimmed);
      await saveGeminiApiKey(trimmed);
      setValidated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => finishSetup(), 800);
    } catch (e: any) {
      Alert.alert(
        'Validation Failed',
        e.message + '\n\nDo you want to force save this key anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Force Save',
            onPress: async () => {
              await saveGeminiApiKey(trimmed);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              finishSetup();
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    await finishSetup();
  }

  async function finishSetup() {
    const updatedProfile: UserProfile = { ...profile, setupComplete: true };
    await saveUserProfile(updatedProfile);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)/today');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🤖</Text>
          </View>
          <Text style={styles.title}>AI Food Scanner</Text>
          <Text style={styles.subtitle}>
            Take a photo of any food and CalorieCalc will instantly identify it and calculate the exact nutrition — powered by Google Gemini AI.
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>How the AI Works</Text>
          {[
            { icon: 'camera', text: 'You take a photo of your meal' },
            { icon: 'cpu', text: 'Gemini AI identifies the food and estimates portion size' },
            { icon: 'bar-chart-2', text: 'Calories, protein, carbs, fat & more — instantly calculated' },
            { icon: 'edit-2', text: 'Adjust portion if needed, then log it with one tap' },
          ].map((item, i) => (
            <View key={i} style={styles.stepRow}>
              <Feather name={item.icon as any} size={20} color={colors.text} style={{ width: 28, textAlign: 'center' }} />
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Privacy */}
        <View style={styles.privacyCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Feather name="lock" size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.privacyTitle, { marginBottom: 0 }]}>Your Privacy</Text>
          </View>
          <Text style={styles.privacyText}>
            Your API key is stored encrypted on your device using iOS Secure Enclave. Photos are sent directly to Google Gemini for analysis — no middleman, no data stored on our servers. We have no servers.
          </Text>
        </View>

        {/* API Key input */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Enter Your Free Gemini API Key</Text>
          <Text style={styles.helperText}>
            Get a free key at{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
            >
              aistudio.google.com
            </Text>
            {' '}— no credit card required.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, validated && styles.inputValid]}
              placeholder="AIza..."
              placeholderTextColor={colors.textMuted}
              value={apiKey}
              onChangeText={(t) => { setApiKey(t); setValidated(false); }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
            />
            {validated && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <TouchableOpacity
            style={[styles.validateBtn, loading && styles.validateBtnLoading]}
            onPress={handleValidateAndSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.validateBtnText}>
                {apiKey.trim() ? 'Validate & Save' : 'Continue without AI'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip — Add API key later in Settings</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Without an API key, you can still manually log food with our built-in common foods database.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMedium, color: colors.textSecondary },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: colors.purpleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.purple + '44',
  },
  icon: { fontSize: 40 },
  title: { ...Typography.displayMedium, color: colors.text, textAlign: 'center' },
  subtitle: { ...Typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: Spacing.sm },
  progressDots: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.green, width: 24 },
  dotDone: { backgroundColor: colors.greenDim },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent',
    ...getShadows(isDark).card,
  },
  sectionLabel: { ...Typography.headingSmall, color: colors.text, marginBottom: Spacing.sm },
  helperText: { ...Typography.bodySmall, color: colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },
  link: { color: colors.purple, textDecorationLine: 'underline' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  stepIcon: { fontSize: 20, width: 28 },
  stepText: { ...Typography.bodyMedium, color: colors.text, flex: 1 },
  privacyCard: {
    backgroundColor: colors.greenBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.green + '44',
  },
  privacyTitle: { ...Typography.headingSmall, color: colors.green, marginBottom: Spacing.xs },
  privacyText: { ...Typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  inputRow: { position: 'relative', marginBottom: Spacing.md },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    color: colors.text,
    ...Typography.bodyMedium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 48,
  },
  inputValid: { borderColor: colors.green },
  checkmark: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -10,
    color: colors.green,
    fontSize: 20,
    fontWeight: '700',
  },
  validateBtn: {
    backgroundColor: colors.green,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...getShadows(isDark).strong,
  },
  validateBtnLoading: { opacity: 0.7 },
  validateBtnText: { ...Typography.headingMedium, color: colors.textInverse, fontWeight: '800' },
  skipBtn: { alignItems: 'center', padding: Spacing.md },
  skipText: { ...Typography.bodyMedium, color: colors.textSecondary, textDecorationLine: 'underline' },
  note: { ...Typography.bodySmall, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },
});
