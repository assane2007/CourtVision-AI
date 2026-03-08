module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'prettier'
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    ignorePatterns: ['dist/', 'node_modules/', '.next/', 'coverage/', '__mocks__/'],
    rules: {
        // TypeScript strictness
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/prefer-optional-chain': 'warn',
        '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

        // Code quality
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'no-debugger': 'error',
        'no-duplicate-imports': 'error',
        'no-template-curly-in-string': 'warn',
        'prefer-const': 'error',
        'eqeqeq': ['error', 'always'],

        // React Hooks
        'react-hooks/purity': 'warn',
        'react-hooks/immutability': 'warn',
        'react-hooks/preserve-manual-memoization': 'warn',
        'react-hooks/set-state-in-effect': 'warn',
        'react-hooks/refs': 'warn',
        'react-hooks/exhaustive-deps': 'warn'
    },
    overrides: [
        {
            // Relax rules for test files
            files: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                'no-console': 'off',
            }
        }
    ]
};
