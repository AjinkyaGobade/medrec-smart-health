# MedRec - Smart Medicine Recommendation System

## Project Overview
MedRec is an intelligent healthcare platform that connects patients with doctors and provides AI-driven medicine suggestions.

### ✨ Key Features
*   **Futuristic UI**: A premium "Health Tech" aesthetic with dark mode, glassmorphism, and neon accents.
*   **Smart Dashboard**:
    *   **User**: Get instant AI medicine suggestions, view consultation history with prescribed medicines, and book doctors.
    *   **Doctor**: Manage pending requests, prescribe medicines, and view patient history.
*   **Real-time History**: Detailed consultation logs including symptoms, doctor notes, and prescribed medication lists.
*   **Responsive Design**: Fully optimized for desktop and mobile devices.

This project uses a **Node.js & SQLite** backend with a **Vanilla HTML/CSS/JS** frontend.

## 🚀 How to Run Locally

Since this is a fresh copy, you need to install dependencies first.

### 1. Setup Backend
Open a terminal in the `backend` folder:
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5000` (and `0.0.0.0:5000`).

### 2. Setup Frontend
Open a terminal in the `frontend` folder:
```bash
cd frontend
npx -y serve .
```
The frontend will run on `http://localhost:3000`.

### 3. Accessing on Mobile (Local Network)
1.  Find your PC's IP address (run `ipconfig` in terminal).
2.  Ensure your phone is on the same Wi-Fi.
3.  Open `http://<YOUR_IP>:3000` on your phone.

---

## 🌐 How to Run After Closing PC (Deployment)

To access the app when your PC is turned off, you must **deploy** it to a cloud server. Here is a recommended free stack:

### 1. Backend (Render.com)
1.  Create a GitHub repository and push this code.
2.  Sign up for [Render](https://render.com/).
3.  Create a new **Web Service**.
4.  Connect your repo.
5.  Set Root Directory to `backend`.
6.  Build Command: `npm install`
7.  Start Command: `node server.js`
8.  Render will give you a URL (e.g., `https://medrec-backend.onrender.com`).

### 2. Frontend (Vercel or Netlify)
1.  **Update Code:** In `frontend/app.js`, change `API_BASE` to your new Render backend URL.
    ```javascript
    const API_BASE = 'https://medrec-backend.onrender.com/api';
    ```
2.  Sign up for [Vercel](https://vercel.com/).
3.  Import your GitHub repo.
4.  Set Root Directory to `frontend`.
5.  Deploy.
6.  Vercel will give you a permanent URL (e.g., `https://medrec-app.vercel.app`).

**Now you can open that Vercel link on your mobile anytime, anywhere!**
