<script setup>
import { ref, onMounted } from "vue";
import { db } from "@/firebase/firebase.js";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useRoute, useRouter } from "vue-router";

// ---------- REF для имени и модалки ----------
const playerName = ref(localStorage.getItem("playerName") || "");
const showNameModal = ref(!playerName.value);
const nameInput = ref(playerName.value || "");
const MIN_LENGTH = 2;
const MAX_LENGTH = 12;

// ---------- Очистка имени ----------
const sanitizeName = (value) =>
  value
    .replace(/[<>]/g, "")
    .replace(/[^a-zA-Zа-яА-Я0-9\u10A0-\u10FF ]/g, "")
    .replace(/\s{2,}/g, " ");

const isNameValid = () => {
  const cleaned = sanitizeName(nameInput.value.trim());
  return cleaned.length >= MIN_LENGTH && cleaned.length <= MAX_LENGTH;
};

function submitName() {
  if (!isNameValid()) return;
  const cleaned = sanitizeName(nameInput.value.trim());
  playerName.value = cleaned;
  localStorage.setItem("playerName", cleaned);
  showNameModal.value = false;
  initRoom();
}

// ---------- Router ----------
const route = useRoute();
const router = useRouter();
const gameKey = route.params.game;

// ---------- Состояние комнаты ----------
const roomId = ref(null);
const inviteLink = ref("");
const roomData = ref({
  player1: "",
  player2: "",
  status: "waiting",
});

// ---------- Инициализация комнаты ----------
const roomIdFromUrl = route.query.roomId || null;

const initRoom = async () => {
  if (!playerName.value) return;

  // ---------- СОЗДАТЕЛЬ ----------
  if (!roomIdFromUrl) {
    const docRef = await addDoc(collection(db, "rooms"), {
      game: gameKey,
      player1: playerName.value,
      player2: null,
      status: "waiting",
      language: localStorage.getItem("language") || "ru", // сохраняем язык создателя
      createdAt: serverTimestamp(),
    });
    roomId.value = docRef.id;

    router.replace({
      path: `/two-player-room/${gameKey}`,
      query: { roomId: roomId.value },
    });
  }

  // ---------- ГОСТ (второй игрок) ----------
  if (roomIdFromUrl) {
    roomId.value = roomIdFromUrl;
    const roomRef = doc(db, "rooms", roomIdFromUrl);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const data = roomSnap.data();

    if (!data.player2) {
      await updateDoc(roomRef, {
        player2: playerName.value,
        status: "ready",
      });
    }

    // ---------- Синхронизация языка ----------
    if (!localStorage.getItem("language")) {
      localStorage.setItem("language", data.language || "ru");
    }
  }

  // ---------- Подписка на изменения комнаты ----------
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
};

// ---------- Кнопка Start Game ----------
const startGame = async () => {
  if (!roomId.value) return;

  const roomRef = doc(db, "rooms", roomId.value);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const data = roomSnap.data();

  // Проверка, что оба игрока есть
  if (!data.player1 || !data.player2) {
    alert("Ждём второго игрока");
    return;
  }

  // Проверка, есть ли уже игра для этой комнаты
  const gamesRef = collection(db, "games");
  const q = query(gamesRef, where("roomId", "==", roomId.value));
  const qSnap = await getDocs(q);

  let gameDocId = "";
  if (!qSnap.empty) {
    gameDocId = qSnap.docs[0].id;
  } else {
    const gameData = {
      roomId: roomId.value,
      game: gameKey,
      player1: data.player1,
      player2: data.player2,
      status: "ongoing",
      currentPlayer: data.player1,
      createdAt: serverTimestamp(),
      board: Array(9).fill(""), // TicTacToe поле 3x3
      winner: null,
    };
    const gameDocRef = await addDoc(gamesRef, gameData);
    gameDocId = gameDocRef.id;
  }

  // Редирект на компонент игры
  if (gameKey === "TicTacToe") {
    router.push({
      name: "twoPlayerTicTacToe",
      params: { roomId: gameDocId },
    });
  } else if (gameKey === "Battleship") {
    router.push({
      name: "twoPlayerBattleship",
      params: { roomId: gameDocId },
    });
  }
};

// ---------- Запуск при монтировании ----------
onMounted(() => {
  if (playerName.value) initRoom();
});

// ---------- Копировать ссылку ----------
const copied = ref(false);
const copyInviteLink = () => {
  navigator.clipboard.writeText(inviteLink.value).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
};
</script>

<template>
  <div>
    <h2>Комната для игры: {{ gameKey }}</h2>

    <div v-if="showNameModal">
      <input v-model="nameInput" placeholder="Введите имя" />
      <button @click="submitName">Сохранить имя</button>
    </div>

    <div v-else>
      <p>Вы: {{ playerName }}</p>
      <p>Игрок 1: {{ roomData.player1 || "-" }}</p>
      <p>Игрок 2: {{ roomData.player2 || "Ждём второго игрока..." }}</p>
      <p>Статус комнаты: {{ roomData.status }}</p>

      <button @click="startGame" :disabled="!roomData.player1 || !roomData.player2">
        Start Game
      </button>

      <div>
        <input :value="inviteLink" readonly />
        <button @click="copyInviteLink">
          {{ copied ? "Скопировано!" : "Скопировать ссылку" }}
        </button>
      </div>
    </div>
  </div>
</template>
