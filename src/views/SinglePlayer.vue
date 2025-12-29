<script setup>
import { ref } from "vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage.js";
import MyButton from "@/components/MyButton.vue";
import memoryImg from "@/assets/game/memory.png";
import { useRouter } from "vue-router";
const router = useRouter();

const { language } = useLanguage();

const games = ref([
  {
    id: 1,
    key: "memory",
    titleKey: "memory",
    descriptionKey: "memoryGameDesc",
    img: memoryImg,
  },
]);

function startGame(gameKey) {
  router.push(`/single-player/${gameKey}`);
}
</script>

<template>
  <div class="player">
    <div class="player__container">
      <my-button to="/game-mode" />
      <div class="player__wrapper">
        <h2 class="player__title">
          {{ translations[language].gamesTitle }}
        </h2>
        <div class="player__list">
          <div
            @click="startGame(game.key)"
            v-for="game in games"
            :key="game.id"
            class="player__game-card"
          >
            <img :src="game.img" :alt="translations[language].singlePlayerGames[game.key]" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.player {
  @include adaptive-value(padding-top, 50, 20);
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__title {
    color: rgb(197, 73, 16);
    font-weight: 700;
    font-style: italic;
    @include adaptive-value(font-size, 50, 20);
    @include adaptive-value(margin-top, 50, 10);
    @include adaptive-value(margin-bottom, 50, 10);
  }

  &__game-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 2px solid #fff;
    @include adaptive-value(max-width, 730, 290);
    border-radius: rem(5);
    padding: rem(5);

    & img {
      @include adaptive-value(width, 320, 120);
      @include adaptive-value(height, 320, 120);
    }
  }
}
</style>
