# Garage@EEE Fake Kahoot

A lightweight pseudo-real-time quiz app for Garage@EEE Innovation Festival 2026.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and fill in your Firebase Web App values.

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open:

   - Host page: `http://localhost:5173/host`
   - Player page: use the session join link shown on the host page.
   - Display page: use the display link shown on the host page.

The host page includes a QR code for the player link. If you are testing from another phone or laptop on the same Wi-Fi, open the host page with your computer's local IP address instead of `localhost` so the QR code points to a reachable URL.

The host page can also export a CSV of results. Each participant gets one row per question with total score, selected answer, correctness, response time, and question score.

## Firebase Setup

1. Create a Firebase project.
2. Add a Web App in the Firebase console.
3. Enable Realtime Database.
4. Copy the web app config values into `.env`:

   ```text
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_DATABASE_URL=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_APP_ID=
   ```

5. For a short internal event test, you can start with permissive Realtime Database rules, then tighten or disable them after the event:

   ```json
   {
     "rules": {
       "sessions": {
         "$sessionId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

Do not leave public write rules enabled longer than needed.

## Public Deployment

Use a public deployment for the real event so phones can join through a normal URL instead of a laptop LAN address.

### Vercel

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add these Environment Variables in Vercel Project Settings:

   ```text
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_DATABASE_URL
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_APP_ID
   ```

4. Build command: `npm run build`
5. Output directory: `dist`

`vercel.json` is included so `/host`, `/play`, and `/display` work after refresh.

### Netlify

1. Push the project to GitHub.
2. Import the repo in Netlify.
3. Add the same Firebase environment variables in Site Configuration.
4. Build command: `npm run build`
5. Publish directory: `dist`

`netlify.toml` is included so app routes work after refresh.

### Firebase Hosting

1. Install Firebase CLI if needed:

   ```bash
   npm install -g firebase-tools
   ```

2. Login and select the project:

   ```bash
   firebase login
   firebase use garage-kahoot
   ```

3. Build and deploy:

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

`firebase.json` is included for hosting rewrites. If you use Firebase Hosting, copy `.firebaserc.example` to `.firebaserc` and confirm the project ID.

## Editing Questions

Questions live in `src/config/quiz.js`. Each question has an `id`, `question`, four `options`, `correctIndex`, and `durationSeconds`. For questions where multiple answers should be accepted, use `correctIndexes`, for example `correctIndexes: [0, 1, 2, 3]`.
