<script setup>
import { ref } from "vue";
import MyButton from "@/components/MyButton.vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";
const { language } = useLanguage();

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

<template>
  <div class="battleShip">
    <my-button to="/single-player-game-list" />
    <h2 class="battleShip__title">BattleShip</h2>

    <div class="battleShip__container battle-container">
      <div class="battleShip__wrapper">
        <!-- Индикатор хода и счёт -->
        <div class="battleShip__status status">
          <p class="battleShip__status_move" v-if="!winner">
            {{ translations[language].yourMove }}:
            <span>{{ currentTurn === "player" ? myName : "Bot" }}</span>
          </p>

          <p class="battleShip__status_winner" v-else>
            {{ translations[language].win }}: {{ winner }}
          </p>

          <p class="battleShip__status_name-score">
            {{ myName }}: <span>{{ score.player }}</span>
          </p>

          <p class="battleShip__status_name-score battleShip__status_name-score-bot">
            Bot: <span>{{ score.bot }}</span>
          </p>
        </div>

        <div class="battleShip__boards boards">
          <!-- Игрок -->
          <div class="boards__my-board board">
            <h2 class="boards__my-board_name">{{ myName }}</h2>
            <div class="board__wrapper grid-container">
              <div class="board__header header-row">
                <div class="board__header_cell-empty header-cell"></div>
                <div
                  v-for="letter in letters"
                  :key="'hl' + letter"
                  class="board__header_cell header-cell"
                >
                  {{ letter }}
                </div>
              </div>
              <div v-for="r in 10" :key="'pr' + r" class="board__row row">
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
          <div class="boards__opponent board">
            <h2 class="boards__opponent_name">Bot</h2>
            <div class="board__wrapper grid-container">
              <div class="board__header header-row">
                <div class="board__header_cell-empty header-cell"></div>
                <div
                  v-for="letter in letters"
                  :key="'hlb' + letter"
                  class="board__header_cell header-cell"
                >
                  {{ letter }}
                </div>
              </div>
              <div v-for="r in 10" :key="'br' + r" class="board__row row">
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

        <div class="battleShip__new-game info">
          <button class="battleShip__new-game_btn" @click="startNewGame">
            {{ translations[language].newGame }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.battleShip {
  @include adaptive-value(padding-top, 50, 0);
  padding-bottom: rem(50);
  &__title {
    text-align: center;
    @include adaptive-value(margin-top, 50, 10);
    font-size: rem(30);
    color: #457b9d;
  }
  &__wrapper {
    @include adaptive-value(margin-top, 50, 10);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  &__status {
    display: flex;
    flex-direction: column;
    align-items: center;
    & > *:not(:last-child) {
      @include adaptive-value(margin-bottom, 20, 10);
    }
    &_move {
      color: green;
      & span {
        color: red;
      }
    }
    &_name-score {
      color: red;
      & span {
        color: blue;
      }
    }
    &_name-score-bot {
      color: rebeccapurple;
    }
  }
  &__new-game {
    margin-top: rem(20);
    &_btn {
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
      @include adaptive-value(margin-top, 20, 10);

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
  }
}
.boards__my-board {
  &_name {
    font-size: rem(22);
    color: red;
    margin-bottom: rem(10);
  }
}
.boards__opponent {
  &_name {
    font-size: rem(22);
    color: rebeccapurple;
    margin-bottom: rem(10);
  }
}

.battle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.status {
  font-size: rem(18);
  font-weight: bold;
  margin-bottom: 1rem;
}
.boards {
  display: flex;
  @include adaptive-value(gap, 50, 10);
  @media (max-width: rem(1024)) {
    flex-direction: column;
    align-items: center;
  }
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
  display: flex;
}
.header-cell {
  @include adaptive-value(width, 40, 26);
  @include adaptive-value(height, 40, 26);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}

.row {
  display: flex;
}

.cell {
  @include adaptive-value(width, 40, 26);
  @include adaptive-value(height, 40, 26);
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
  font-size: rem(22);
  font-weight: bold;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
