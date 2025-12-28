import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [vue(), vueDevTools()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // ⬅ сюда добавляем глобальный SCSS
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/assets/scss/variables" as *;
          @use "@/assets/scss/adaptive-value" as *;
          @use "@/assets/scss/_functions.scss" as *;
        `,
      },
    },
  },
});
