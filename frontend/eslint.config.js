import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'd3',
              message:
                'Banned: pulls in d3-selection/d3-transition (DOM ownership). Import granular math submodules only: d3-shape, d3-scale, d3-random, d3-force.',
            },
            {
              name: 'd3-selection',
              message:
                'Banned: DOM-mutating. React owns every SVG element in this project — see CONTEXT.md.',
            },
            {
              name: 'd3-transition',
              message:
                'Banned: DOM-mutating, depends on d3-selection. Use CSS transitions on React-rendered elements instead.',
            },
          ],
        },
      ],
    },
  },
)
