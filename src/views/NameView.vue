<script setup>
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";
const { language } = useLanguage();
import MyButton from "@/components/MyButton.vue";

import { ref, computed, watch, onMounted } from "vue";
const name = ref("");
const isNameValid = computed(() => name.value.length >= 2);

onMounted(() => {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    name.value = savedName;
  }
});

// сохраняем имя при изменении
watch(name, (newName) => {
  if (isNameValid.value) {
    localStorage.setItem("playerName", newName);
  }
});
</script>

<template>
  <div class="enter-name">
    <div class="enter-name__container">
      <MyButton />
      <div class="enter-name__wrapper">
        <h2 class="enter-name__title">{{ translations[language].enterName }}</h2>
        <input
          v-model.trim="name"
          class="enter-name__input"
          type="text"
          :placeholder="translations[language].myNameIs"
        />

        <MyButton
          to="/game-mode"
          :text="translations[language].play"
          btnClass="enter-name__btn"
          :disabled="!isNameValid"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.enter-name {
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    @include adaptive-value(margin-top, 50, 20);
  }
  &__btn {
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

  &__title {
    color: #4a90e2;
    font-style: italic;
    @include adaptive-value(font-size, 50, 26);
    @include adaptive-value(margin-bottom, 50, 20);
  }

  &__input {
    @include adaptive-value(width, 250, 200);
    padding: 12px 16px;
    font-size: 18px;
    border: 2px solid #4caf50;
    border-radius: 12px;
    outline: none;
    transition: 0.3s;
    &:focus {
      border-color: #ff9800;
      box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
    }
    &::placeholder {
      color: #999;
      font-style: italic;
    }
  }
}
</style>
