import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { lunaVitePlugin } from "./server/lunaVitePlugin.js";

export default defineConfig({
  plugins: [tailwindcss(), react(), lunaVitePlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.BRIGHTLINE_API_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        bypass(request) {
          const url = request.url || "";
          if (url === "/api/luna" || url.startsWith("/api/luna?")) return url;
        },
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
