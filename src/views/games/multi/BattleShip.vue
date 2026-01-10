<script setup>
/* ================== IMPORTS ================== */
import { ref, onMounted, onUnmounted, computed } from "vue";
import { db } from "@/firebase/firebase.js";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useRoute, useRouter } from "vue-router";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";

/* ================== LANGUAGE ================== */
const { language } = useLanguage();

/* ================== ЗВУКИ ================== */
const hitSound = new Audio("/sounds/hit.mp3");
const sinkSound = new Audio("/sounds/sink.mp3");

hitSound.preload = "auto";
sinkSound.preload = "auto";

function play(sound) {
  sound.currentTime = 0;
  sound.play();
}

/* ================== ROUTER / DATA ================== */
const route = useRoute();
const router = useRouter();
const gameId = route.params.roomId;

const myLocalName = localStorage.getItem("playerName") || "Игрок";

/* ================== STATE ================== */
const gameData = ref(null);

const playerGrid = ref([]);
const opponentGrid = ref([]);

const currentTurnName = ref("");
const opponentName = ref("");
const winner = ref("");

/* ================== COMPUTED ================== */
const isPlayer1 = computed(() => gameData.value?.player1 === myLocalName);

const letters = "ABCDEFGHIJ".split("");
const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

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
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && grid[rr * 10 + cc].ship) return false;
        }
      return true;
    });
  }

  ships.forEach((size) => {
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * 10);
      const c = Math.floor(Math.random() * 10);
      const pos = [];

      for (let i = 0; i < size; i++) {
        const rr = horizontal ? r : r + i;
        const cc = horizontal ? c + i : c;
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
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (!inside(rr, cc)) continue;
        const id = idx(rr, cc);
        if (!grid[id].ship && !grid[id].hit) grid[id].miss = true;
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
    leftPlayers: {},
  });
}

/* ================== ПОДПИСКА ================== */
let unsubscribe = null;

