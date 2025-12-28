<script setup>
import { ref } from "vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage.js";
import MyButton from "@/components/MyButton.vue";

const { language } = useLanguage();

const games = ref([
  { id: 1, key: "puzzle", descriptionKey: "puzzleDesc", img: "/images/puzzle.png" },
  { id: 2, key: "count", descriptionKey: "countDesc", img: "/images/count.png" },
]);

function startGame(gameId) {
  console.log("Начать игру с id:", gameId);
}
</script>

<template>
  <div class="single-player">
    <div class="single-player__container">
      <my-button to="/game-mode" />
      <h2 class="single-player__title">
        {{ translations[language].gamesTitle }}
      </h2>
      <div class="single-player__list">
        <div v-for="game in games" :key="game.id" class="single-player__game-card">
          <img :src="game.img" :alt="translations[language].singlePlayerGames[game.key]" />
          <h2>{{ translations[language].singlePlayerGames[game.key] }}</h2>
          <p>{{ translations[language].singlePlayerGames[game.descriptionKey] }}</p>
          <button @click="startGame(game.id)">
            {{ translations[language].play }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
