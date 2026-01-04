import TwoPlayerGameList from "@/views/TwoPlayerGameList.vue";
import TwoPlayerRoomView from "@/views/TwoPlayerRoomView.vue";
import TwoPlayerGame from "@/views/TwoPlayerGame.vue";

import TicTacToe from "@/views/games/multi/TicTacToe.vue";
import Battleship from "@/views/games/multi/BattleShip.vue";

export default [
  {
    path: "/two-player-game-list",
    name: "twoPlayerGameList",
    component: TwoPlayerGameList,
    meta: { title: "Two-Player-Game-List" },
  },
  {
    path: "/two-player-room/:game",
    name: "twoPlayerRoom",
    component: TwoPlayerRoomView,
    meta: {
      title: "twoPlayerRoom",
    },
  },
  {
    path: "/two-player-game/:roomId",
    name: "twoPlayerGame",
    component: TwoPlayerGame,
    meta: {
      title: "twoPlayerGame",
    },
  },
  // Добавляем игры
  {
    path: "/two-player-game/tic-tac-toe/:roomId",
    name: "twoPlayerTicTacToe",
    component: TicTacToe,
    meta: {
      title: "TicTacToe",
    },
  },

  {
    path: "/two-player-game/battleShip/:roomId",
    name: "twoPlayerBattleship",
    component: Battleship,
    meta: {
      title: "Battleship",
    },
  },
];
