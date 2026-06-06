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
  {
    rules: {
      // React 19 신규 룰. P1 의 수동 fetch+setState 패턴까지 막히므로 warn 으로.
      // TanStack Query / Suspense use() 도입 시 다시 error 로 강화.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
