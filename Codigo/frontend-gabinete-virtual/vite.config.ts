import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const usePolling =
  process.env.CHOKIDAR_USEPOLLING === "1" ||
  process.env.VITE_USE_POLLING === "1";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      usePolling,
      interval: usePolling ? 250 : undefined,
    },
  },
});
