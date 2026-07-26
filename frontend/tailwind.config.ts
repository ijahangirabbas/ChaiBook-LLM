import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
        },
        bg: {
          DEFAULT: '#F7F8FC',
          dark: '#000000',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#0A0A0A',
        },
        border: {
          DEFAULT: '#E5E7EB',
          dark: '#1C1C1C',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          'primary-dark': '#F9FAFB',
          'secondary-dark': '#9CA3AF',
          'muted-dark': '#6B7280',
        },
        success: '#16A34A',
        danger: '#EF4444',
        sidebar: {
          DEFAULT: '#FFFFFF',
          dark: '#050505',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        hero: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        heading: ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        subheading: ['22px', { lineHeight: '1.4', fontWeight: '600' }],
        'card-title': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.6' }],
        caption: ['14px', { lineHeight: '1.5' }],
        small: ['12px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        btn: '18px',
        input: '20px',
        card: '22px',
        modal: '24px',
        'sidebar-item': '14px',
        xl2: '20px',
        xl3: '24px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 12px 30px rgba(0,0,0,0.08)',
        'card-dark': '0 4px 20px rgba(0,0,0,0.5)',
        'card-dark-hover': '0 8px 24px rgba(0,0,0,0.7)',
        modal: '0 20px 60px rgba(0,0,0,0.12)',
        'modal-dark': '0 20px 60px rgba(0,0,0,0.9)',
        input: '0 0 0 3px rgba(79,70,229,0.15)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

export default config
