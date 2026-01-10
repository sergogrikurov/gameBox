<script setup>
/* ================== IMPORTS ================== */
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "@/firebase/firebase.js";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage.js";

/* ================== LANGUAGE ================== */
const { language } = useLanguage();

/* ================== ROUTER / IDS ================== */
const route = useRoute();
const router = useRouter();
const gameId = route.params.roomId;

/* ================== STATE ================== */
const gameData = ref(null);
const myName = localStorage.getItem("playerName");

// блокировка доски после окончания
const blockBoard = true;

/* ================== COMPUTED ================== */
const isDraw = computed(() => {
  if (!gameData.value) return false;
  return !gameData.value.winner && gameData.value.board.every((c) => c !== "");
});

const gameFinished = computed(() => {
  return gameData.value?.winner || isDraw.value;
});

/* ================== ПРОВЕРКА ПОБЕДЫ ================== */
const checkWinner = (b) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { symbol: b[a], line: [a, c, d] };
    }
  }
  return null;
};

/* ================== ХОД ИГРОКА ================== */
const makeMove = async (index) => {
  if (!gameData.value) return;
  if (gameFinished.value && blockBoard) return;
  if (gameData.value.currentPlayer !== myName) return;
  if (gameData.value.board[index] !== "") return;

  const board = [...gameData.value.board];
  const symbol = myName === gameData.value.player1 ? "X" : "O";
  board[index] = symbol;

  const winnerResult = checkWinner(board);

  let winnerName = null;
  let winLine = [];
  let scoreUpdate = {};

  if (winnerResult) {
    winnerName = winnerResult.symbol === "X" ? gameData.value.player1 : gameData.value.player2;

    winLine = winnerResult.line;

    if (winnerResult.symbol === "X") {
      scoreUpdate.scorePlayer1 = (gameData.value.scorePlayer1 ?? 0) + 1;
    } else {
      scoreUpdate.scorePlayer2 = (gameData.value.scorePlayer2 ?? 0) + 1;
    }
  }

  const nextPlayer =
    myName === gameData.value.player1 ? gameData.value.player2 : gameData.value.player1;

  await updateDoc(doc(db, "games", gameId), {
    board,
    currentPlayer: winnerName ? gameData.value.currentPlayer : nextPlayer,
    winner: winnerName,
    winLine,
    lastActive: new Date(),
    ...scoreUpdate,
  });
};

/* ================== СБРОС ИГРЫ ================== */
const resetGame = async () => {
  if (!gameData.value) return;

  await updateDoc(doc(db, "games", gameId), {
    board: Array(9).fill(""),
    winner: null,
    winLine: [],
    currentPlayer: Math.random() > 0.5 ? gameData.value.player1 : gameData.value.player2,
    lastActive: new Date(),
  });
};

/* ================== ВСПОМОГАТЕЛЬНЫЕ ================== */
const cellClass = (cell) => {
  if (cell === "X") return "x";
  if (cell === "O") return "o";
  return "";
};

/* ================== ПОДПИСКА ================== */
let unsubscribe = null;

onMounted(async () => {
  const gameRef = doc(db, "games", gameId);

  unsubscribe = onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      router.replace("/");
      return;
    }

    const d = snap.data();
    gameData.value = d;

    // 🔴 если второй игрок вышел — редирект
    if (myName === d.player1 && d.leftPlayers?.[d.player2]) {
      router.replace("/");
    }

    if (myName === d.player2 && d.leftPlayers?.[d.player1]) {
      router.replace("/");
    }
  });

  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

/* ================== ВЫХОД ИЗ ИГРЫ ================== */

const handlePlayerLeft = async () => {
  if (!gameData.value) return;

  try {
    await updateDoc(doc(db, "games", gameId), {
      [`leftPlayers.${myName}`]: true,
      lastActive: new Date(),
    });
  } catch (e) {
    console.error(e);
  }
};

const handleBeforeUnload = (event) => {
  handlePlayerLeft();
  event.preventDefault();
  event.returnValue = "";
};

const exitGame = async () => {
  if (unsubscribe) unsubscribe();
  await handlePlayerLeft();
  router.push("/");
};
</script>

