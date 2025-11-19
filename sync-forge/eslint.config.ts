import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginPlaywright from 'eslint-plugin-playwright'
import unusedImports from 'eslint-plugin-unused-imports'
import stylistic from '@stylistic/eslint-plugin'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: `app/files-to-lint`,
    files: [`**/*.{ts,mts,tsx,vue}`]
  },

  globalIgnores([`**/dist/**`, `**/dist-ssr/**`, `**/coverage/**`]),

  pluginVue.configs[`flat/recommended`],
  vueTsConfigs.recommendedTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  vueTsConfigs.strict,

  {
    ...pluginVitest.configs.all,
    files: [`src/**/__tests__/**/*`]
  },

  {
    ...pluginPlaywright.configs[`flat/recommended`],
    files: [`e2e/**/*.{test,spec}.{js,ts,jsx,tsx}`]
  },

  {
    plugins: {
      "unused-imports": unusedImports,
      '@stylistic': stylistic
    }
  },

  {
    rules: {
      '@stylistic/max-len': [`error`, { code: 120, ignoreComments: true, ignoreUrls: true, ignorePattern: `d="([\\s\\S]*?)"` }],
      'no-console': process.env.NODE_ENV === `production` ? `error` : `warn`,
      "unused-imports/no-unused-imports": `error`,
      '@stylistic/type-annotation-spacing': `warn`,
      '@stylistic/quotes': [
        `error`,
        `backtick`,
        {
          avoidEscape: true,
          allowTemplateLiterals: `always`
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [`error`],
      '@typescript-eslint/explicit-module-boundary-types': [`error`],
      "no-nested-ternary": `error`,
      "max-lines-per-function": [`error`, { max: 20, skipBlankLines: true, skipComments: true }],
      "no-unused-vars": `off`,
      "@typescript-eslint/no-unused-vars": [
        `error`,
        {
          argsIgnorePattern: `^_`,
          varsIgnorePattern: `^_`,
          caughtErrorsIgnorePattern: `^_`
        }
      ],
      complexity: [
        `error`,
        {
          max: 10
        }
      ],
      '@typescript-eslint/unbound-method': `off`,
      'max-depth': [`error`, { max: 4 }],
      '@typescript-eslint/array-type': [
        `error`,
        {
          default: `array-simple`
        }
      ],
      '@typescript-eslint/no-inferrable-types': [
        `error`,
        {
          ignoreParameters: true
        }
      ],
      '@typescript-eslint/no-unsafe-call': `error`,
      '@typescript-eslint/no-unused-expressions': `error`,
      '@typescript-eslint/no-use-before-define': `error`,
      '@typescript-eslint/no-shadow': [`error`],
      '@typescript-eslint/restrict-template-expressions': [
        `error`,
        {
          allowBoolean: true,
          allowNumber: true
        }
      ],
      '@typescript-eslint/unified-signatures': `error`,
      '@stylistic/brace-style': [`error`, `1tbs`],
      curly: [`error`, `all`],
      'consistent-return': `error`,
      'guard-for-in': `error`,
      'max-nested-callbacks': [`error`, { max: 4 }],
      '@stylistic/no-multi-spaces': `error`,
      'prefer-const': `error`,
      'no-debugger': `error`,
      '@stylistic/space-infix-ops': `error`,
      '@stylistic/arrow-spacing': `error`,
      '@stylistic/quote-props': [`error`, `as-needed`],
      '@stylistic/block-spacing': `error`,
      "@stylistic/comma-dangle": [`error`, `never`],
      '@stylistic/space-in-parens': [`error`, `never`],
      '@stylistic/key-spacing': `error`,
      '@stylistic/no-extra-semi': `error`,
      '@stylistic/semi': [`error`, `never`],
      '@stylistic/indent': [`error`, 2],
      eqeqeq: [`error`, `smart`],
      '@stylistic/eol-last': [`error`, `always`],
      '@stylistic/no-multiple-empty-lines': `error`,
      'no-use-before-define': `error`,
      'no-duplicate-imports': `error`
    }
  },

  {
    files: [`**/*.vue`],
    rules: {
      "max-lines-per-function": [`off`]
    }
  },
  {
    files: [`src/**/__tests__/**/*`],
    rules: {
      complexity: `off`,
      "max-lines-per-function": [`off`],
      "vitest/prefer-expect-assertions": [`off`],
      "vitest/prefer-lowercase-title": [`off`],
      "vitest/prefer-describe-function-title": [`off`],
      "vitest/require-mock-type-parameters": [`off`],
      "vitest/no-hooks": [`off`],
      //"vitest/prefer-spy-on": [`off`],
      "vitest/prefer-called-with": [`off`]
    }
  }
)
