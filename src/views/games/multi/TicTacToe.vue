<script setup>
import MyButton from "@/components/MyButton.vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";
const { language } = useLanguage();
import { ref, computed } from "vue";

// Имя игрока из localStorage
const playerName = localStorage.getItem("playerName") || "Игрок";

// Второй игрок — условно "Компьютер" или другой игрок
const otherPlayer = "Противник";

// Игровое поле 3x3
const board = ref(Array(9).fill(""));

// Текущий игрок: 'X' = playerName, 'O' = otherPlayer
const currentPlayer = ref("X");

// Счёт
const score = ref({ X: 0, O: 0, draw: 0 });

// Результат игры: null = игра продолжается
const result = ref(null);

// Чей сейчас ход
const currentPlayerName = computed(() => (currentPlayer.value === "X" ? playerName : otherPlayer));

// Сделать ход
function makeMove(index) {
  if (board.value[index] || result.value) return; // занято или игра окончена

  board.value[index] = currentPlayer.value;

  const winner = checkWinner();
  if (winner) {
    if (winner === "draw") score.value.draw += 1;
    else score.value[winner] += 1;
    result.value = winner;
  } else {
    // смена игрока
    currentPlayer.value = currentPlayer.value === "X" ? "O" : "X";
  }
}

// Проверка победителя
function checkWinner() {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // горизонтали
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // вертикали
    [0, 4, 8],
    [2, 4, 6], // диагонали
  ];

  for (const [a, b, c] of lines) {
    if (board.value[a] && board.value[a] === board.value[b] && board.value[a] === board.value[c]) {
      return board.value[a]; // 'X' или 'O'
    }
  }

  if (board.value.every((cell) => cell)) return "draw";

  return null;
}

// Сбросить игру
function resetGame() {
  board.value = Array(9).fill("");
  result.value = null;
  currentPlayer.value = "X";
}
</script>

<template>
  <div class="tic-tac-toe">
    <my-button to="/two-player" />
    <div class="tic-tac-toe__container">
      <div class="tic-tac-toe__wrapper">
        <h2 class="tic-tac-toe__title">Tic-Tac-Toe</h2>
        <p class="tic-tac-toe__move" v-if="!result">
          {{ translations[language].yourMove }}: <span>{{ currentPlayerName }}</span>
        </p>
        <p v-else>
          <span class="tic-tac-toe__draw" v-if="result === 'draw'"
            >{{ translations[language].draw }}!</span
          >
          <span class="tic-tac-toe__win" v-else
            ><span>{{ result === "X" ? playerName : otherPlayer }}</span> победил!</span
          >
        </p>
        <div class="tic-tac-toe__board">
          <div
            v-for="(cell, index) in board"
            :key="index"
            class="tic-tac-toe__board_cell"
            :class="cell"
            @click="makeMove(index)"
          >
            {{ cell }}
          </div>
        </div>

        <div class="tic-tac-toe__score">
          <p class="tic-tac-toe__score-player">
            <span class="tic-tac-toe__score-player_name">{{ playerName }}</span>
            <span class="tic-tac-toe__score-player-symbol">score (X):</span>
            <span class="tic-tac-toe__score-player_score">{{ score.X }}</span>
          </p>

          <p class="tic-tac-toe__score-player">
            <span class="tic-tac-toe__score-player_name">{{ otherPlayer }}</span>
            <span class="tic-tac-toe__score-player-symbol">(O):</span>
            <span class="tic-tac-toe__score-player_score">{{ score.O }}</span>
          </p>
          <p class="tic-tac-toe__score-draw">{{ translations[language].draw }}: {{ score.draw }}</p>
        </div>
        <button class="tic-tac-toe__reset-btn" @click="resetGame">Сбросить игру</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tic-tac-toe {
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  &__title {
    color: green;
    font-weight: 700;
    @include adaptive-value(font-size, 40, 20);
    @include adaptive-value(margin-top, 50, 10);
    @include adaptive-value(margin-bottom, 50, 10);
  }

  &__move {
    color: rgb(179, 8, 179);
    @include adaptive-value(font-size, 30, 18);
    & span {
      color: red;
    }
  }

  &__draw {
    font-weight: 700;
    @include adaptive-value(font-size, 30, 18);
    color: #3498db;
  }

  &__win {
    color: rgb(179, 8, 179);
    @include adaptive-value(font-size, 30, 18);
    & span {
      color: red;
    }
  }

  &__board {
    display: flex;
    flex-wrap: wrap;
    @include adaptive-value(width, 330, 220);
    margin: rem(20) auto;
    @include adaptive-value(margin-top, 20, 10);
    @include adaptive-value(margin-bottom, 20, 10);
    gap: rem(10);

    &_cell {
      flex: 1 0 30%;
      aspect-ratio: 1 / 1;
      background-color: #f0f0f0;
      border: 2px solid #333;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: rem(36);
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;

      &:hover {
        background-color: #e0e0e0;
        transform: scale(1.05);
      }
    }
  }

  &__score {
  }

  &__score-player {
    &_name {
    }

    &_score {
    }
  }

  &__score-player-symbol {
  }

  &__score-draw {
  }

  &__reset-btn {
  }
}
.X {
  color: #3498db; // крестик синий
}

.O {
  color: #e74c3c; // нолик красный
}
</style>
