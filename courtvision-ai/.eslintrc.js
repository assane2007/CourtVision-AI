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
    ignorePatterns: ['dist/', 'node_modules/', '.next/', 'coverage/'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'react-hooks/purity': 'warn',
        'react-hooks/immutability': 'warn',
        'react-hooks/preserve-manual-memoization': 'warn',
        'react-hooks/set-state-in-effect': 'warn',
        'react-hooks/refs': 'warn',
        'react-hooks/exhaustive-deps': 'warn'
    }
};
