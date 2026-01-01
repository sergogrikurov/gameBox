<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { db } from "@/firebase/firebase.js";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

const route = useRoute();
const roomId = route.params.roomId;

const storedName = localStorage.getItem("playerName");
let playerName = storedName;

if (!storedName) {
  playerName = prompt("Введите ваше имя");
  if (playerName) {
    localStorage.setItem("playerName", playerName);
  } else {
    // если пользователь ничего не ввёл, задаём дефолт
    playerName = "Игрок";
    localStorage.setItem("playerName", playerName);
  }
}

// Состояние комнаты
const board = ref(Array(9).fill(""));
const currentPlayer = ref("X");
const result = ref(null);
const roomData = ref({
  player1: "",
  player2: "",
  wins1: 0,
  wins2: 0,
  totalGames: 0,
  status: "waiting",
});

// Вычисляемый символ для этого игрока
const mySymbol = computed(() => {
  if (playerName === roomData.value.player1) return "X";
  if (playerName === roomData.value.player2) return "O";
  return "";
});

// Имя текущего игрока, чей ход
const currentPlayerName = computed(() => {
  if (!roomData.value.player1 || !roomData.value.player2) return "";
  return currentPlayer.value === "X" ? roomData.value.player1 : roomData.value.player2;
});

const winnerName = computed(() => {
  if (result.value === "X") return roomData.value.player1;
  if (result.value === "O") return roomData.value.player2;
  return "";
});

// Классы для клеток
const cellClass = (cell) => (cell === "X" ? "x" : cell === "O" ? "o" : "");

// Проверка победителя
function checkWinner(b) {
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
  for (let [a, bIndex, c] of lines) {
    if (b[a] && b[a] === b[bIndex] && b[a] === b[c]) return b[a];
  }
  if (b.every((cell) => cell)) return "draw";
  return null;
}

// Сделать ход
async function makeMove(index) {
  if (
    !mySymbol.value ||
    board.value[index] ||
    result.value ||
    mySymbol.value !== currentPlayer.value
  )
    return;

  board.value[index] = mySymbol.value;
  const nextPlayer = mySymbol.value === "X" ? "O" : "X";
  const winner = checkWinner(board.value);

  const roomRef = doc(db, "rooms", roomId);

  const updates = {
    board: board.value,
    currentPlayer: nextPlayer,
    result: winner,
  };

  // ✅ если есть победитель — сразу обновляем счёт
  if (winner === "X") {
    updates.wins1 = roomData.value.wins1 + 1;
    updates.totalGames = roomData.value.totalGames + 1;
  } else if (winner === "O") {
    updates.wins2 = roomData.value.wins2 + 1;
    updates.totalGames = roomData.value.totalGames + 1;
  } else if (winner === "draw") {
    updates.totalGames = roomData.value.totalGames + 1;
  }

  await updateDoc(roomRef, updates);
}

// Сброс игры
async function resetGame() {
  const roomRef = doc(db, "rooms", roomId);

  // обновляем счёт
  let newWins1 = roomData.value.wins1;
  let newWins2 = roomData.value.wins2;
  if (result.value === "X") newWins1++;
  if (result.value === "O") newWins2++;
  const totalGames = roomData.value.totalGames + (result.value ? 1 : 0);

  await updateDoc(roomRef, {
    board: Array(9).fill(""),
    currentPlayer: "X",
    result: null,
    wins1: newWins1,
    wins2: newWins2,
    totalGames: totalGames,
  });
}

// Подписка на комнату
onMounted(async () => {
  const roomRef = doc(db, "rooms", roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) {
    console.error("Room not found");
    return;
  }

  const data = snap.data();
  roomData.value.player1 = data.player1;
  roomData.value.player2 = data.player2 || "";
  roomData.value.wins1 = data.wins1 || 0;
  roomData.value.wins2 = data.wins2 || 0;
  roomData.value.totalGames = data.totalGames || 0;
  roomData.value.status = data.status || "waiting";

  onSnapshot(roomRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    board.value = data.board;
    currentPlayer.value = data.currentPlayer;
    result.value = data.result;
    roomData.value.player1 = data.player1;
    roomData.value.player2 = data.player2 || "";
    roomData.value.wins1 = data.wins1 || 0;
    roomData.value.wins2 = data.wins2 || 0;
    roomData.value.totalGames = data.totalGames || 0;
    roomData.value.status = data.status || "waiting";
  });
});
</script>

<template>
  <div class="game-container">
    <h2>Tic-Tac-Toe</h2>

    <!-- Имя игрока вместо "Ты" -->
    <p>{{ playerName }} ({{ mySymbol }}):</p>

    <!-- Ход текущего игрока -->
    <p v-if="!result && roomData.player2">Ход: {{ currentPlayerName }}</p>
    <p v-else-if="!roomData.player2">Ждём второго игрока...</p>

    <!-- Результат игры -->
    <p v-else>
      Результат:
      <span v-if="result === 'draw'">Ничья</span>
      <span v-else>{{ winnerName }} победил</span>
    </p>

    <!-- Счёт -->
    <div class="scoreboard">
      <p>{{ roomData.player1 }}: {{ roomData.wins1 }}</p>
      <p>{{ roomData.player2 || "Ждём второго игрока..." }}: {{ roomData.wins2 }}</p>
      <p>Общий счёт партий: {{ roomData.totalGames }}</p>
    </div>

    <!-- Игровое поле -->
    <div class="board">
      <div
        v-for="(cell, index) in board"
        :key="index"
        class="cell"
        :class="cellClass(cell)"
        @click="makeMove(index)"
      >
        {{ cell }}
      </div>
    </div>

    <!-- Кнопка сброса -->
    <button @click="resetGame" :disabled="!result">Reset Game</button>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

.scoreboard {
  margin-bottom: 10px;
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 80px);
  grid-template-rows: repeat(3, 80px);
  gap: 5px;
  margin-top: 20px;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  font-size: 32px;
  font-weight: bold;
  cursor: pointer;
}

.cell:hover {
  background: #ddd;
}

/* классы для символов */
.cell.x {
  color: red; /* стилизуй как хочешь */
}

.cell.o {
  color: blue;
}

button {
  margin-top: 20px;
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
