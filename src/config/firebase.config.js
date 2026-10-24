// Firebase Configuration
// Create a Firebase project at https://console.firebase.google.com/
// Copy your config values here

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MSG_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication
export const auth = getAuth(app)

// The end-to-end run signs up against the local Auth emulator (QA-010), never a
// real Firebase project. Unset everywhere else, so no deployed build connects.
if (process.env.REACT_APP_FB_AUTH_EMULATOR_URL) {
  connectAuthEmulator(auth, process.env.REACT_APP_FB_AUTH_EMULATOR_URL, { disableWarnings: true })
}

export default app
