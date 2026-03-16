import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-text-primary)',
        muted: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text-muted)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
        },
        border: 'var(--color-border)',
        ring: 'var(--color-ring)',
        card: {
          DEFAULT: 'var(--color-card-background)',
          foreground: 'var(--color-card-foreground)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'calc(var(--radius-md) - 2px)',
      },
    },
  },
  plugins: [],
}

export default config
