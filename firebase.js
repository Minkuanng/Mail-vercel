const { initializeApp } = require('firebase/app');
const {
  getDatabase,
  ref,
  set,
  get,
  push,
  remove,
  update,
  child
} = require('firebase/database');

// Uu tien doc tu Environment Variables (dat trong Vercel Project Settings -> Environment Variables).
// Neu chua set thi fallback ve gia tri cu de khong bi vo khi test local.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDiUGWq-aiwz22PIrdqjXbmvmqdoaxiSKs",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "appp-29476.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://appp-29476-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.FIREBASE_PROJECT_ID || "appp-29476",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "appp-29476.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "858592212979",
  appId: process.env.FIREBASE_APP_ID || "1:858592212979:web:34344bb74d30df377a8486",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-TPP8RK6P8T"
};

let database = null;
let app = null;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  database = null;
}

module.exports = {
  database,
  ref,
  set,
  get,
  push,
  remove,
  update,
  child
};
