# Deployment Guide

This application is a Single Page Application (SPA) built with Vite and React. It can be hosted on any static hosting provider.

## Prerequisites
- Node.js installed.
- A Firebase project created (for Auth and Cloud Backup).

## 1. Firebase Configuration
Ensure your `src/firebase.js` is configured with your Firebase project credentials.
Enable **Authentication** (Google Provider) and **Firestore** in your Firebase Console.

## 2. Build for Production
Run the build command to generate the static files:

```bash
npm run build
```

This will create a `dist` folder containing the compiled assets.

## 3. Hosting Options

### Option A: Vercel (Recommended)
1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in the project root.
3.  Follow the prompts. Vercel will automatically detect Vite and deploy.

### Option B: Netlify
1.  Drag and drop the `dist` folder to Netlify Drop.
2.  Or connect your Git repository and set the build command to `npm run build` and publish directory to `dist`.

### Option C: Firebase Hosting
1.  Install Firebase CLI: `npm i -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init` (Select Hosting)
4.  Set public directory to `dist`.
5.  Deploy: `firebase deploy`

## Multi-user Support
The application supports multiple users via Firebase Authentication.
-   Each user has their own isolated data in the browser (IndexedDB).
-   When they click "Sincronizar", their data is backed up to a private document in Firestore (`users/{uid}`).
-   Other users cannot access each other's data (ensure Firestore Rules are set to allow read/write only if `request.auth.uid == userId`).

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
