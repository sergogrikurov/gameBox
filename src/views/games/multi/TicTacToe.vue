<template>
  <div class="tic-tac-toe">
    <h2>Крестики-нолики</h2>

    <div v-if="gameData">
      <!-- Игроки -->
      <div class="players">
        <div class="player" :class="{ active: gameData.currentPlayer === gameData.player1 }">
          {{ gameData.player1 }}
          <span class="symbol x">X</span>
          — {{ gameData.scorePlayer1 ?? 0 }}
        </div>

        <div class="player" :class="{ active: gameData.currentPlayer === gameData.player2 }">
          {{ gameData.player2 }}
          <span class="symbol o">O</span>
          — {{ gameData.scorePlayer2 ?? 0 }}
        </div>
      </div>

      <!-- Статус -->
      <p class="status" v-if="!gameData.winner && !isDraw">
        Ход игрока: <strong>{{ gameData.currentPlayer }}</strong>
      </p>

      <p class="status" v-if="gameData.winner">
        🏆 Победил: <strong>{{ gameData.winner }}</strong>
      </p>

      <p class="status" v-if="isDraw">🤝 Ничья</p>

      <!-- Поле -->
      <div class="board" :class="{ disabled: gameFinished && blockBoard }">
        <div
          v-for="(cell, index) in gameData.board"
          :key="index"
          class="cell"
          :class="[cellClass(cell), gameData.winLine?.includes(index) ? 'win' : '']"
          @click="makeMove(index)"
        >
          {{ cell }}
        </div>
      </div>

      <!-- Кнопки управления -->
      <div class="buttons">
        <!-- Кнопка всегда активна -->
        <button class="reset" @click="resetGame">Новая игра</button>
        <button class="exit" @click="exitGame">Выйти</button>
        <button class="back" @click="exitGame">Назад</button>
      </div>
    </div>

    <div v-else>Загрузка…</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { db } from "@/firebase/firebase.js";
import { doc, getDoc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";

const route = useRoute();
const router = useRouter();
const gameId = route.params.roomId;

const gameData = ref(null);
const myName = localStorage.getItem("playerName");

let unsubscribe = null;

// Блокировка доски после окончания игры (можно отключить)
const blockBoard = true;

onMounted(async () => {
  const gameRef = doc(db, "games", gameId);

  // Получаем начальные данные
  const snap = await getDoc(gameRef);
  if (snap.exists()) gameData.value = snap.data();

  // Подписка на изменения документа
  unsubscribe = onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      router.push({ name: "twoPlayerGameList" });
      return;
    }
    gameData.value = snap.data();
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const isDraw = computed(() => {
  if (!gameData.value) return false;
  return !gameData.value.winner && gameData.value.board.every((c) => c !== "");
});

const gameFinished = computed(() => {
  return gameData.value?.winner || isDraw.value;
});

// Ход игрока
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

// Сброс игры
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

// Выйти/назад
const exitGame = async () => {
  if (!gameData.value) return;

  const gameRef = doc(db, "games", gameId);
  const roomRef = doc(db, "rooms", gameData.value.roomId);

  await deleteDoc(gameRef);
  await deleteDoc(roomRef);

  router.push({ name: "twoPlayerGameList" });
};

// Проверка победной линии
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

const cellClass = (cell) => {
  if (cell === "X") return "x";
  if (cell === "O") return "o";
  return "";
};
</script>

<style scoped>
.tic-tac-toe {
  padding: 20px;
  font-family: sans-serif;
}

.players {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.player {
  background: #eee;
  padding: 6px 10px;
  border-radius: 6px;
}

.player.active {
  background: #dff0d8;
  font-weight: bold;
}

.symbol {
  margin-left: 6px;
  font-weight: bold;
}

.symbol.x,
.cell.x {
  color: red;
}

.symbol.o,
.cell.o {
  color: dodgerblue;
}

.status {
  margin: 10px 0;
  font-size: 16px;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 70px);
  gap: 6px;
  margin: 10px 0;
}

.board.disabled {
  pointer-events: none;
  opacity: 0.7;
}

.cell {
  width: 70px;
  height: 70px;
  border: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  cursor: pointer;
  background: #f5f5f5;
}

.cell.win {
  animation: blink 0.8s infinite alternate;
  font-weight: bold;
}

@keyframes blink {
  from {
    background: #ffff66;
  }
  to {
    background: #ffd700;
  }
}

.buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.reset,
.exit,
.back {
  padding: 6px 12px;
  cursor: pointer;
}
</style>
