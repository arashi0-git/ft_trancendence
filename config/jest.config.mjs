import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: projectRoot,
  roots: ["<rootDir>/backend/src", "<rootDir>/frontend/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: path.join(projectRoot, "tsconfig.jest.json"),
      },
    ],
  },
  collectCoverageFrom: [
    "backend/src/**/*.ts",
    "frontend/src/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/"],
};
