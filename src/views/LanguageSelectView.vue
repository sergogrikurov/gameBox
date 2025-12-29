<script setup>
import { useLanguage } from "@/composables/useLanguage";
import flagRu from "@/assets/flags/ru.svg";
import flagKa from "@/assets/flags/ge.svg";
import { useRouter } from "vue-router";

const router = useRouter();
const { setLanguage } = useLanguage();

function selectRu() {
  setLanguage("ru");
  router.push("/name");
}

function selectKa() {
  setLanguage("ka");
  router.push("/name");
}
</script>

<template>
  <div class="flags">
    <div class="flags__container">
      <div class="flags__btn-list">
        <button class="flags__btn-list_button" @click="selectRu">
          <img class="flags__btn-list_img" :src="flagRu" alt="Русский" />
        </button>
        <button class="flags__btn-list_button" @click="selectKa">
          <img class="flags__btn-list_img" :src="flagKa" alt="ქართული" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.flags {
  @include adaptive-value(padding-top, 50, 20);
  display: grid;
  place-items: center;

  &__btn-list {
    max-width: rem(290);
    display: flex;
    flex-direction: column;
    & > *:not(:last-child) {
      @include adaptive-value(margin-bottom, 50, 30);
    }
    &_button {
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      &:hover {
        border-radius: rem(5);
        box-shadow: 0px 0px 7px 7px gray;
      }
      &:active {
        transform: translateY(4px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      }
    }

    &_img {
      width: 100%;
      border-radius: 5px;
      box-shadow: 0px 0px 3px 3px gray;
    }
  }
}
</style>
