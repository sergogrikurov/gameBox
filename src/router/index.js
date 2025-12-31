import { createRouter, createWebHistory } from "vue-router";
import LanguageSelectView from "@/views/LanguageSelectView.vue";
import NameView from "@/views/NameView.vue";
import GameMode from "@/views/GameModeSelect.vue";
import SinglePlayer from "@/views/SinglePlayer.vue";
import TwoPlayer from "@/views/TwoPlayer.vue";
import TwoPlayerGame from "@/views/TwoPlayerGame.vue";
import SinglePlayerGame from "@/views/SinglePlayerGame.vue";
import TwoPlayerRoomView from "@/views/TwoPlayerRoomView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
    {
      path: "/single-player",
      name: "singlePlayer",
      component: SinglePlayer,
      meta: { title: "Single-Player" },
    },
    {
      path: "/two-player",
      name: "twoPlayer",
      component: TwoPlayer,
      meta: { title: "Two-Player" },
    },
    {
      path: "/two-player-room/:game",
      name: "twoPlayerRoom",
      component: TwoPlayerRoomView,
      meta: {
        titleKey: "twoPlayerRoom",
      },
    },
    {
      path: "/two-player/:game",
      name: "twoPlayerGame",
      component: TwoPlayerGame,
      meta: {
        titleKey: "twoPlayerGame",
      },
    },
    {
      path: "/single-player/:game",
      name: "singlePlayerGame",
      component: SinglePlayerGame,
      meta: {
        titleKey: "singlePlayerGame",
      },
    },
  ],
});

router.afterEach((to) => {
  document.title = to.meta.title || "Мой сайт";
});

export default router;
