import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Dev proxy target follows VITE_API_BASE_URL from .env, so switching between the
  // local backend and the deployed server is just a matter of editing that one line —
  // requests stay same-origin through this proxy either way, so CORS never applies.
  const apiTarget = (env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    plugins: [
      base44({
        // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
        // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
        hmrNotifier: true,
        navigationNotifier: true,
        analyticsTracker: true,
        visualEditAgent: true
      }),
      react(),
    ],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test:{
      globals:true,
      environment:'jsdom',
      setupFiles:'./src/setupTests.js',
    },
  };
});