/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  testMatch: [
    "<rootDir>/src/**/*.(test|spec).{ts,tsx,js,jsx}",
  ],

  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      useESM: false,
    }],
  },

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  moduleNameMapper: {
    // Usa paths de tsconfig
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mapeos específicos
    "^@/hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "\\.(css|scss|sass)$": "<rootDir>/test-style-mock.js",
  },

  // Añade estas configuraciones
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  modulePaths: ["<rootDir>/src"],
  
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["lcov", "text", "text-summary"],

  collectCoverageFrom: [
    "src/**/*.{ts,tsx,js,jsx}",
    "!src/**/__tests__/**",
    "!src/**/mocks/**",
    "!src/**/fixtures/**",
    "!src/**/types/**",
    "!src/**/test-utils/**",
    "!src/app/layout.{ts,tsx}",
    "!src/app/page.{ts,tsx}",
  ],

  coveragePathIgnorePatterns: ["/node_modules/", ".next/"],
};