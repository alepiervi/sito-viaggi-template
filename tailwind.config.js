/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        // Brand colors from logo - #00A0E9, #F47E11
        brand: {
          blue: '#00A0E9',
          'blue-light': '#33B3EE',
          'blue-dark': '#0080BA',
          'blue-deeper': '#006694',
          orange: '#F47E11',
          'orange-light': '#F69940',
          'orange-dark': '#D06A0D',
          'orange-deeper': '#B55A0A',
          navy: '#0B1F3A',
          'navy-light': '#152D4F',
          'navy-dark': '#060F1D',
        },
        // Semantic color scales
        ocean: {
          50: 'rgb(var(--ocean-50) / <alpha-value>)',
          100: 'rgb(var(--ocean-100) / <alpha-value>)',
          200: 'rgb(var(--ocean-200) / <alpha-value>)',
          300: 'rgb(var(--ocean-300) / <alpha-value>)',
          400: 'rgb(var(--ocean-400) / <alpha-value>)',
          500: 'rgb(var(--ocean-500) / <alpha-value>)',
          600: 'rgb(var(--ocean-600) / <alpha-value>)',
          700: 'rgb(var(--ocean-700) / <alpha-value>)',
          800: 'rgb(var(--ocean-800) / <alpha-value>)',
          900: 'rgb(var(--ocean-900) / <alpha-value>)',
        },
        coral: {
          50: 'rgb(var(--coral-50) / <alpha-value>)',
          100: 'rgb(var(--coral-100) / <alpha-value>)',
          200: 'rgb(var(--coral-200) / <alpha-value>)',
          300: 'rgb(var(--coral-300) / <alpha-value>)',
          400: 'rgb(var(--coral-400) / <alpha-value>)',
          500: 'rgb(var(--coral-500) / <alpha-value>)',
          600: 'rgb(var(--coral-600) / <alpha-value>)',
          700: 'rgb(var(--coral-700) / <alpha-value>)',
          800: 'rgb(var(--coral-800) / <alpha-value>)',
          900: 'rgb(var(--coral-900) / <alpha-value>)',
        },
        sand: {
          50: '#FEFCF7',
          100: '#FDF8EF',
          200: '#FCF1DF',
          300: '#FAE9CF',
          400: '#F8E2BF',
          500: '#F5D5A0',
          600: '#E0BD80',
          700: '#CBA560',
          800: '#A08040',
          900: '#6B5520',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.6s ease-out forwards'
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
        'premium-hover': '0 20px 60px -15px rgba(0, 0, 0, 0.25)',
        'brand': '0 4px 14px 0 rgba(0, 160, 233, 0.25)',
        'brand-hover': '0 6px 20px 0 rgba(0, 160, 233, 0.35)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
