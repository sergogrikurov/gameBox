<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { db } from "@/firebase/firebase.js";
import { doc, getDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useRoute, useRouter } from "vue-router";

/* ================== ЗВУКИ ================== */
const hitSound = new Audio("/sounds/hit.mp3");
const sinkSound = new Audio("/sounds/sink.mp3");

hitSound.preload = "auto";
sinkSound.preload = "auto";

function play(sound) {
  sound.currentTime = 0;
  sound.play();
}
/* =========================================== */

const route = useRoute();
const router = useRouter();
const gameId = route.params.roomId;

const myLocalName = localStorage.getItem("playerName") || "Игрок";
const gameData = ref(null);

const isPlayer1 = computed(() => gameData.value?.player1 === myLocalName);

const playerGrid = ref([]);
const opponentGrid = ref([]);

const currentTurnName = ref("");
const opponentName = ref("");
const winner = ref("");

const letters = "ABCDEFGHIJ".split("");
const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

/* ================== ПОДПИСКА ================== */
let unsubscribe = null;

onMounted(() => {
  const gameRef = doc(db, "games", gameId);
  unsubscribe = onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      router.push({ name: "twoPlayerGameList" });
      return;
    }

    const d = snap.data();
    gameData.value = d;

    playerGrid.value = isPlayer1.value ? d.player1Grid : d.player2Grid;
    opponentGrid.value = isPlayer1.value ? d.player2Grid : d.player1Grid;

    opponentName.value = isPlayer1.value ? d.player2 : d.player1;
    currentTurnName.value = d.turn === "player1" ? d.player1 : d.player2;

    /* ===== ЗВУК ПРИ ВЫСТРЕЛЕ СОПЕРНИКА ===== */
    if (playerGrid.value.length && d.lastShot) {
      const cell = playerGrid.value[d.lastShot.index];
      if (cell?.hit) play(hitSound);
      if (d.lastShot.sunk) play(sinkSound);
    }

    winner.value = d.winner || "";
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

/* ================== ГЕНЕРАЦИЯ КОРАБЛЕЙ ================== */
function generateShips() {
  const grid = Array(100)
    .fill(null)
    .map(() => ({ ship: false, hit: false, miss: false }));

  const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

  function isValid(pos) {
    return pos.every((p) => {
      if (grid[p].ship) return false;
      const r = Math.floor(p / 10);
      const c = p % 10;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && grid[rr * 10 + cc].ship) return false;
        }
      }
      return true;
    });
  }

  ships.forEach((size) => {
    let placed = false;
    while (!placed) {
      const h = Math.random() < 0.5;
      const r = Math.floor(Math.random() * 10);
      const c = Math.floor(Math.random() * 10);
      const pos = [];

      for (let i = 0; i < size; i++) {
        const rr = h ? r : r + i;
        const cc = h ? c + i : c;
        if (rr >= 10 || cc >= 10) break;
        pos.push(rr * 10 + cc);
      }

      if (pos.length === size && isValid(pos)) {
        pos.forEach((p) => (grid[p].ship = true));
        placed = true;
      }
    }
  });

  return grid;
}

/* ================== ВСПОМОГАТЕЛЬНЫЕ ================== */
function inside(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
}
function idx(r, c) {
  return r * 10 + c;
}
function getShip(grid, start) {
  const stack = [start];
  const visited = new Set();
  const ship = [];

  while (stack.length) {
    const i = stack.pop();
    if (visited.has(i) || !grid[i].ship) continue;
    visited.add(i);
    ship.push(i);

    const r = Math.floor(i / 10);
    const c = i % 10;

    [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].forEach(([rr, cc]) => inside(rr, cc) && stack.push(idx(rr, cc)));
  }

  return ship;
}

function shipSunk(grid, ship) {
  return ship.every((i) => grid[i].hit);
}

function markAround(grid, ship) {
  ship.forEach((i) => {
    const r = Math.floor(i / 10);
    const c = i % 10;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (!inside(rr, cc)) continue;
        const id = idx(rr, cc);
        if (!grid[id].ship && !grid[id].hit) grid[id].miss = true;
      }
    }
  });
}

function allShipsDestroyed(grid) {
  return grid.filter((c) => c.ship).every((c) => c.hit);
}

/* ================== ВЫСТРЕЛ ================== */
async function shoot(index) {
  if (winner.value) return;

  const refDoc = doc(db, "games", gameId);
  const snap = await getDoc(refDoc);
  const data = snap.data();

  const isP1 = data.player1 === myLocalName;
  const myKey = isP1 ? "player1" : "player2";
  const enemyKey = isP1 ? "player2Grid" : "player1Grid";

  if (data.turn !== myKey) return;

  const grid = JSON.parse(JSON.stringify(data[enemyKey]));
  const cell = grid[index];
  if (cell.hit || cell.miss) return;

  let nextTurn = data.turn;
  let sunk = false;

  if (cell.ship) {
    cell.hit = true;
    play(hitSound);

    const ship = getShip(grid, index);
    if (shipSunk(grid, ship)) {
      markAround(grid, ship);
      play(sinkSound);
      sunk = true;
    }
  } else {
    cell.miss = true;
    nextTurn = isP1 ? "player2" : "player1";
  }

  const update = {
    [enemyKey]: grid,
    turn: nextTurn,
    lastShot: { index, sunk },
  };

  if (allShipsDestroyed(grid)) {
    update.winner = myLocalName;
    if (isP1) update.scorePlayer1 = (data.scorePlayer1 || 0) + 1;
    else update.scorePlayer2 = (data.scorePlayer2 || 0) + 1;
  }

  await updateDoc(refDoc, update);
}

