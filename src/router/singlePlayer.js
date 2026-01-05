import SinglePlayerGameList from "@/views/SinglePlayerGameList.vue";
import SinglePlayerGame from "@/views/SinglePlayerGame.vue";

import Memory from "@/views/games/single/MemoryGame.vue";
import TicTacToe from "@/views/games/single/Tic-Tac-Toe.vue";
import BattleShip from "@/views/games/single/BattleShip.vue";

export default [
  {
    path: "/single-player-game-list",
    name: "singlePlayerGameList",
    component: SinglePlayerGameList,
    meta: {
      title: "Single-Player-Game-List",
    },
  },
  {
    path: "/single-player/:game",
    name: "singlePlayerGame",
    component: SinglePlayerGame,
    meta: {
      title: "singlePlayerGame",
    },
  },
  // Добавляем игры
  {
    path: "/single-player/memory",
    name: "singleMemory",
    component: Memory,
    meta: {
      title: "Memory",
    },
  },
  {
    path: "/single-player/TicTacToe",
    name: "ticTacToe",
    component: TicTacToe,
    meta: {
      title: "TicTacToe",
    },
  },
  {
    path: "/single-player/battleShip",
    name: "battleShip",
    component: BattleShip,
    meta: {
      title: "BattleShip",
    },
  },
];
