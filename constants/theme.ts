import { TextStyle, ViewStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export const LightColors = {
  bg: '#FFFFFF',
  surface: '#F4F5F7',
  surfaceAlt: '#E8EAED',
  border: '#E0E2E5',
  borderLight: '#EDEFF2',

  green: '#00D166',
  greenDim: '#00B859',
  greenBg: 'rgba(0, 209, 102, 0.12)',
  purple: '#7C4DFF',
  purpleDim: '#651FFF',
  purpleBg: 'rgba(124, 77, 255, 0.12)',
  orange: '#FF6D00',
  orangeBg: 'rgba(255, 109, 0, 0.12)',
  red: '#FF3B30',
  redBg: 'rgba(255, 59, 48, 0.12)',
  blue: '#007AFF',
  blueBg: 'rgba(0, 122, 255, 0.12)',
  yellow: '#FFCC00',
  yellowBg: 'rgba(255, 204, 0, 0.12)',

  text: '#121212',
  textSecondary: '#666666',
  textMuted: '#999999',
  textInverse: '#FFFFFF',

  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.4)',
  white: '#FFFFFF',
  black: '#000000',
};

export const DarkColors = {
  bg: '#000000',
  surface: '#111317',
  surfaceAlt: '#1A1C22',
  border: '#252D3D',
  borderLight: '#2E3A50',

  green: '#00FF66',
  greenDim: '#00E65C',
  greenBg: 'rgba(0, 255, 102, 0.15)',
  purple: '#9D7AFF',
  purpleDim: '#7C4DFF',
  purpleBg: 'rgba(157, 122, 255, 0.15)',
  orange: '#FF9100',
  orangeBg: 'rgba(255, 145, 0, 0.15)',
  red: '#FF5252',
  redBg: 'rgba(255, 82, 82, 0.15)',
  blue: '#448AFF',
  blueBg: 'rgba(68, 138, 255, 0.15)',
  yellow: '#FFD740',
  yellowBg: 'rgba(255, 215, 64, 0.15)',

  text: '#FFFFFF',
  textSecondary: '#8A9BB0',
  textMuted: '#4A5568',
  textInverse: '#000000',

  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorsType = typeof LightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20, // 2026 neo-squircle
  xl: 28,
  full: 9999,
};

export const Typography = {
  displayLarge: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  displayMedium: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  headingLarge: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  headingMedium: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  headingSmall: { fontSize: 16, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
  label: { fontSize: 14, fontWeight: '600' as const },
};

export const getShadows = (isDark: boolean) => ({
  card: {
    shadowColor: isDark ? '#000000' : '#8A9BB0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.4 : 0.15,
    shadowRadius: 24,
    elevation: 5,
  } as ViewStyle,
  strong: {
    shadowColor: isDark ? '#000000' : '#8A9BB0',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.6 : 0.25,
    shadowRadius: 32,
    elevation: 10,
  } as ViewStyle,
});
