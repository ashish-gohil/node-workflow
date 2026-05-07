import type { Config } from "tailwindcss";
import * as animate from "tailwindcss-animate";

/**
 * FLOW Design System — Tailwind config (Next.js + shadcn + Turborepo)
 *
 * Drop into `apps/web/tailwind.config.ts` (or `packages/ui/tailwind.config.ts`
 * for a shared package). Pair with `globals.css` from this folder.
 *
 * Color tokens reference shadcn's HSL CSS-variable convention so all
 * shadcn/ui components work without modification.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
    // Monorepo: include shared UI package
    "../../packages/ui/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        // shadcn semantic tokens (HSL via CSS vars)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // FLOW raw palette — for the rare cases shadcn tokens don't fit
        forest: {
          50: "hsl(var(--forest-50))",
          100: "hsl(var(--forest-100))",
          200: "hsl(var(--forest-200))",
          300: "hsl(var(--forest-300))",
          400: "hsl(var(--forest-400))",
          500: "hsl(var(--forest-500))",
          600: "hsl(var(--forest-600))",
          700: "hsl(var(--forest-700))",
          800: "hsl(var(--forest-800))",
          900: "hsl(var(--forest-900))",
        },
        cream: {
          50: "hsl(var(--cream-50))",
          100: "hsl(var(--cream-100))",
          200: "hsl(var(--cream-200))",
          300: "hsl(var(--cream-300))",
          400: "hsl(var(--cream-400))",
        },
        lime: {
          200: "hsl(var(--lime-200))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
      },

      // ZERO radius is the default — only `rounded-node` opts in for workflow nodes.
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        node: "var(--node-radius)", // 2px — ONLY for workflow nodes
        full: "9999px", // ONLY for the notification dot / status pulses
      },

      borderWidth: {
        DEFAULT: "1px",
        // Stamped borders for marketing surfaces
        stamp: "2px",
        "stamp-thick": "3px",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Inter Tight"', "Inter", "sans-serif"],
      },

      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        "display-xl": [
          "56px",
          { lineHeight: "60px", letterSpacing: "-0.03em", fontWeight: "500" },
        ],
        "display-lg": [
          "44px",
          { lineHeight: "52px", letterSpacing: "-0.025em", fontWeight: "500" },
        ],
        h1: [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        h2: [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        h3: [
          "20px",
          { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        h4: [
          "17px",
          { lineHeight: "24px", letterSpacing: "0", fontWeight: "600" },
        ],
        h5: [
          "14px",
          { lineHeight: "20px", letterSpacing: "0", fontWeight: "600" },
        ],
        h6: [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "700" },
        ],
        "body-lg": ["16px", { lineHeight: "26px" }],
        "body-md": ["14px", { lineHeight: "22px" }],
        "body-sm": ["13px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        label: [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" },
        ],
        "mono-md": ["13px", { lineHeight: "20px" }],
        "mono-sm": ["12px", { lineHeight: "18px" }],
      },

      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.02em",
        wider: "0.04em",
      },

      spacing: {
        // 4pt rhythm overlay (Tailwind's defaults stay; these are explicit aliases)
        gutter: "24px",
        section: "48px",
        page: "64px",
      },

      boxShadow: {
        // Subtle (in-app) shadows — used sparingly in cream theme
        sm: "0 1px 0 0 hsl(var(--foreground) / 0.04)",
        DEFAULT: "0 1px 2px hsl(var(--foreground) / 0.06)",
        md: "0 2px 8px hsl(var(--foreground) / 0.08)",
        // Stamp (brutalist / marketing) shadows — hard offset, no blur
        "stamp-xs": "2px 2px 0 0 hsl(var(--foreground))",
        "stamp-sm": "4px 4px 0 0 hsl(var(--foreground))",
        stamp: "6px 6px 0 0 hsl(var(--foreground))",
        "stamp-lg": "8px 8px 0 0 hsl(var(--foreground))",
        "stamp-pressed": "1px 1px 0 0 hsl(var(--foreground))",
        "stamp-forest": "6px 6px 0 0 hsl(var(--primary))",
      },

      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "280ms",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0, 0, 1)",
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      keyframes: {
        "pulse-status": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "pulse-status": "pulse-status 1.4s ease-in-out infinite",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
