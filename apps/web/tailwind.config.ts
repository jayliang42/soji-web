import type { Config } from "tailwindcss";
import { brandTheme } from "@soji/ui";

const { colors, radii, typography } = brandTheme;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: colors.background,
        cocoa: colors.foreground,
        clay: colors.accent,
        shell: colors.surface,
        dune: colors.border,
        sage: colors.success,
        cream: colors.surfaceMuted,
        charcoal: colors.foreground,
        gold: colors.gold,
        blush: colors.accentMuted,
        richgreen: colors.highlight,
        darkgreen: colors.success,
        brightwhite: colors.surface,
        darktext: colors.foreground,
        checkgreen: colors.success,
        muted: colors.textMuted,
        success: colors.success,
        "success-muted": colors.successMuted,
        warning: colors.warning,
        error: colors.error,
        "accent-muted": colors.accentMuted
      },
      fontFamily: {
        display: [...typography.display],
        body: [...typography.body],
        mono: [...typography.mono]
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
        'hero': '5.5rem',
        'display': '4rem'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      }
    }
  },
  plugins: []
};

export default config;
