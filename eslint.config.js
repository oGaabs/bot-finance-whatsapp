import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import globals from "globals"

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      semi: ["error", "never"],
      indent: ["error", 2, { SwitchCase: 1 }],
      "nonblock-statement-body-position": ["error", "below"],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] } // permite agrupamentos consecutivos
      ]
    }
  },
])
