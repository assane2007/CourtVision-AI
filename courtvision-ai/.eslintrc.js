module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    extends: [
        'plugin:@typescript-eslint/recommended',
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
        // aucun console.log en production
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]
    }
};
