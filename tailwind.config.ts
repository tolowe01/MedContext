import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dialogue: {
          bg: '#211F1F',
          surface: '#383937',
          nav: '#373835',
          text: '#F6EEE6',
          textMuted: '#C8BDB4',
          accent: '#F29B79',
          border: '#4A4847',
          chip: '#E3D7CB',
          gradientEnd: '#D3F1F5',
        },
        emergency: '#DC2626',
        // Linear-inspired system (awesome-design-md/linear.app). Used by the
        // pharmacist-initiated flow screens. Legacy screens keep `dialogue`.
        ln: {
          canvas: '#010102',
          surface1: '#0f1011',
          surface2: '#141516',
          surface3: '#18191a',
          surface4: '#191a1b',
          hairline: '#23252a',
          hairlineStrong: '#34343a',
          hairlineTertiary: '#3e3e44',
          ink: '#f7f8f8',
          inkMuted: '#d0d6e0',
          inkSubtle: '#8a8f98',
          inkTertiary: '#62666d',
          primary: '#5e6ad2',
          primaryHover: '#828fff',
          primaryFocus: '#5e69d1',
          success: '#27a644',
        },
      },
      borderRadius: {
        card: '24px',
        cardLarge: '32px',
        tile: '16px',
        button: '12px',
        chip: '8px',
        // Linear radii scale
        'ln-xs': '4px',
        'ln-sm': '6px',
        'ln-md': '8px',
        'ln-lg': '12px',
        'ln-xl': '16px',
      },
      spacing: {
        screenX: '16px',
        screenTop: '48px',
        card: '12px',
        tabBar: '80px',
      },
      fontSize: {
        screenTitle: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        sectionTitle: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.5' }],
        tab: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        cta: ['14px', { lineHeight: '1', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      fontFamily: {
        'display-bold': ['var(--font-cormorant)', 'Georgia', 'serif'],
        'display-semi': ['var(--font-cormorant)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'body-medium': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'body-bold': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // Linear voice: one continuous Inter cut (documented Linear substitute)
        // for both display and text; negative tracking applied per-use.
        'ln-display': ['var(--font-inter)', 'SF Pro Display', 'system-ui', 'sans-serif'],
        'ln-text': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'ln-mono': ['ui-monospace', 'SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        'ln-display': '-0.022em',
        'ln-tight': '-0.014em',
        'ln-eyebrow': '0.03em',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
