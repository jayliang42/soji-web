const colors = {
  background: "#f4f5f2",
  surface: "#ffffff",
  surfaceMuted: "#eef0ec",
  foreground: "#201f1c",
  textMuted: "#655f58",
  accent: "#9b432b",
  accentMuted: "#f4e6df",
  border: "#c8ccc5",
  success: "#2f6f3d",
  successMuted: "#eef8ed",
  warning: "#9a6700",
  error: "#b42318",
  gold: "#b4881d",
  highlight: "#e7f5da"
} as const;

const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24
} as const;

const typography = {
  display: ["Georgia", "Times New Roman", "serif"],
  body: ["Inter", "Helvetica Neue", "sans-serif"],
  mono: ["JetBrains Mono", "Fira Code", "monospace"]
} as const;

export const brandTheme = {
  colors,
  radii,
  spacing,
  typography
} as const;

export type BrandTheme = typeof brandTheme;