/* ================== НОВАЯ ИГРА ================== */
async function startGame() {
  await updateDoc(doc(db, "games", gameId), {
    player1Grid: generateShips(),
    player2Grid: generateShips(),
    turn: Math.random() < 0.5 ? "player1" : "player2",
    winner: "",
    lastShot: null,
  });
}

/* ================== ВЫХОД ================== */
const exitGame = async () => {
  if (unsubscribe) unsubscribe();

  if (!gameData.value) {
    router.push({ name: "twoPlayerGameList" });
    return;
  }

  try {
    await deleteDoc(doc(db, "games", gameId));
    await deleteDoc(doc(db, "rooms", gameData.value.roomId));
  } catch (e) {
    console.error(e);
  }

  router.push({ name: "twoPlayerGameList" });
};
</script>

<template>
  <div class="battleship-container">
    <!-- Кнопки назад/выйти -->
    <div class="top-buttons">
      <button class="back" @click="exitGame">Назад</button>
      <button class="exit" @click="exitGame">Выйти</button>
    </div>

    <!-- Кнопка начать новую игру -->
    <button class="new-game-btn" @click="startGame">Начать новую игру</button>

    <!-- Счёт -->
    <div class="scoreboard">
      <div>{{ gameData?.player1 }} — {{ gameData?.scorePlayer1 ?? 0 }}</div>
      <div>{{ gameData?.player2 }} — {{ gameData?.scorePlayer2 ?? 0 }}</div>
    </div>

    <!-- Победитель / текущий ход -->
    <h2 v-if="winner">🏆 Победил {{ winner }}</h2>
    <h4 v-else>
      {{ currentTurnName === myLocalName ? "Твой ход" : "Ход противника" }}
    </h4>

    <!-- Поля -->
    <div class="boards">
      <!-- МОЁ ПОЛЕ -->
      <div class="board">
        <div class="top-labels">
          <div class="corner"></div>
          <div v-for="l in letters" :key="'label-top-' + l" class="label">{{ l }}</div>
        </div>

        <div v-for="r in numbers" :key="'row-' + r" class="row">
          <div class="left-label">{{ r }}</div>
          <div
            v-for="c in 10"
            :key="'cell-' + r + '-' + c"
            class="cell"
            :class="{
              ship: playerGrid[(r - 1) * 10 + (c - 1)]?.ship,
              hit: playerGrid[(r - 1) * 10 + (c - 1)]?.hit,
              miss: playerGrid[(r - 1) * 10 + (c - 1)]?.miss,
            }"
          ></div>
        </div>
      </div>

      <!-- ПОЛЕ ПРОТИВНИКА -->
      <div class="board">
        <div class="top-labels">
          <div class="corner"></div>
          <div v-for="l in letters" :key="'op-label-' + l" class="label">{{ l }}</div>
        </div>

        <div v-for="r in numbers" :key="'op-row-' + r" class="row">
          <div class="left-label">{{ r }}</div>
          <div
            v-for="c in 10"
            :key="'op-cell-' + r + '-' + c"
            class="cell"
            :class="{
              hit: opponentGrid[(r - 1) * 10 + (c - 1)]?.hit,
              miss: opponentGrid[(r - 1) * 10 + (c - 1)]?.miss,
            }"
            @click="!winner && currentTurnName === myLocalName && shoot((r - 1) * 10 + (c - 1))"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battleship-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  font-family: sans-serif;
}

.top-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.back,
.exit {
  padding: 6px 12px;
  cursor: pointer;
}

.new-game-btn {
  padding: 6px 12px;
  cursor: pointer;
  margin-bottom: 10px;
}

.scoreboard {
  display: flex;
  gap: 40px;
  font-weight: bold;
  margin-bottom: 10px;
}

.boards {
  display: flex;
  gap: 20px; /* расстояние между полями */
  justify-content: center;
}

.board {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex; /* клетки в ряду горизонтально */
}

.top-labels {
  display: flex;
}

.corner {
  width: 30px;
  height: 30px;
}

.label {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}

.left-label {
  width: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}

.cell {
  width: 30px;
  height: 30px;
  border: 1px solid #999;
  background-color: #cce5ff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cell.ship {
  background-color: #007bff; /* своё поле показывает корабли */
}

.cell.hit {
  background-color: red;
}

.cell.miss::after {
  content: "✕";
  color: black;
  font-weight: bold;
}
</style>
