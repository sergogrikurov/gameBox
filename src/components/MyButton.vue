<template>
  <button :class="btnClass" :disabled="disabled" @click="handleClick">
    <!-- Иконка, если есть и нет текста -->
    <img v-if="icon && !text" :src="icon" alt="Back Arrow" />

    <!-- Текст -->
    <span v-if="text">{{ text }}</span>
  </button>
</template>

<script setup>
import { useRouter } from "vue-router";
import backArrow from "@/assets/arrows/back_arrow.png";

const router = useRouter();

const props = defineProps({
  to: { type: String, default: "/" },
  text: { type: String, default: "" },
  icon: { type: String, default: backArrow },
  btnClass: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

function handleClick() {
  if (props.disabled) return;
  router.push(props.to);
}
</script>
