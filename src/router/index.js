import { createRouter, createWebHistory } from "vue-router";
import LanguageSelectView from "@/views/LanguageSelectView.vue";
import NameView from "@/views/NameView.vue";
import GameMode from "@/views/GameModeSelect.vue";
import singlePlayerRoutes from "./singlePlayer.js";
import twoPlayerRoutes from "./twoPlayer.js";

const routes = [
  {
    path: "/",
    name: "languageSelect",
    component: LanguageSelectView,
    meta: { title: "languages" },
  },
  {
    path: "/name",
    name: "playerName",
    component: NameView,
    meta: { title: "Player-Name" },
  },
  {
    path: "/game-mode",
    name: "gameMode",
    component: GameMode,
    meta: { title: "Game-Mode" },
  },
  // Подключаем маршруты для одного и двух игроков
  ...singlePlayerRoutes,
  ...twoPlayerRoutes,
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.afterEach((to) => {
  document.title = to.meta.title || "Мой сайт";
});

export default router;
