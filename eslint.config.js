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
      "no-tabs": "error"
    }
  },
])
