import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vitestPlugin from '@vitest/eslint-plugin'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

export default [
  // Ignore patterns
  {
    ignores: [`dist/**`, `node_modules/**`, `coverage/**`, `vitest.config.ts`]
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Global configuration for all TypeScript files
  {
    files: [`**/*.ts`],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: `latest`,
        sourceType: `module`,
        project: [`./tsconfig.eslint.json`]
      },
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stylistic': stylistic,
      'unused-imports': unusedImports
    },
    rules: {
      // TypeScript specific rules
      ...tseslint.configs[`recommended`].rules,
      '@typescript-eslint/no-explicit-any': `warn`,
      '@typescript-eslint/no-unused-vars': `off`, // Turned off in favor of unused-imports
      '@typescript-eslint/explicit-function-return-type': [`error`],
      '@typescript-eslint/explicit-module-boundary-types': [`error`],
      '@typescript-eslint/no-floating-promises': `error`,
      '@typescript-eslint/await-thenable': `error`,
      '@typescript-eslint/no-misused-promises': `error`,
      '@typescript-eslint/no-unsafe-call': `error`,
      '@typescript-eslint/no-unused-expressions': `error`,
      '@typescript-eslint/no-use-before-define': `error`,
      '@typescript-eslint/no-shadow': [`error`],
      '@typescript-eslint/consistent-type-imports': [`error`, {
        prefer: `type-imports`,
        fixStyle: `inline-type-imports`
      }],
      '@typescript-eslint/array-type': [`error`, { default: `array-simple` }],
      '@typescript-eslint/no-inferrable-types': [`error`, { ignoreParameters: true }],
      '@typescript-eslint/restrict-template-expressions': [
        `error`,
        { allowBoolean: true, allowNumber: true }
      ],
      '@typescript-eslint/unified-signatures': `error`,

      // Unused imports handling
      'unused-imports/no-unused-imports': `error`,
      'unused-imports/no-unused-vars': [
        `warn`,
        {
          vars: `all`,
          varsIgnorePattern: `^_`,
          args: `after-used`,
          argsIgnorePattern: `^_`
        }
      ],

      // Stylistic rules
      '@stylistic/indent': [`error`, 2],
      '@stylistic/quotes': [`error`, `backtick`, { avoidEscape: true, allowTemplateLiterals: `always` }],
      '@stylistic/semi': [`error`, `never`],
      '@stylistic/comma-dangle': [`error`, `never`],
      '@stylistic/brace-style': [`error`, `1tbs`],
      '@stylistic/object-curly-spacing': [`error`, `always`],
      '@stylistic/array-bracket-spacing': [`error`, `never`],
      '@stylistic/arrow-parens': [`error`, `as-needed`],
      '@stylistic/arrow-spacing': `error`,
      '@stylistic/block-spacing': `error`,
      '@stylistic/space-infix-ops': `error`,
      '@stylistic/space-in-parens': [`error`, `never`],
      '@stylistic/key-spacing': `error`,
      '@stylistic/no-extra-semi': `error`,
      '@stylistic/no-multi-spaces': `error`,
      '@stylistic/quote-props': [`error`, `as-needed`],
      '@stylistic/type-annotation-spacing': `warn`,
      '@stylistic/eol-last': [`error`, `always`],
      '@stylistic/no-multiple-empty-lines': `error`,
      '@stylistic/max-len': [`error`, { 
        code: 120, 
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }],

      // Code complexity & quality
      complexity: [`error`, { max: 10 }],
      'max-depth': [`error`, { max: 4 }],
      'max-nested-callbacks': [`error`, { max: 4 }],
      'max-lines-per-function': [`error`, { 
        max: 50, 
        skipBlankLines: true, 
        skipComments: true 
      }],
      'no-nested-ternary': `error`,
      'consistent-return': `error`,
      'guard-for-in': `error`,

      // General code quality
      'no-console': `error`,
      'no-debugger': `error`,
      'prefer-const': `error`,
      'no-var': `error`,
      eqeqeq: [`error`, `smart`],
      curly: [`error`, `all`],
      'no-throw-literal': `error`,
      'prefer-template': `error`,
      'prefer-arrow-callback': `error`,
      'no-use-before-define': `error`,
      'no-duplicate-imports': `error`
    }
  },

  // Test files configuration
  {
    files: [`src/**/__tests__/**/*.ts`],
    plugins: {
      vitest: vitestPlugin
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': `off`,
      complexity: `off`,
      'max-lines-per-function': `off`,
      'vitest/expect-expect': `error`,
      'vitest/no-disabled-tests': `warn`,
      'vitest/no-focused-tests': `error`,
      'vitest/valid-expect': `error`,
      'vitest/consistent-test-it': [`error`, { fn: `it` }]
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...vitestPlugin.environments.env.globals
      }
    }
  }
]
