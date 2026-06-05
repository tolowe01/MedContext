import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mc: {
          primary: {
            50:  'var(--color-primary-50)',
            100: 'var(--color-primary-100)',
            200: 'var(--color-primary-200)',
            400: 'var(--color-primary-400)',
            600: 'var(--color-primary-600)',
            800: 'var(--color-primary-800)',
            900: 'var(--color-primary-900)',
          },
          teal: {
            50:  'var(--color-teal-50)',
            100: 'var(--color-teal-100)',
            200: 'var(--color-teal-200)',
            400: 'var(--color-teal-400)',
            600: 'var(--color-teal-600)',
            800: 'var(--color-teal-800)',
            900: 'var(--color-teal-900)',
          },
          danger: {
            50:  'var(--color-danger-50)',
            100: 'var(--color-danger-100)',
            400: 'var(--color-danger-400)',
            600: 'var(--color-danger-600)',
            800: 'var(--color-danger-800)',
            900: 'var(--color-danger-900)',
          },
          warning: {
            50:  'var(--color-warning-50)',
            100: 'var(--color-warning-100)',
            400: 'var(--color-warning-400)',
            600: 'var(--color-warning-600)',
            800: 'var(--color-warning-800)',
            900: 'var(--color-warning-900)',
          },
          caution: {
            50:  'var(--color-caution-50)',
            100: 'var(--color-caution-100)',
            400: 'var(--color-caution-400)',
            600: 'var(--color-caution-600)',
            800: 'var(--color-caution-800)',
            900: 'var(--color-caution-900)',
          },
          neutral: {
            50:  'var(--color-neutral-50)',
            100: 'var(--color-neutral-100)',
            200: 'var(--color-neutral-200)',
            300: 'var(--color-neutral-300)',
            400: 'var(--color-neutral-400)',
            600: 'var(--color-neutral-600)',
            900: 'var(--color-neutral-900)',
          },
          surface: {
            white: 'var(--color-surface-white)',
            page:  'var(--color-surface-page)',
            panel: 'var(--color-surface-panel)',
          },
        },
        emergency: '#DC2626',
      },
      borderRadius: {
        card: '24px',
        cardLarge: '32px',
        tile: '16px',
        button: '12px',
        chip: '8px',
      },
      spacing: {
        // Fluid gutters: scale smoothly from phone to desktop instead of a fixed 16/48px.
        screenX: 'clamp(1rem, 0.5rem + 2vw, 2rem)',
        screenTop: 'clamp(1.5rem, 1rem + 2vw, 3rem)',
        card: '12px',
        tabBar: '80px',
      },
      fontSize: {
        // Fluid type via clamp(): min on small screens, scales up to a desktop cap.
        screenTitle: ['clamp(1.5rem, 1.2rem + 1.5vw, 1.875rem)', { lineHeight: '1.2', fontWeight: '700' }],
        sectionTitle: ['clamp(1.125rem, 1rem + 0.6vw, 1.375rem)', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)', { lineHeight: '1.5' }],
        tab: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        cta: ['14px', { lineHeight: '1', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'display-bold': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'display-semi': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'body-medium': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'body-bold': ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
