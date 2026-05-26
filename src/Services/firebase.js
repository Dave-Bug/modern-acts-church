import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA-1mF_cRvUCfm77kOHj7XCTF8EY7m5ql8",
  authDomain: "dbmacministry.firebaseapp.com",
  projectId: "dbmacministry",
  storageBucket: "dbmacministry.firebasestorage.app",
  messagingSenderId: "876448750829",
  appId: "1:876448750829:web:3868571161edefa26c80e4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

