import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import turboPlugin from 'eslint-plugin-turbo'
import tseslint from 'typescript-eslint'
import onlyWarn from 'eslint-plugin-only-warn'
import importSort from 'eslint-plugin-simple-import-sort'
import spellcheck from 'eslint-plugin-spellcheck'

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
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
      // Turbo plugin
      'turbo/no-undeclared-env-vars': 'warn',

      // Prettier formatting
      'prettier/prettier': [
        'error',
        {
          semi: true,
          singleQuote: false, // double quotes
          trailingComma: 'es5',
          printWidth: 100,
          tabWidth: 2,
          endOfLine: 'lf',
        },
      ],
      quotes: ['error', 'double', { avoidEscape: true }],
      semi: ['error', 'always'],

      // Import sorting
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^node:.*',
              '^fs$',
              '^path$',
              '^os$',
              '^crypto$',
              '^http$',
              '^https$',
            ],
            ['^react', '^next', '^@?\\w'],
            ['^@/'], // alias imports
            ['^\\.\\./', '^\\./'], // relative imports
            ['^.+\\.css$', '^.+\\.scss$'], // styles last
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // Spellcheck
      'spellcheck/spell-checker': [
        'warn',
        {
          comments: true,
          strings: true,
          identifiers: false,
          lang: 'en_US',
          skipWords: [
            'n8n',
            'Nextjs',
            'TS',
            'JSX',
            'Nodejs',
            'React',
            'Prisma',
            'SQS',
            'AWS',
          ],
        },
      ],

      // Recommended JS rules
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'consistent-return': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'warn',
      'no-var': 'error',
      'block-scoped-var': 'error',
      camelcase: ['warn', { properties: 'always' }],
      'no-duplicate-imports': 'error',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      ],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
]
