import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    root: ".",
    define: {
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || "/api"),
    },
    build: {
      target: ["chrome87", "firefox78"],
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Babylon.js and related libraries into a separate chunk
            if (id.includes("@babylonjs")) {
              return "babylon";
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
