<script setup>
import { useRoute, useRouter } from "vue-router";
import { onMounted } from "vue";

const route = useRoute();
const router = useRouter();

onMounted(() => {
  const roomId = route.params.roomId;
  const game = route.query.game;

  if (!roomId || !game) {
    router.replace("/two-player-game-list");
    return;
  }

  if (game === "TicTacToe") {
    router.replace({
      name: "twoPlayerTicTacToe",
      params: { roomId },
    });
  }
});
</script>
