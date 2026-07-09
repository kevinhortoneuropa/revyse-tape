import { vitePlugin as remix } from '@remix-run/dev'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tailwindcss(),
    remix({
      // Remix treats every file under app/routes as a route module. A colocated
      // `theme.test.ts` therefore becomes a route with no default export, and
      // the build fails — after typecheck, lint and tests have all gone green.
      ignoredRouteFiles: ['**/*.test.{ts,tsx}', '**/*.css'],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
})
