<template>
  <div class="battle-container">
    <h1>Морской бой</h1>

    <!-- Индикатор хода и счёт -->
    <div class="status">
      <p v-if="!winner">Сейчас ход: {{ currentTurn === "player" ? myName : "Бот" }}</p>
      <p v-else>Победитель: {{ winner }}</p>
      <p>{{ myName }}: {{ score.player }}</p>
      <p>Бот: {{ score.bot }}</p>
    </div>

    <div class="boards">
      <!-- Игрок -->
      <div class="board">
        <h2>{{ myName }}</h2>
        <div class="grid-container">
          <div class="header-row">
            <div class="header-cell"></div>
            <div v-for="letter in letters" :key="'hl' + letter" class="header-cell">
              {{ letter }}
            </div>
          </div>
          <div v-for="r in 10" :key="'pr' + r" class="row">
            <div class="header-cell">{{ r }}</div>
            <div
              v-for="c in 10"
              :key="'pc' + c"
              class="cell"
              :class="{
                ship: playerGrid[(r - 1) * 10 + (c - 1)]?.ship,
                hit: playerGrid[(r - 1) * 10 + (c - 1)]?.hit,
                miss: playerGrid[(r - 1) * 10 + (c - 1)]?.miss,
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Бот -->
      <div class="board">
        <h2>Бот</h2>
        <div class="grid-container">
          <div class="header-row">
            <div class="header-cell"></div>
            <div v-for="letter in letters" :key="'hlb' + letter" class="header-cell">
              {{ letter }}
            </div>
          </div>
          <div v-for="r in 10" :key="'br' + r" class="row">
            <div class="header-cell">{{ r }}</div>
            <div
              v-for="c in 10"
              :key="'bc' + c"
              class="cell"
              :class="{
                hit: botGrid[(r - 1) * 10 + (c - 1)]?.hit,
                miss: botGrid[(r - 1) * 10 + (c - 1)]?.miss,
              }"
              @click="currentTurn === 'player' ? shootAtBot((r - 1) * 10 + (c - 1)) : null"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="info">
      <button @click="startNewGame">Новая игра</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const hitSound = new Audio("/sounds/hit.mp3");
const sinkSound = new Audio("/sounds/sink.mp3");

hitSound.preload = "auto";
sinkSound.preload = "auto";

const letters = "ABCDEFGHIJ".split("");
const myName = localStorage.getItem("playerName") || "Игрок";

// ---------- Сетки ----------
function emptyGrid() {
  return Array(100)
    .fill(null)
    .map(() => ({ ship: false, hit: false, miss: false }));
}

const playerGrid = ref(emptyGrid());
const botGrid = ref(emptyGrid());
const winner = ref("");
const currentTurn = ref("player"); // "player" или "bot"

// ---------- Счёт ----------
const score = ref({
  player: 0,
  bot: 0,
});

// ---------- Корабли ----------
const shipsSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

function generateShips(grid) {
  function isValid(pos) {
    return pos.every((p) => {
      if (grid[p].ship) return false;
      const r = Math.floor(p / 10);
      const c = p % 10;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr,
            cc = c + dc;
          if (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && grid[rr * 10 + cc].ship) return false;
        }
      }
      return true;
    });
  }

  shipsSizes.forEach((size) => {
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
}

// ---------- Утилиты для игры ----------
function idx(r, c) {
  return r * 10 + c;
}
function inside(r, c) {
  return r >= 0 && r < 10 && c >= 0 && c < 10;
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
    const r = Math.floor(i / 10),
      c = i % 10;
    [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ].forEach(([rr, cc]) => {
      if (inside(rr, cc)) stack.push(idx(rr, cc));
    });
  }
  return ship;
}

