<script setup>
import { useRoute } from "vue-router";
import MemoryGame from "@/views/games/single/MemoryGame.vue";

const route = useRoute();
</script>

<template>
  <div class="single-player-game">
    <MemoryGame v-if="route.params.game === 'memory'" />
  </div>
</template>

<style lang="scss" scoped>
.single-player-game {
  @include adaptive-value(padding-top, 50, 0);
}
</style>
