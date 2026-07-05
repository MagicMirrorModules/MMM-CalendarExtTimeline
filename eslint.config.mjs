import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
        config: "readonly",
        Log: "readonly",
        Module: "readonly"
      }
    },
    plugins: {
      "@stylistic": stylistic
    },
    extends: [js.configs.recommended, stylistic.configs.recommended],
    rules: {
      "@stylistic/max-statements-per-line": ["error", { max: 2 }],
      "no-var": "error",
      "one-var": ["error", "never"],
      "prefer-const": "error"
    }
  }
]);
