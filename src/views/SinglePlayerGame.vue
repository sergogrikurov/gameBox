<script setup>
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const gameRoutes = {
  memory: "singleMemory",
};

const game = route.params.game;

if (gameRoutes[game]) {
  router.replace({ name: gameRoutes[game] });
} else {
  router.replace("/single-player-game-list");
}
</script>
