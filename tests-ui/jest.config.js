/** @type {import('jest').Config} */
// We deliberately do NOT use `preset: 'react-native'` because its setupFiles
// list includes a pre-bundled setup.js that does `global.performance = {...}` -
// which is a TypeError on Node 22+ (performance is a non-writable accessor).
// Our jest.setup.ts redefines `performance` as writable BEFORE requiring the
// RN setup file, so we control the load order.
module.exports = {
    rootDir: __dirname,
    testEnvironment: 'node',
    haste: {
        defaultPlatform: 'ios',
        platforms: ['android', 'ios', 'native']
    },
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': [
            'babel-jest',
            { configFile: require.resolve('./babel.config.js') }
        ],
        '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
            '../node_modules/react-native/jest/assetFileTransformer.js'
        )
    },
    transformIgnorePatterns: [
        'node_modules/(?!(?:(?:jest-)?react-native|@react-native(?:-community)?|react-native-render-html|@native-html|fastcomments-typescript)/)'
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: [
        '<rootDir>/jest.setup.ts'
    ],
    testMatch: [
        '<rootDir>/specs/**/*.test.ts',
        '<rootDir>/specs/**/*.test.tsx'
    ],
    moduleNameMapper: {
        '^react-native-enriched$': '<rootDir>/framework/mocks/react-native-enriched.tsx'
    },
    testTimeout: parseInt(process.env.FC_TEST_TIMEOUT_MS || '60000', 10),
    maxWorkers: 1
};
