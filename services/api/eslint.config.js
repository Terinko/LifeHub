import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.strict],
    languageOptions: { globals: globals.node },
    rules: {
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
]);
