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
      },
      borderRadius: {
        card: '24px',
        cardLarge: '32px',
        tile: '16px',
        button: '12px',
        chip: '8px',
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
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
