/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Prefer TS sources over any stale compiled JS artifacts in src/.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Files ending in -helpers or -fixtures inside __tests__ are shared utilities, not suites.
  // Files ending in -spike are exploratory components meant to run in the example app, not Jest.
  testPathIgnorePatterns: [
    '/node_modules/',
    '-helpers\\.ts$',
    '-fixtures\\.ts$',
    '-spike\\.tsx?$',
    // The tests-ui suite has its own jest config (UI tests against the real
    // FastComments backend; mounts RN components). Run via `npm run test-ui`.
    '/tests-ui/',
    // The web lane runs under vitest + jsdom. Run via `npm run test-web`.
    '/example-web/'
  ],
  transform: {
    '.(ts|tsx)': 'ts-jest'
  },
  moduleNameMapper: {
    // The real react-native is Flow-typed source node cannot parse; unit tests
    // only need the few VALUES the SDK imports at module scope (see the stub).
    '^react-native$': '<rootDir>/src/__test-stubs__/react-native.ts'
  }
};