function markAround(grid, ship) {
  ship.forEach((i) => {
    const r = Math.floor(i / 10),
      c = i % 10;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr,
          cc = c + dc;
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

// ---------- Игрок стреляет по боту ----------
function shootAtBot(index) {
  if (currentTurn.value !== "player" || winner.value) return;

  const cell = botGrid.value[index];
  if (!cell || cell.hit || cell.miss) return;

  if (cell.ship) {
    cell.hit = true;

    // 🔊 звук попадания
    hitSound.currentTime = 0;
    hitSound.play();

    const ship = getShip(botGrid.value, index);
    if (ship.every((i) => botGrid.value[i].hit)) {
      markAround(botGrid.value, ship);

      // 🔊 звук потопления
      sinkSound.currentTime = 0;
      sinkSound.play();
    }
  } else {
    cell.miss = true;
    currentTurn.value = "bot";
    setTimeout(botTurn, 500);
  }

  if (allShipsDestroyed(botGrid.value)) {
    winner.value = myName;
    score.value.player += 1;
  }
}

// ---------- Ход бота ----------
const botLastHits = ref([]);

function botTurn() {
  if (winner.value) return;

  let index;

  // 🎯 если бот уже попадал — добиваем корабль
  if (botLastHits.value.length) {
    const last = botLastHits.value[botLastHits.value.length - 1];

    const candidates = [last - 1, last + 1, last - 10, last + 10].filter(
      (i) => i >= 0 && i < 100 && !playerGrid.value[i].hit && !playerGrid.value[i].miss
    );

    index =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : Math.floor(Math.random() * 100);
  } else {
    index = Math.floor(Math.random() * 100);
  }

  const cell = playerGrid.value[index];
  if (!cell || cell.hit || cell.miss) {
    setTimeout(botTurn, 0);
    return;
  }

  // 💥 ПОПАДАНИЕ
  if (cell.ship) {
    cell.hit = true;

    // 🔊 звук попадания бота
    hitSound.currentTime = 0;
    hitSound.play();

    botLastHits.value.push(index);

    const ship = getShip(playerGrid.value, index);

    // 🚢 КОРАБЛЬ ПОТОПЛЕН
    if (ship.every((i) => playerGrid.value[i].hit)) {
      markAround(playerGrid.value, ship);

      // 🔊 звук потопления
      sinkSound.currentTime = 0;
      sinkSound.play();

      // ❗ сбрасываем память бота — корабль уничтожен
      botLastHits.value = [];
    }

    // бот стреляет дальше
    setTimeout(botTurn, 400);
  } else {
    // ❌ ПРОМАХ
    cell.miss = true;
    currentTurn.value = "player";
  }

  // 🏆 ПОБЕДА БОТА
  if (allShipsDestroyed(playerGrid.value)) {
    winner.value = "Бот";
    score.value.bot += 1;
  }
}

// ---------- Новая игра ----------
function startNewGame() {
  playerGrid.value = emptyGrid();
  botGrid.value = emptyGrid();
  winner.value = "";
  currentTurn.value = "player";
  botLastHits.value = [];
  generateShips(playerGrid.value);
  generateShips(botGrid.value);
}

// Инициализация
startNewGame();
</script>

<style scoped>
.battle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.status {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 1rem;
}
.boards {
  display: flex;
  gap: 2rem;
}
.board {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.grid-container {
  display: flex;
  flex-direction: column;
}
.header-row {
  display: grid;
  grid-template-columns: repeat(11, 30px);
}
.header-cell {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}
.row {
  display: grid;
  grid-template-columns: repeat(11, 30px);
}
.cell {
  width: 30px;
  height: 30px;
  background-color: #a0c4ff;
  border: 1px solid #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.cell.ship {
  background-color: #457b9d;
}
.cell.hit {
  background-color: red;
}
.cell.miss {
  background: #a0c4ff;
  position: relative;
}

.cell.miss::after {
  content: "✕";
  color: #333;
  font-size: 22px;
  font-weight: bold;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
button {
  padding: 0.5rem 1rem;
  font-size: 16px;
  cursor: pointer;
}
</style>
