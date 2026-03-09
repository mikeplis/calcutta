import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyB40xC5ARiUUbRUIwT2Fiwmp3b7RkgUKuA",
  authDomain: "calcutta2-ecac7.firebaseapp.com",
  projectId: "calcutta2-ecac7",
  storageBucket: "calcutta2-ecac7.firebasestorage.app",
  messagingSenderId: "520773377994",
  appId: "1:520773377994:web:510ce242ff0f3d8a4c7933",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
