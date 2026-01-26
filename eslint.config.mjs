import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rules for production-grade code
  {
    rules: {
      // CRITICAL: Never allow explicit any - enforced as error
      "@typescript-eslint/no-explicit-any": "error",
      // Prefer const over let when variable is not reassigned
      "prefer-const": "error",
      // No unused variables
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
    },
  },
]);

export default eslintConfig;
