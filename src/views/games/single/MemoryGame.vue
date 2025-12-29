<script setup>
import MyButton from "@/components/MyButton.vue";
import { ref, computed } from "vue";

// Для простоты: буквы A, B, C, D (2 карточки каждой)
const cards = ref([
  { id: 1, value: "A", flipped: false, matched: false },
  { id: 2, value: "A", flipped: false, matched: false },
  { id: 3, value: "B", flipped: false, matched: false },
  { id: 4, value: "B", flipped: false, matched: false },
  { id: 5, value: "C", flipped: false, matched: false },
  { id: 6, value: "C", flipped: false, matched: false },
  { id: 7, value: "D", flipped: false, matched: false },
  { id: 8, value: "D", flipped: false, matched: false },
]);

// Перемешиваем карточки
cards.value = cards.value.sort(() => Math.random() - 0.5);

// Выбранные карточки (максимум 2)
const selectedCards = ref([]);

// Кол-во ходов
const moves = ref(0);

// Проверка, закончена ли игра
const gameOver = computed(() => cards.value.every((card) => card.matched));

// Функция клика по карточке
function flipCard(card) {
  if (card.flipped || card.matched) return;
  if (selectedCards.value.length === 2) return;

  card.flipped = true;
  selectedCards.value.push(card);

  if (selectedCards.value.length === 2) {
    moves.value++;
    checkMatch();
  }
}

// Проверка совпадений
function checkMatch() {
  const [first, second] = selectedCards.value;

  if (first.value === second.value) {
    first.matched = true;
    second.matched = true;
    selectedCards.value = [];
  } else {
    setTimeout(() => {
      first.flipped = false;
      second.flipped = false;
      selectedCards.value = [];
    }, 1000);
  }
}

// Сброс игры
function resetGame() {
  cards.value.forEach((card) => {
    card.flipped = false;
    card.matched = false;
  });
  cards.value = cards.value.sort(() => Math.random() - 0.5);
  moves.value = 0;
  selectedCards.value = [];
}
</script>

<template>
  <div class="memory">
    <my-button to="/two-player" />
    <div class="memory__container">
      <div class="memory__wrapper">
        <h2 class="memory__title">Memory</h2>
        <div class="memory__board">
          <div
            v-for="card in cards"
            :key="card.id"
            class="memory__card"
            :class="{ flipped: card.flipped || card.matched }"
            @click="flipCard(card)"
          >
            {{ card.flipped || card.matched ? card.value : "" }}
          </div>
        </div>

        <div class="memory__stats">
          <p>Ходов: {{ moves }}</p>
          <p v-if="gameOver">Поздравляем! Все пары найдены 🎉</p>
        </div>

        <button class="memory__reset-btn" @click="resetGame">Сбросить игру</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.memory {
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

  &__board {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    @include adaptive-value(max-width, 500, 290);
  }

  &__card {
    @include adaptive-value(width, 117, 60);
    @include adaptive-value(height, 117, 60);
    background-color: #f0f0f0;
    border: 2px solid #333;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: rem(36);
    cursor: pointer;
    border-radius: rem(8);
    transition: transform 0.2s, background-color 0.2s;

    &:hover {
      transform: scale(1.05);
      background-color: #e0e0e0;
    }

    &.flipped {
      background-color: #3498db;
      color: #fff;
    }
  }

  &__stats {
    margin-top: rem(20);
    font-weight: bold;
  }

  &__reset-btn {
    margin-top: rem(15);
    padding: rem(10) rem(20);
    background-color: #e74c3c;
    color: #fff;
    border: none;
    border-radius: rem(6);
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;

    &:hover {
      background-color: #c0392b;
    }
  }
}
</style>
