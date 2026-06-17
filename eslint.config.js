import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
    {
        ignores: ['**/dist', '**/dev-dist', '**/node_modules', '**/coverage']
    },
    {
        files: ['**/*.{ts,tsx,js,mjs,cjs}'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            stylistic.configs.customize({
                indent: 4,
                quotes: 'single',
                semi: true,
                jsx: true,
                arrowParens: true,
                braceStyle: '1tbs'
            })
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: { jsx: true }
            }
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true }
            ],
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/comma-dangle': ['error', 'never']
        }
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node }
        },
        plugins: {
            '@stylistic': stylistic
        },
        rules: {
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }]
        }
    }
);