<template>
  <div class="tic-tac-toe">
    <div class="tic-tac-toe__container">
      <h2 class="tic-tac-toe__title">Tic-Tac-Toe</h2>
      <div class="tic-tac-toe__wrapper" v-if="gameData">
        <div class="tic-tac-toe__players">
          <div
            class="tic-tac-toe__player"
            :class="{ active: gameData.currentPlayer === gameData.player1 }"
          >
            <span class="tic-tac-toe__player_my-name">{{ gameData.player1 }}</span>
            <span class="tic-tac-toe__player_symbol-x">X</span>
            <span class="tic-tac-toe__player_score">{{ gameData.scorePlayer1 ?? 0 }}</span>
          </div>

          <div
            class="tic-tac-toe__player"
            :class="{ active: gameData.currentPlayer === gameData.player2 }"
          >
            <span class="tic-tac-toe__player_opponent">{{ gameData.player2 }}</span>
            <span class="tic-tac-toe__player_symbol-0">O</span>
            <span class="tic-tac-toe__player_score">{{ gameData.scorePlayer2 ?? 0 }}</span>
          </div>
        </div>

        <p class="tic-tac-toe__status" v-if="!gameData.winner && !isDraw">
          <span class="tic-tac-toe__status_move">{{ translations[language].move }}:</span>
          <span class="tic-tac-toe__status_name">{{ gameData.currentPlayer }}</span>
        </p>

        <p class="tic-tac-toe__status" v-if="gameData.winner">
          🏆 <span class="tic-tac-toe__status_win">{{ translations[language].win }}:</span>
          <span class="tic-tac-toe__status_winner">{{ gameData.winner }}</span>
        </p>

        <p class="tic-tac-toe__status" v-if="isDraw">
          🤝 <span class="tic-tac-toe__status_draw">{{ translations[language].draw }}</span>
        </p>

        <div>
          <button class="tic-tac-toe__reset-btn" @click="resetGame">
            {{ translations[language].newGame }}
          </button>
        </div>

        <div class="tic-tac-toe__board" :class="{ disabled: gameFinished && blockBoard }">
          <div
            v-for="(cell, index) in gameData.board"
            :key="index"
            class="tic-tac-toe__board_cell"
            :class="[cellClass(cell), gameData.winLine?.includes(index) ? 'win' : '']"
            @click="makeMove(index)"
          >
            {{ cell }}
          </div>
        </div>

        <div>
          <button class="tic-tac-toe__exit-btn" @click="exitGame">
            {{ translations[language].goOut }}
          </button>
        </div>
      </div>

      <div v-else>{{ translations[language].loading }}...</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tic-tac-toe {
  @include adaptive-value(padding-top, 50, 20);
  padding-bottom: rem(50);
  &__title {
    text-align: center;
    @include adaptive-value(font-size, 40, 20);
    @include adaptive-value(margin-top, 40, 20);
    @include adaptive-value(margin-bottom, 30, 10);
    color: green;
  }
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    & > *:not(:last-child) {
      @include adaptive-value(margin-bottom, 20, 10);
    }
  }
  &__players {
    & > *:not(:last-child) {
      margin-bottom: rem(10);
    }
    font-size: rem(20);
  }
  &__player {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: rem(200);
    &_my-name {
      width: rem(120);
      color: red;
    }
    &_symbol-x {
      color: red;
    }
    &_score {
      color: rgb(83, 83, 83);
    }
    &_opponent {
      width: rem(120);
      color: dodgerblue;
    }
    &_symbol-0 {
      color: dodgerblue;
    }
  }
  &__status {
    &_move {
      color: rgb(83, 83, 83);
      margin-right: rem(10);
    }
    &_name {
      color: green;
    }
    &_win {
      font-size: rem(20);
      margin-right: rem(10);
    }
    &_winner {
      font-size: rem(20);
      color: #2b702e;
    }
    &_draw {
      font-size: rem(20);
      color: #2b702e;
    }
  }
  &__reset-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    height: rem(49);
    font-size: rem(20);
    background-color: #4caf50;
    border-radius: rem(12);
    font-style: italic;
    color: #fff;
    @include adaptive-value(width, 250, 200);

    &:not(:disabled):hover {
      background-color: #45a049;
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
    }

    &:not(:disabled):active {
      background-color: #3e8e41;
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  &__exit-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    height: rem(49);
    font-size: rem(20);
    background-color: red;
    border-radius: rem(12);
    font-style: italic;
    color: #fff;
    @include adaptive-value(width, 250, 200);

    &:not(:disabled):hover {
      background-color: rgb(218, 3, 3);
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
    }

    &:not(:disabled):active {
      background-color: rgb(247, 14, 14);
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  &__board {
    max-width: rem(290);
    display: flex;
    flex-wrap: wrap;
    gap: rem(10);
    &_cell {
      width: rem(90);
      height: rem(90);
      border: 1px solid #333;
      border-radius: rem(4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      cursor: pointer;
      background: #f5f5f5;

      &:hover {
        scale: 1.05;
        border: 1px solid green;
      }
    }
  }
}
.tic-tac-toe__board.disabled {
  pointer-events: none;
  opacity: 0.7;
}

.tic-tac-toe__board_cell.win {
  animation: blink 0.8s infinite alternate;
  font-weight: bold;
}

.tic-tac-toe__board_cell.x {
  font-size: rem(46);
  color: red;
}

.tic-tac-toe__board_cell.o {
  font-size: rem(46);
  color: blue;
}

@keyframes blink {
  from {
    background: #ffff66;
  }
  to {
    background: #ffd700;
  }
}
</style>
