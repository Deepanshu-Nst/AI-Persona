import next from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    plugins: {
      "@next/next": next,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...next.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: ["node_modules", ".next", "corpus", "data", "scripts", "tests"],
  },
];
