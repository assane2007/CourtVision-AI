/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    moduleNameMapper: {
        '^@courtvision/ai$': '<rootDir>/../ai/src/index.ts',
        '^@courtvision/ai/(.*)$': '<rootDir>/../ai/src/$1',
        '^@courtvision/shared$': '<rootDir>/../shared/src/index.ts',
        '^@courtvision/shared/(.*)$': '<rootDir>/../shared/src/$1',
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
};
