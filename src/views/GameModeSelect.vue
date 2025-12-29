<script setup>
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";
const { language } = useLanguage();

import { useRouter } from "vue-router";
const router = useRouter();

function goBack() {
  router.push("/name");
}

function goSinglePlayer() {
  router.push("/single-player");
}

function goTwoPlayer() {
  router.push("/two-player");
}

import { ref, onMounted } from "vue";
const name = ref("");

onMounted(() => {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    name.value = savedName;
  }
});
</script>

<template>
  <div class="game-mode">
    <div class="game-mode__container">
      <button @click="goBack">
        <img src="@/assets/arrows/back-arrow-game.png" alt="Back-Arrow" />
      </button>
      <div class="game-mode__wrapper">
        <h2 class="game-mode__title-hi">
          {{ translations[language].hi }} <span>{{ name }}</span>
        </h2>
        <h3 class="game-mode__title-select">{{ translations[language].gameMode }}</h3>
        <div class="game-mode__options">
          <button class="game-mode__btn" @click="goSinglePlayer">
            1 {{ translations[language].single }}
          </button>
          <button class="game-mode__btn" @click="goTwoPlayer">
            2 {{ translations[language].multi }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.game-mode {
  @include adaptive-value(padding-top, 50, 20);
  background-color: #000;
  overflow: hidden;
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    @include adaptive-value(margin-top, 50, 20);
  }
  &__title-hi {
    color: #ff6f61;
    @include adaptive-value(font-size, 50, 20);
    @include adaptive-value(margin-bottom, 30, 20);

    & span {
      color: #4caf50;
    }
  }

  &__title-select {
    color: #7b6cff;
    @include adaptive-value(font-size, 40, 18);
    @include adaptive-value(margin-bottom, 30, 20);
  }

  &__options {
    & > *:not(:last-child) {
      margin-bottom: rem(30);
    }
  }

  &__btn {
    display: grid;
    place-items: center;
    border: 2px solid #fff;
    width: rem(150);
    height: rem(50);
    border-radius: rem(6);
    cursor: pointer;
    font-size: rem(24);
    font-weight: 700;
    color: #fff;
    background-color: transparent;
    box-shadow: 0 0 2px 2px rgba(255, 255, 255, 0.6);
    transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 6px 3px rgba(255, 255, 255, 0.9);
    }

    &:active {
      transform: scale(0.95);
      box-shadow: 0 0 2px 1px rgba(255, 255, 255, 0.5);
    }
  }
}
</style>
