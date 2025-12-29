<script setup>
import { ref } from "vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage.js";
import MyButton from "@/components/MyButton.vue";
import { useRouter } from "vue-router";

const { language } = useLanguage();
const router = useRouter();

const games = ref([
  {
    id: 1,
    key: "tic-tac-toe",
    titleKey: "ticTacToe",
    descriptionKey: "ticTacToeDesc",
    img: "/images/tic-tac-toe.png",
  },
]);

function startGame(gameKey) {
  router.push(`/two-player/${gameKey}`);
}
</script>
000
<template>
  <div class="multi-player">
    <div class="multi-player__container">
      <my-button to="/game-mode" />
      <h2 class="multi-player__title">
        {{ translations[language].gamesTitle }}
      </h2>
      <div class="multi-player__list">
        <div v-for="game in games" :key="game.id" class="multi-player__game-card">
          <img :src="game.img" :alt="translations[language].singlePlayerGames[game.key]" />
          <h2>{{ translations[language].singlePlayerGames[game.key] }}</h2>
          <p>{{ translations[language].singlePlayerGames[game.descriptionKey] }}</p>
          <button @click="startGame(game.key)">
            {{ translations[language].play }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.multi-player {
  @include adaptive-value(padding-top, 50, 20);
}
</style>
