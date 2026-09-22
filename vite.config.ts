import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode, command }) => ({
  plugins: [
    react(),
    {
      name: "demo-wasm-csp",
      transformIndexHtml(html) {
        const env = loadEnv(mode, process.cwd());
        const extra =
          (env.VITE_DEMO_MODE === "true" ? " 'wasm-unsafe-eval'" : "") +
          (command === "serve" ? " 'unsafe-inline'" : "");
        let apiOrigin = "http://127.0.0.1:3000",
          lookupOrigin = "https://outfeidun.vercel.app",
          dataOrigins = apiOrigin;
        try {
          apiOrigin = new URL(env.VITE_API_BASE_URL || apiOrigin).origin;
        } catch {
          /* runtime config error is user-facing */
        }
        try {
          lookupOrigin = new URL(env.VITE_GLASS_LOOKUP_API_URL || lookupOrigin)
            .origin;
        } catch {
          /* optional lookup */
        }
        if (env.VITE_DATA_BACKEND === "supabase" && env.VITE_SUPABASE_URL) {
          try {
            const url = new URL(env.VITE_SUPABASE_URL);
            dataOrigins = `${url.origin} wss://${url.host}`;
          } catch {
            dataOrigins = apiOrigin;
          }
        } else dataOrigins = apiOrigin;
        return html
          .replace("script-src 'self'", "script-src 'self'" + extra)
          .replace("__DATA_ORIGINS__", dataOrigins)
          .replace("__LOOKUP_ORIGIN__", lookupOrigin);
      },
    },
  ],
  base: "./",
  server: { port: 5178, strictPort: true },
  build: { sourcemap: false },
}));
