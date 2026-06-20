# AI Interview Coach 🎯

A production-ready AI-powered video interview practice platform built with React, Vite, Tailwind CSS, Firebase, and Google Gemini.

## Features

- 🎥 **Live Video Interview** – Google Meet-style webcam feed
- 🎙️ **Voice Answering** – Web Speech API with live transcript
- 🤖 **AI Question Generation** – Gemini generates role-specific questions
- 📊 **Per-Answer Scoring** – Technical, Communication, Confidence, Clarity, Problem Solving
- 🔄 **Dynamic Follow-ups** – AI probes weak answers deeper
- 📈 **Placement Readiness Gauge** – % score with strengths/weaknesses
- 📄 **PDF Report** – Download full interview report
- 🔒 **Firebase Auth** – Email/password with protected routes
- 💾 **Firestore** – Persisted interview history

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd ai-interview-coach
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication → Email/Password**
4. Create a **Firestore** database
5. Copy your project credentials

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key for **Gemini 1.5 Flash**

### 4. Set environment variables

```bash
cp .env.example .env
# Fill in your keys in .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...
```

### 5. Firestore Security Rules

In Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /interviews/{interviewId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /reports/{reportId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

### 6. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
# Add all VITE_* environment variables in Vercel dashboard
```

## Project Structure

```
src/
├── components/
│   ├── ui/             # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ScoreBar.jsx
│   │   └── ReadinessGauge.jsx
│   └── interview/      # Interview-specific components
│       ├── VideoFeed.jsx
│       ├── InterviewerAvatar.jsx
│       ├── QuestionCard.jsx
│       ├── AnswerPanel.jsx
│       └── ScoreFeedback.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── DashboardPage.jsx
│   ├── InterviewSetupPage.jsx
│   ├── InterviewSessionPage.jsx
│   ├── ReportPage.jsx
│   └── HistoryPage.jsx
├── hooks/
│   ├── useWebcam.js
│   └── useSpeechRecognition.js
├── services/
│   ├── geminiService.js
│   ├── firestoreService.js
│   └── pdfService.js
├── firebase/
│   └── config.js
├── context/
│   ├── AuthContext.jsx
│   └── InterviewContext.jsx
├── routes/
│   └── ProtectedRoute.jsx
└── App.jsx
```

## Available Roles

- Frontend Developer
- Backend Developer
- Full Stack Developer
- Java Developer
- Python Developer
- Data Analyst
- Digital Marketing
- HR Interview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Firestore |
| AI | Google Gemini 1.5 Flash |
| Speech | Web Speech API |
| Video | MediaDevices API |
| PDF | jsPDF + autoTable |
| Routing | React Router v6 |
