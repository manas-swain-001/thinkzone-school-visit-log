/** One small theme, so spacing and colour are decided once. */

export const colors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#DCE3EC',
  borderStrong: '#B9C4D2',
  text: '#12212F',
  textMuted: '#5B6B7C',
  textFaint: '#8794A4',
  primary: '#12507E',
  primaryDark: '#0C3A5E',
  primarySoft: '#E6F0F8',
  success: '#1B7A45',
  successSoft: '#E4F3EA',
  warning: '#8A5A00',
  warningSoft: '#FBF0DC',
  danger: '#A3211F',
  dangerSoft: '#FBE7E6',
  disabled: '#C3CCD6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
  mono: { fontSize: 12 },
} as const;
