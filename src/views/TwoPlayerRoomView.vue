<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { translations } from "@/composables/locales";
import { useLanguage } from "@/composables/useLanguage";
import MyButton from "@/components/MyButton.vue";

const route = useRoute();
const { language } = useLanguage();

const gameKey = route.params.game;

const gameTitle = computed(() => {
  return translations[language.value].multiPlayerGames[gameKey] || gameKey;
});
</script>

<template>
  <div class="room">
    <!-- Кнопка выхода назад на страницу выбора игр на двоих -->
    <my-button to="/two-player" class="room__leave">
      {{ translations[language].back }}
    </my-button>

    <!-- Название игры -->
    <h1 class="room__title">{{ gameTitle }}</h1>

    <!-- Текст ожидания второго игрока -->
    <p class="room__status">🕒 {{ translations[language].waitingForSecondPlayer }}</p>
  </div>
</template>

<style scoped>
.room {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  gap: 20px; /* чтобы кнопка не прилипала к заголовку */
}

.room__title {
  font-size: 28px;
  margin-bottom: 8px;
}

.room__status {
  font-size: 18px;
  opacity: 0.8;
}

.room__leave {
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 10px;
}
</style>