onMounted(() => {
  const gameRef = doc(db, "games", gameId);

  unsubscribe = onSnapshot(gameRef, (snap) => {
    if (!snap.exists()) {
      router.replace("/");
      return;
    }

    const d = snap.data();
    gameData.value = d;

    playerGrid.value = isPlayer1.value ? d.player1Grid : d.player2Grid;
    opponentGrid.value = isPlayer1.value ? d.player2Grid : d.player1Grid;
    opponentName.value = isPlayer1.value ? d.player2 : d.player1;
    currentTurnName.value = d.turn === "player1" ? d.player1 : d.player2;

    winner.value = d.winner || "";

    if (isPlayer1.value && d.leftPlayers?.[d.player2]) router.replace("/");
    if (!isPlayer1.value && d.leftPlayers?.[d.player1]) router.replace("/");
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
      [`leftPlayers.${myLocalName}`]: true,
      lastActive: new Date(),
    });
  } catch (e) {
    console.error("Failed to mark player left:", e);
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
  <div class="battleShip">
    <div class="battleShip-container">
      <div class="battleShip__tittle">BattleShip</div>
      <div class="battleShip__wrapper">
        <button class="battleShip__new-game-btn" @click="startGame">
          {{ translations[language].newGame }}
        </button>

        <!-- Счёт -->
        <div class="battleShip__scoreboard">
          <div class="battleShip__scoreboard_my-name">
            <p>{{ gameData?.player1 }}</p>
            <span>{{ gameData?.scorePlayer1 ?? 0 }}</span>
          </div>
          <div class="battleShip__scoreboard_opponent-name">
            <p>{{ gameData?.player2 }}</p>
            <span>{{ gameData?.scorePlayer2 ?? 0 }}</span>
          </div>
        </div>

        <!-- Победитель / текущий ход -->
        <h2 class="battleShip__win" v-if="winner">
          🏆 {{ translations[language].win }} {{ winner }}
        </h2>
        <h4 class="battleShip__move" v-else>
          {{
            currentTurnName === myLocalName
              ? translations[language].yourTurn
              : translations[language].enemyTurn
          }}
        </h4>

        <!-- Поля -->
        <div class="battleShip__boards">
          <!-- МОЁ ПОЛЕ -->
          <div class="battleShip__board">
            <div class="battleShip__board_top-labels">
              <div class="battleShip__board_corner"></div>
              <div v-for="l in letters" :key="'label-top-' + l" class="battleShip__board_label">
                {{ l }}
              </div>
            </div>

            <div v-for="r in numbers" :key="'row-' + r" class="battleShip__board_row">
              <div class="battleShip__board_left-label">{{ r }}</div>
              <div
                v-for="c in 10"
                :key="'cell-' + r + '-' + c"
                class="battleShip__board_cell"
                :class="{
                  ship: playerGrid[(r - 1) * 10 + (c - 1)]?.ship,
                  hit: playerGrid[(r - 1) * 10 + (c - 1)]?.hit,
                  miss: playerGrid[(r - 1) * 10 + (c - 1)]?.miss,
                }"
              ></div>
            </div>
          </div>

          <!-- ПОЛЕ ПРОТИВНИКА -->
          <div class="battleShip__board">
            <div class="battleShip__board_top-labels">
              <div class="battleShip__board_corner"></div>
              <div v-for="l in letters" :key="'op-label-' + l" class="battleShip__board_label">
                {{ l }}
              </div>
            </div>

            <div v-for="r in numbers" :key="'op-row-' + r" class="battleShip__board_row">
              <div class="battleShip__board_left-label">{{ r }}</div>
              <div
                v-for="c in 10"
                :key="'op-cell-' + r + '-' + c"
                class="battleShip__board_cell"
                :class="{
                  hit: opponentGrid[(r - 1) * 10 + (c - 1)]?.hit,
                  miss: opponentGrid[(r - 1) * 10 + (c - 1)]?.miss,
                }"
                @click="!winner && currentTurnName === myLocalName && shoot((r - 1) * 10 + (c - 1))"
              ></div>
            </div>
          </div>
        </div>

        <div>
          <button class="battleShip__exit-btn" @click="exitGame">
            {{ translations[language].goOut }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.battleShip {
  @include adaptive-value(padding-top, 50, 20);
  padding-bottom: rem(50);
  &__tittle {
    text-align: center;
    @include adaptive-value(font-size, 40, 20);
    color: green;
  }
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  &__new-game-btn {
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
  &__scoreboard {
    font-size: rem(20);
    width: rem(150);
    margin: rem(20) rem(0);
    &_my-name {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: rem(10);
      & p {
        color: blue;
      }
      & span {
        color: rgb(92, 89, 89);
      }
    }
    &_opponent-name {
      display: flex;
      align-items: center;
      justify-content: space-between;
      & p {
        color: red;
      }
      & span {
        color: rgb(92, 89, 89);
      }
    }
  }
  &__move {
    font-size: rem(20);
    color: #45a049;
    margin-bottom: rem(20);
  }
  &__win {
    font-size: rem(20);
    color: #45a049;
    margin-bottom: rem(20);
  }
  &__boards {
    display: flex;
    align-items: center;
    gap: rem(20);
    @media (max-width: rem(640)) {
      flex-direction: column;
    }
  }
  &__board {
    display: flex;
    flex-direction: column;
    &_top-labels {
      display: flex;
      align-items: center;
    }
    &_row {
      display: flex;
    }

    &_corner {
      width: rem(26);
      height: rem(26);
    }
    &_label {
      width: rem(26);
      height: rem(26);
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &_left-label {
      width: rem(26);
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: bold;
    }
    &_cell {
      width: rem(26);
      height: rem(26);
      border: 1px solid #999;
      background-color: #cce5ff;
      display: flex;
      justify-content: center;
      align-items: center;
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
    margin-top: rem(20);

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
}

.ship {
  background-color: #007bff;
}
.hit {
  background-color: red;
}
.miss::after {
  content: "✕";
  color: black;
  font-weight: bold;
}
</style>
