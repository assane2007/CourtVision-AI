/** @type {import('jest').Config} */
module.exports = {
    preset: 'react-native',
    // Use ts-jest for TypeScript tests
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    jsx: 'react-jsx',
                    target: 'ES2020',
                    module: 'commonjs',
                    esModuleInterop: true,
                    moduleResolution: 'node',
                    strict: false,
                    skipLibCheck: true,
                },
            },
        ],
    },
    testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    // Don't transform node_modules except specific packages
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|react-native-reanimated|react-native-svg|react-native-safe-area-context|react-native-screens)/)',
    ],
    // Mock native modules
    moduleNameMapper: {
        '^react-native$': '<rootDir>/__mocks__/react-native.ts',
        '^expo-camera$': '<rootDir>/__mocks__/expo-camera.ts',
        '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.ts',
        '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.ts',
        '^expo-sharing$': '<rootDir>/__mocks__/expo-sharing.ts',
        '^expo-file-system$': '<rootDir>/__mocks__/expo-file-system.ts',
        '^expo-constants$': '<rootDir>/__mocks__/expo-constants.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.ts',
        '^@supabase/supabase-js$': '<rootDir>/__mocks__/supabase.ts',
    },
    testEnvironment: 'node',
    clearMocks: true,
    collectCoverageFrom: [
        'lib/**/*.ts',
        'hooks/**/*.ts',
        '!**/*.d.ts',
    ],
}
