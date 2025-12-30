<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { translations } from "@/composables/locales.js";
import { useLanguage } from "@/composables/useLanguage";
import MyButton from "@/components/MyButton.vue";

const { language } = useLanguage();

// ограничения имени
const MIN_LENGTH = 2;
const MAX_LENGTH = 12;

// имя игрока
const name = ref("");

// очистка и защита ввода
const sanitizeName = (value) => {
  return value
    .replace(/[<>]/g, "") // защита от HTML
    .replace(/[^a-zA-Zа-яА-Я0-9\u10A0-\u10FF ]/g, "") // латиница, кириллица, грузинский, цифры
    .replace(/\s{2,}/g, " "); // убираем двойные пробелы
};

// проверка валидности имени
const isNameValid = computed(() => {
  return name.value.length >= MIN_LENGTH && name.value.length <= MAX_LENGTH;
});

// загрузка имени из localStorage
onMounted(() => {
  const savedName = localStorage.getItem("playerName");
  if (savedName) {
    name.value = sanitizeName(savedName);
  }
});

// слежение за вводом и сохранение
watch(name, (newName) => {
  const cleaned = sanitizeName(newName);

  if (cleaned !== newName) {
    name.value = cleaned;
    return;
  }

  if (isNameValid.value) {
    localStorage.setItem("playerName", cleaned);
  }
});

const showHint = computed(() => {
  return name.value.length < MIN_LENGTH;
});
</script>

<template>
  <div class="enter-name">
    <div class="enter-name__container">
      <MyButton />
      <div class="enter-name__wrapper">
        <h2 class="enter-name__title">
          {{ translations[language].enterName }}
        </h2>
        <input
          v-model.trim="name"
          class="enter-name__input"
          type="text"
          :placeholder="translations[language].myNameIs"
          :maxlength="MAX_LENGTH"
        />
        <div v-if="showHint" class="enter-name__hint">
          <p>{{ translations[language].nameHint }}</p>
          <span>{{ translations[language].nameHint2 }}</span>
        </div>
        <MyButton
          v-else
          to="/game-mode"
          :text="translations[language].play"
          btnClass="enter-name__btn"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.enter-name {
  @include adaptive-value(padding-top, 50, 20);

  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__title {
    color: yellow;
    font-style: italic;
    @include adaptive-value(font-size, 50, 26);
    @include adaptive-value(margin-top, 50, 20);
    @include adaptive-value(margin-bottom, 30, 16);
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

  &__hint {
    display: grid;
    place-items: center;
    margin-top: rem(20);
    padding: rem(10) rem(16);
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-radius: rem(12);
    font-size: rem(20);
    text-align: center;
    line-height: 1.4;
    max-width: rem(270);
    height: rem(80);
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
}
</style>
