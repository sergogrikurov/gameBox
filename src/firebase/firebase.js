// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAozSpNZrXH8TIY7GIx5sn8oq9Qy22JW_w",
  authDomain: "gamebox-92bf6.firebaseapp.com",
  projectId: "gamebox-92bf6",
  storageBucket: "gamebox-92bf6.firebasestorage.app",
  messagingSenderId: "91280698478",
  appId: "1:91280698478:web:3f015cba27f845f9400a7f",
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Экспорт Firestore для использования в проектах
export const db = getFirestore(app);
