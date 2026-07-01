import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Link'] JSXAttribute[name.name='href'] CallExpression[callee.name='withBasePath']",
          message:
            "Do not use withBasePath() in next/link <Link href>. Use appRoute() or a plain path — Next.js adds basePath automatically.",
        },
        {
          selector:
            "CallExpression[callee.object.name='router'][callee.property.name=/^(push|replace)$/] > CallExpression[callee.name='withBasePath']",
          message:
            "Do not use withBasePath() with router.push/replace. Use appRoute() or a plain path.",
        },
        {
          selector:
            "CallExpression[callee.name='redirect'] > CallExpression[callee.name='withBasePath']",
          message:
            "Do not use withBasePath() with redirect(). Use appRoute() or a plain path.",
        },
        {
          selector:
            "AssignmentExpression[left.property.name='pathname'] > CallExpression[callee.name='withBasePath']",
          message:
            "Do not use withBasePath() when setting url.pathname (middleware). Use appRoute() — Next.js adds basePath on redirect.",
        },
      ],
    },
  },
  {
    files: ["src/lib/supabase/middleware.ts", "src/middleware.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/base-path",
              importNames: ["withBasePath"],
              message:
                "Middleware must use appRoute(), not withBasePath(). Next.js adds basePath to cloned url.pathname redirects.",
            },
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
