import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'
import onlyWarn from 'eslint-plugin-only-warn'
import importSort from 'eslint-plugin-simple-import-sort'
import spellcheck from 'eslint-plugin-spellcheck'

/**
 * Improved ESLint config
 */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,

  {
    plugins: {
      turbo: turboPlugin,
      'simple-import-sort': importSort,
      spellcheck: spellcheck,
    },

    rules: {
      // -----------------------------
      // 🚀 Turbo
      // -----------------------------
      'turbo/no-undeclared-env-vars': 'warn',

      // -----------------------------
      // 🎨 Formatting (Prettier aligned)
      // -----------------------------
      quotes: ['error', 'double', { avoidEscape: true }],
      semi: ['error', 'always'],

      // -----------------------------
      // 📦 Import Sorting
      // -----------------------------
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^node:.*'],
            ['^react', '^next', '^@?\\w'],
            ['^@/'],
            ['^\\.\\./', '^\\./'],
            ['^.+\\.css$', '^.+\\.scss$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // -----------------------------
      // 🧠 Spellcheck (FIXED for Tailwind)
      // -----------------------------
      'spellcheck/spell-checker': [
        'warn',
        {
          comments: true,
          strings: true,
          identifiers: false,
          lang: 'en_US',

          // 🔥 Ignore Tailwind patterns
          skipIfMatch: [
            '^[a-z]+-[0-9]+$', // bg-500, p-4
            '^[a-z]+-[a-z]+-[0-9]+$', // bg-red-500
            '^[a-z]+-[a-z]+$', // flex-row, items-center
            '^w-\\d+$',
            '^h-\\d+$',
            '^p[trblxy]?-[0-9]+$',
            '^m[trblxy]?-[0-9]+$',
            '^text-[a-z]+-[0-9]+$',
          ],

          skipWords: [
            'n8n',
            'Nextjs',
            'Nodejs',
            'Prisma',
            'SQS',
            'AWS',
            'tsx',
            'jsx',
            'api',
            'env',
            'props',
          ],
        },
      ],

      // -----------------------------
      // 🧱 Core JS (RELAXED)
      // -----------------------------
      eqeqeq: ['error', 'always'],
      curly: ['warn', 'all'], // was error
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'off', // not needed in modern React
      'no-var': 'error',
      'no-duplicate-imports': 'error',
    },
  },

  {
    plugins: {
      onlyWarn,
    },
  },

  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },
]
