<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
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
  deleteDoc,
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
  inviteUsed: false,
});
const roomLoaded = ref(false); // для корректного отображения кнопки Invite

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
      inviteUsed: false,
      language: localStorage.getItem("language") || "ru",
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

    // РАННЯЯ проверка: если комнаты нет, сразу редиректим
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      router.replace("/"); // или на главную
      return;
    }

    const data = roomSnap.data();

    if (!data.player2) {
      await updateDoc(roomRef, {
        player2: playerName.value,
        status: "ready",
      });
    }

    if (!localStorage.getItem("language")) {
      localStorage.setItem("language", data.language || "ru");
    }
  }

  // ---------- Подписка на изменения комнаты ----------
  if (roomId.value) {
    const roomRef = doc(db, "rooms", roomId.value);
    onSnapshot(roomRef, (docSnap) => {
      // Если комнату удалили после того, как игрок зашёл
      if (!docSnap.exists()) {
        router.replace("/");
        return;
      }

      const data = docSnap.data();

      roomData.value = {
        player1: data.player1 || (playerName.value === data.player1 ? playerName.value : "-"),
        player2: data.player2 || "",
        status: data.player2 ? data.status : "waiting",
        inviteUsed: data.inviteUsed || false,
      };

      inviteLink.value = `${window.location.origin}/two-player-room/${gameKey}?roomId=${roomId.value}`;
      roomLoaded.value = true;
    });
  }
};

// ---------- Кнопка Start Game ----------
const startGame = async () => {
  if (!roomId.value) return;

  const roomRef = doc(db, "rooms", roomId.value);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    // Комната уже удалена → просто выходим
    return;
  }

  const data = roomSnap.data();

  if (!data.player1 || !data.player2) {
    alert("Ждём второго игрока");
    return;
  }

  const gamesRef = collection(db, "games");
  const q = query(gamesRef, where("roomId", "==", roomId.value));
  const qSnap = await getDocs(q);

  let gameDocId = "";

  if (!qSnap.empty) {
    // Игра уже существует
    gameDocId = qSnap.docs[0].id;
  } else {
    // Создаём новую игру
    const gameData = {
      roomId: roomId.value,
      game: gameKey,
      player1: data.player1,
      player2: data.player2,
      status: "ongoing",
      currentPlayer: data.player1,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    if (gameKey === "Battleship") {
      const emptyGrid = () =>
        Array(100)
          .fill(null)
          .map(() => ({ ship: false, hit: false, miss: false }));

      gameData.player1Grid = emptyGrid();
      gameData.player2Grid = emptyGrid();
      gameData.shipsPlayer1 = [];
      gameData.shipsPlayer2 = [];
      gameData.hitHistory = [];
      gameData.winner = null;
      gameData.scorePlayer1 = 0;
      gameData.scorePlayer2 = 0;
    } else if (gameKey === "TicTacToe") {
      gameData.board = Array(9).fill("");
      gameData.winner = null;
    }

    const gameDocRef = await addDoc(gamesRef, gameData);
    gameDocId = gameDocRef.id;
  }

  // Редирект в игру
  if (gameKey === "Battleship") {
    router.push({
      name: "twoPlayerBattleship",
      params: { roomId: gameDocId },
    });
  } else if (gameKey === "TicTacToe") {
    router.push({
      name: "twoPlayerTicTacToe",
      params: { roomId: gameDocId },
    });
  }
};

// ---------- Запуск при монтировании ----------
onMounted(() => {
  if (playerName.value) initRoom();

  // ---------- Удаление комнаты при закрытии вкладки ----------
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

const handleBeforeUnload = async () => {
  if (!roomId.value) return;

  const roomRef = doc(db, "rooms", roomId.value);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const data = roomSnap.data();

  if (data.player1 === playerName.value) {
    // создатель покинул вкладку → удаляем комнату
    await deleteDoc(roomRef);
  } else if (data.player2 === playerName.value) {
    // второй игрок покинул вкладку → освобождаем слот
    await updateDoc(roomRef, {
      player2: null,
      status: "waiting",
      inviteUsed: false,
    });
  }
};

// ---------- Копировать ссылку ----------
const inviteFriend = async () => {
  const text = `🎮 ${playerName.value} invites you to play ${gameKey}
Click to join 👇
${inviteLink.value}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${gameKey} invitation`,
        text,
        url: inviteLink.value,
      });
    } catch {
      console.log("Share cancelled");
    }
  } else {
    await navigator.clipboard.writeText(text);
  }

  // Скрываем кнопку для всех
  const roomRef = doc(db, "rooms", roomId.value);
  await updateDoc(roomRef, {
    inviteUsed: true,
  });
};

