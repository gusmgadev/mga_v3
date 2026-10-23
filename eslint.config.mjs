import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Fronteras entre zonas (AGENTS.md §1.2 SEP-2): público no importa de privado, privado
// no importa de público y shared no importa de ninguna.
const zonaPublica = [
  "app/(public)/**/*.{ts,tsx}",
  "app/api/public/**/*.{ts,tsx}",
  "components/public/**/*.{ts,tsx}",
  "lib/public/**/*.{ts,tsx}",
];
const zonaPrivada = [
  "app/(dashboard)/**/*.{ts,tsx}",
  "app/(superadmin)/**/*.{ts,tsx}",
  "app/api/dashboard/**/*.{ts,tsx}",
  "app/api/superadmin/**/*.{ts,tsx}",
  "components/private/**/*.{ts,tsx}",
  "lib/private/**/*.{ts,tsx}",
];
const zonaShared = [
  "components/shared/**/*.{ts,tsx}",
  "lib/shared/**/*.{ts,tsx}",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: zonaPublica,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/private/*", "@/components/private/*"], message: "SEP-2: la zona pública no importa de la privada." },
          ],
        },
      ],
    },
  },
  {
    files: zonaPrivada,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/public/*", "@/components/public/*"], message: "SEP-2: la zona privada no importa de la pública." },
          ],
        },
      ],
    },
  },
  {
    files: zonaShared,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/public/*", "@/components/public/*", "@/lib/private/*", "@/components/private/*"], message: "SEP-2: shared no importa de ninguna zona." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
