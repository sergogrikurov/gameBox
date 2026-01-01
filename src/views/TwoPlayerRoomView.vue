<script setup>
import { db } from "@/firebase/firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

// router / route
const route = useRoute();
const router = useRouter();

// состояние
const roomId = ref(null);
const inviteLink = ref("");
const roomData = ref({
  player1: "",
  player2: "",
  status: "waiting",
});

// 1. игра
const gameKey = route.params.game;

// 2. roomId из URL (если гость)
const roomIdFromUrl = route.query.roomId || null;

// 3. имя игрока
const playerName = localStorage.getItem("playerName");

function startGame() {
  // просто для начала редиректим на игровое поле
  // можно создать отдельный роут /two-player-game/:roomId
  router.push({
    path: `/two-player-game/${roomId.value}`,
    query: { game: gameKey },
  });
}

// функция копирования ссылки
function copyInviteLink() {
  navigator.clipboard.writeText(inviteLink.value);
  alert("Ссылка скопирована!");
}

onMounted(async () => {
  // СОЗДАТЕЛЬ
  if (!roomIdFromUrl) {
    const docRef = await addDoc(collection(db, "rooms"), {
      game: gameKey,
      player1: playerName,
      player2: null,
      status: "waiting",
      board: Array(9).fill(""),
      currentPlayer: "X",
      result: null,
      createdAt: serverTimestamp(),
    });

    roomId.value = docRef.id;

    router.replace({
      path: `/two-player-room/${gameKey}`,
      query: { roomId: roomId.value },
    });

    console.log("Room created:", roomId.value);
  }

  // ГОСТ ПО ССЫЛКЕ
  if (roomIdFromUrl) {
    roomId.value = roomIdFromUrl;

    const roomRef = doc(db, "rooms", roomIdFromUrl);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      console.error("Room not found");
      return;
    }

    const data = roomSnap.data();
    if (!data.player2) {
      await updateDoc(roomRef, {
        player2: playerName,
        status: "ready",
      });
      console.log("Joined room as player2");
    } else {
      console.warn("Room already has two players");
    }
  }

  // подписка на изменения комнаты
  if (roomId.value) {
    const roomRef = doc(db, "rooms", roomId.value);

    onSnapshot(roomRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      roomData.value = {
        player1: data.player1,
        player2: data.player2 || "",
        status: data.status,
      };

      inviteLink.value = `${window.location.origin}/two-player-room/${gameKey}?roomId=${roomId.value}`;
    });
  }
});
</script>

<template>
  <div class="two-player-room">
    <h2>Игра: {{ gameKey }}</h2>

    <div class="room-info">
      <p>Player 1: {{ roomData.player1 }}</p>
      <p>Player 2: {{ roomData.player2 || "Ждём второго игрока..." }}</p>
      <p>Status: {{ roomData.status }}</p>
    </div>

    <div v-if="roomData.status === 'waiting'" class="invite-link">
      <input type="text" :value="inviteLink" readonly />
      <button @click="copyInviteLink">Скопировать ссылку</button>
    </div>

    <div class="start-game">
      <button :disabled="roomData.status !== 'ready'" @click="startGame">Start Game</button>
    </div>
  </div>
</template>

<style scoped>
.two-player-room {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.room-info {
  margin-bottom: 20px;
}

.invite-link {
  display: flex;
  gap: 10px;
}

.invite-link input {
  width: 300px;
  padding: 5px;
}

.invite-link button {
  padding: 5px 10px;
  cursor: pointer;
}

.start-game button {
  padding: 10px 20px;
  font-size: 16px;
  margin-top: 20px;
  cursor: pointer;
}

.start-game button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
