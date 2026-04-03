import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      ".next-runtime",
      ".next-runtime/**",
      ".next-runtime.*",
      ".next-runtime.*/**",
      "out/**",
      "coverage/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default config;
