import {
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
  vitePlugin as remix,
} from '@remix-run/dev'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { getLoadContext } from './load-context'

export default defineConfig({
  plugins: [
    tailwindcss(),
    // Must come before remix(): the plugin throws at config-resolve time
    // otherwise. It runs wrangler's getPlatformProxy so `context.cloudflare`
    // exists in dev, and — crucially — sets ssr.resolve.externalConditions to
    // ["workerd", "worker"], which is what makes `react-dom/server` resolve to
    // the edge build.
    remixCloudflareDevProxy({ getLoadContext }),
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

  // The plugin's `externalConditions` only govern externalised dependencies in
  // dev. These govern the bundled production server build, so `react-dom/server`
  // resolves to the edge build there too.
  ssr: {
    resolve: {
      conditions: ['workerd', 'worker', 'browser'],
    },
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
  },
})
