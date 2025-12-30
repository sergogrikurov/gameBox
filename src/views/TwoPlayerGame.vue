<script setup>
import { useRoute } from "vue-router";
import TicTacToe from "./games/multi/TicTacToe.vue";
const route = useRoute();
</script>

<template>
  <div class="two-plaer-game">
    <TicTacToe v-if="route.params.game === 'TicTacToe'" />
  </div>
</template>

<style lang="scss" scoped>
.two-plaer-game {
  @include adaptive-value(padding-top, 50, 0);
}
</style>
