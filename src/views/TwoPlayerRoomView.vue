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
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

// ---------- REF для имени и модалки ----------
const playerName = ref(localStorage.getItem("playerName") || "");
const showNameModal = ref(!playerName.value);

// ---------- Ввод имени ----------
const nameInput = ref(playerName.value || "");

// ограничения имени
const MIN_LENGTH = 2;
const MAX_LENGTH = 12;

// очистка и защита ввода
const sanitizeName = (value) => {
  return value
    .replace(/[<>]/g, "")
    .replace(/[^a-zA-Zа-яА-Я0-9\u10A0-\u10FF ]/g, "")
    .replace(/\s{2,}/g, " ");
};

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

// ---------- router / route ----------
const route = useRoute();
const router = useRouter();

// ---------- состояние комнаты ----------
const roomId = ref(null);
const inviteLink = ref("");
const roomData = ref({
  player1: "",
  player2: "",
  status: "waiting",
});

// ---------- игра ----------
const gameKey = route.params.game;

// ---------- roomId из URL (если гость) ----------
const roomIdFromUrl = route.query.roomId || null;

// ---------- Функция редиректа на игру ----------
function startGame() {
  router.push({
    path: `/two-player-game/${roomId.value}`,
    query: { game: gameKey },
  });
}

// ---------- Логика комнаты (создание/присоединение) ----------
const initRoom = async () => {
  if (!playerName.value) return; // ждём, пока игрок введёт имя

  // СОЗДАТЕЛЬ
  if (!roomIdFromUrl) {
    const docRef = await addDoc(collection(db, "rooms"), {
      game: gameKey,
      player1: playerName.value,
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
  }

  // ГОСТ ПО ССЫЛКЕ
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

// ---------- Запуск комнаты при монтировании ----------
onMounted(() => {
  if (playerName.value) initRoom();
});

const copied = ref(false);

const copyInviteLink = () => {
  navigator.clipboard.writeText(inviteLink.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};
</script>

<template>
  <div class="two-player-room">
    <!-- Модалка для имени -->
    <div v-if="showNameModal" class="modal-overlay">
      <div class="modal">
        <h2>Введите своё имя</h2>
        <input v-model="nameInput" type="text" :maxlength="MAX_LENGTH" placeholder="Ваше имя" />
        <button :disabled="!isNameValid()" @click="submitName">OK</button>
        <p v-if="nameInput.length > 0 && !isNameValid()" class="hint">
          Имя должно быть от {{ MIN_LENGTH }} до {{ MAX_LENGTH }} символов
        </p>
      </div>
    </div>

    <!-- Основной интерфейс комнаты -->
    <div v-else>
      <h2>Игра: {{ gameKey }}</h2>

      <div class="room-info">
        <p>Player 1: {{ roomData.player1 }}</p>
        <p>Player 2: {{ roomData.player2 || "Ждём второго игрока..." }}</p>
        <p>Status: {{ roomData.status }}</p>
      </div>

      <div v-if="roomData.status === 'waiting'" class="invite-link">
        <input type="text" :value="inviteLink" readonly />
        <button @click="copyInviteLink">Скопировать ссылку</button>
        <!-- Показываем уведомление -->
        <span v-if="copied" class="copied-hint">Ссылка скопирована!</span>
      </div>

      <div class="start-game">
        <button :disabled="roomData.status !== 'ready'" @click="startGame">Start Game</button>
      </div>
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

/* Модалка */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  padding: 30px 40px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal input {
  padding: 10px;
  font-size: 16px;
  width: 250px;
  margin-bottom: 10px;
}

.modal button {
  padding: 8px 16px;
  font-size: 16px;
  cursor: pointer;
}

.modal button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invite-link {
  display: flex;
  gap: 10px;
  align-items: center;
  position: relative;
}

.copied-hint {
  color: green;
  font-size: 14px;
  margin-left: 10px;
  transition: opacity 0.3s;
}

.hint {
  margin-top: 8px;
  color: red;
  font-size: 14px;
  text-align: center;
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
