import globals from "globals";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist/**", "node_modules/**", "server/node_modules/**"] },
  {
    files: ["src/**/*.{js,jsx}", "server/**/*.js", "server/**/*.mjs", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["src/**/*.{test,spec}.{js,jsx}", "server/**/*.test.mjs"],
    rules: {
      // Testes de caracterização antigos mantêm alguns helpers/imports de cenário;
      // no-undef continua ativo, mas a limpeza desses fixtures não bloqueia o CI.
      "no-unused-vars": "off",
    },
  },
];