// ---------- Выход из комнаты ----------
const exitRoom = async () => {
  if (!roomId.value) return;

  const roomRef = doc(db, "rooms", roomId.value);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const data = roomSnap.data();

  if (data.player1 === playerName.value) {
    await deleteDoc(roomRef);
    router.push("/two-player-game-list");
    return;
  }

  if (data.player2 === playerName.value) {
    await updateDoc(roomRef, {
      player2: null,
      status: "waiting",
      inviteUsed: false,
    });
    router.push("/two-player-game-list");
  }
};
</script>

<template>
  <div class="room">
    <div class="room__container">
      <h2 class="room__title">{{ gameKey }}</h2>
      <div class="room__wrapper">
        <div class="room__modal" v-if="showNameModal">
          <input class="room__modal_input" v-model="nameInput" placeholder="Name" />
          <button class="room__modal_btn" @click="submitName">Save</button>
        </div>

        <div class="room__text-list-wrapper" v-else>
          <div class="room__text-list">
            <p class="room__text-list_player-one">Player 1: {{ roomData.player1 || "-" }}</p>
            <p class="room__text-list_player-two">
              Player 2:
              {{ roomData.player2 || "waiting" }}
            </p>
            <p class="room__text-list_room-status">Status: {{ roomData.status }}</p>
          </div>

          <button
            class="room__link_btn"
            @click="inviteFriend"
            v-if="roomLoaded && !roomData.inviteUsed"
          >
            Invite friend
          </button>

          <button
            class="room__btn-start"
            @click="startGame"
            :disabled="!roomData.player1 || !roomData.player2"
          >
            Play
          </button>
        </div>
        <div>
          <button class="room__exit-btn" @click="exitRoom">Выйти</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.room {
  @include adaptive-value(padding-top, 50, 20);
  &__title {
    text-align: center;
    @include adaptive-value(font-size, 50, 20);
    color: green;
    @include adaptive-value(margin-top, 50, 20);
  }
  &__wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    @include adaptive-value(margin-top, 50, 20);
    & > *:not(:last-child) {
      margin-bottom: rem(20);
    }
  }
  &__modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: rem(290);
    &_input {
      @include adaptive-value(width, 250, 200);
      font-size: rem(20);
      padding: rem(10) rem(5);
      border-radius: rem(5);
    }
    &_btn {
      display: flex;
      justify-content: center;
      align-items: center;
      height: rem(49);
      font-size: rem(20);
      background-color: #03bff8;
      border-radius: rem(12);
      font-style: italic;
      color: #fff;
      @include adaptive-value(width, 250, 200);
      @include adaptive-value(margin-top, 20, 10);

      &:not(:disabled):hover {
        background-color: #11c2f8;
        transform: translateY(-2px);
        box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
      }

      &:not(:disabled):active {
        background-color: #03ade0;
        transform: translateY(0);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  &__text-list-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    & > *:not(:last-child) {
      margin-bottom: rem(10);
    }
  }
  &__text-list {
    display: flex;
    flex-direction: column;
    align-items: center;

    @include adaptive-value(font-size, 40, 20);
    &_player-one {
      color: red;
    }
    &_player-two {
      color: blue;
    }
    &_room-status {
      color: blueviolet;
    }
  }
  &__btn-start {
    display: flex;
    justify-content: center;
    align-items: center;
    height: rem(49);
    font-size: rem(20);
    background-color: #4caf50;
    border-radius: rem(12);
    font-style: italic;
    color: #fff;
    @include adaptive-value(width, 250, 200);
    @include adaptive-value(margin-top, 20, 10);

    &:not(:disabled):hover {
      background-color: #45a049;
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
    }

    &:not(:disabled):active {
      background-color: #3e8e41;
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  &__link {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: rem(290);
    overflow: hidden;
    &_input {
      font-size: rem(20);
      padding: rem(10) rem(5);
      border-radius: rem(5);
    }
    &_btn {
      display: flex;
      justify-content: center;
      align-items: center;
      height: rem(49);
      font-size: rem(20);
      background-color: #03bff8;
      border-radius: rem(12);
      font-style: italic;
      color: #fff;
      @include adaptive-value(width, 250, 200);
      @include adaptive-value(margin-top, 20, 10);

      &:not(:disabled):hover {
        background-color: #11c2f8;
        transform: translateY(-2px);
        box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
      }

      &:not(:disabled):active {
        background-color: #03ade0;
        transform: translateY(0);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  &__exit-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    height: rem(49);
    font-size: rem(20);
    background-color: red;
    border-radius: rem(12);
    font-style: italic;
    color: #fff;
    @include adaptive-value(width, 250, 200);
    margin-top: rem(20);

    &:not(:disabled):hover {
      background-color: rgb(218, 3, 3);
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(0, 0, 0, 0.25);
    }

    &:not(:disabled):active {
      background-color: rgb(247, 14, 14);
      transform: translateY(0);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
