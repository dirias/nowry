// Firebase's getAuth refuses an empty API key when src/config/firebase.config.js
// is imported. Locally .env supplies one; CI has no .env, so without this every
// suite that imports the auth context failed to load (QA-001). Tests never reach
// Firebase, so a placeholder is all they need; a real key in .env still wins.
//
// A module of its own because imports are hoisted: written as a statement in
// setupTests.js it would run after that file's imports had loaded the config.
if (!process.env.REACT_APP_FB_API_KEY) process.env.REACT_APP_FB_API_KEY = 'test-api-key'
