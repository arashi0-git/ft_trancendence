module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname + "/..",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "unused-imports"],
  extends: ["eslint:recommended"],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    "dist/**/*",
    "coverage/**/*",
    "node_modules/**/*",
    "config/**/*",
  ],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "no-unused-vars": "off",
  },
};
