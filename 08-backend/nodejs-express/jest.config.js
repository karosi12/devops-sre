module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/test/unit', '<rootDir>/src/test/integration'],
  testMatch: [  
    '**/src/test/unit/**/*.test.ts',
    '**/src/test/integration/**/*.test.ts',],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/dist/**/*.ts',
    '!<rootDir>/build/**/*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.js',
    '!<rootDir>/**/*.test.ts',
    '!<rootDir>/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testTimeout: 30000,
  silent: false,
  verbose: true,
};