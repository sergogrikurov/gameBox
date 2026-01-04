<template>
  <div class="two-player-game">
    <h2>Тест игры</h2>
    <p><strong>Game ID:</strong> {{ gameData.id }}</p>
    <p><strong>Room ID:</strong> {{ gameData.roomId }}</p>
    <p><strong>Game:</strong> {{ gameData.game }}</p>
    <p><strong>Player 1:</strong> {{ gameData.player1 }}</p>
    <p><strong>Player 2:</strong> {{ gameData.player2 }}</p>
    <p><strong>Status:</strong> {{ gameData.status }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase.js";

const route = useRoute();
const gameId = route.params.roomId; // мы передаём gameDocRef.id как roomId в маршруте
const gameData = ref({
  id: "",
  roomId: "",
  game: "",
  player1: "",
  player2: "",
  status: "",
});

onMounted(async () => {
  if (!gameId) return;

  const gameRef = doc(db, "games", gameId);

  // Подписка на изменения документа игры
  onSnapshot(gameRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    gameData.value = {
      id: docSnap.id,
      roomId: data.roomId,
      game: data.game,
      player1: data.player1,
      player2: data.player2,
      status: data.status,
    };
    console.log("Game Data:", gameData.value); // проверяем в консоли
  });
});
</script>

<style scoped>
p {
  margin: 4px 0;
}
</style>
