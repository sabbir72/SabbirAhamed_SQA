# Installation & Local Setup Guide

This document provides step-by-step instructions for installing and running the **Sabbir Ahamed SQA Portfolio** application locally.

---

## 📋 System Prerequisites

Before running this application, ensure your workstation meets the following minimum requirements:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (or `bun` / `yarn`)
- **Git**: v2.30.0 or higher

Check your installed versions by running:
```bash
node -v
npm -v
git --version
```

---

## 🚀 Local Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/sabbir72/Sabbir_Ahamed_SQA.git
cd Sabbir_Ahamed_SQA
```

### Step 2: Configure Environment Variables

Copy the provided `.env.example` file to `.env` or `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your keys:
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Optional: Brevo API key for real transactional contact emails
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=sabbircse72@gmail.com
BREVO_RECIPIENT_EMAIL=sabbircse72@gmail.com

# Optional: Gemini API Key for AI SQA Cover Letter Generator
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run the Local Development Server

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

---

## 🛠️ Available NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Launches development server with live reload on port 3000 |
| `npm run build` | `vite build && esbuild server.ts ...` | Compiles client assets and bundles CommonJS server |
| `npm start` | `node dist/server.cjs` | Runs production server |
| `npm run lint` | `tsc --noEmit` | Performs strict TypeScript type checking |
| `npm run clean` | `rm -rf dist server.cjs` | Cleans previous build artifacts |

---

## ⚡ Troubleshooting

### Issue: `Port 3000 is already in use`
Set a custom PORT variable in your terminal before starting:
```bash
PORT=3001 npm run dev
```

### Issue: `Missing BREVO_API_KEY`
If `BREVO_API_KEY` is not provided, contact submissions will show a helpful warning toast in development mode without crashing the app.
