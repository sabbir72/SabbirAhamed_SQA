# Production Deployment Guide

This guide details how to deploy the **Sabbir Ahamed SQA Portfolio** to **Render**, **Vercel**, or **Docker / Cloud Run**.

---

## 🌐 Deploying to Render (Recommended Full-Stack Node.js Service)

The project includes `render.yaml` for automatic Blueprint deployments.

### Blueprint Auto-Setup via Render Dashboard

1. Push your changes to GitHub:
   ```bash
   git push origin main
   ```
2. Open the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** > **Blueprint**.
4. Connect your GitHub repository `sabbir72/Sabbir_Ahamed_SQA`.
5. Render will automatically read `render.yaml` with settings:
   - **Environment**: Node
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start` (`node dist/server.cjs`)
   - **Health Check Path**: `/api/health`
6. Add your secret environment variable in Render Dashboard:
   - `BREVO_API_KEY`: Your Brevo transactional API key.
7. Click **Apply**. Render will deploy the application and provide a live HTTPS URL.

---

## ⚡ Deploying to Vercel (Client-Side Static SPA)

The project includes `vercel.json` pre-configured for static Vite hosting and SPA route rewrites.

### Direct Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import the `sabbir72/Sabbir_Ahamed_SQA` repository.
3. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL`
   - `BREVO_RECIPIENT_EMAIL`
5. Click **Deploy**.

---

## 🤖 GitHub Actions CI/CD Pipeline

The `.github/workflows/ci-cd.yml` workflow automatically runs on every push and PR to `main` or `master`:

1. **Linting & Type Checking**: Runs `npm run lint` (`tsc --noEmit`).
2. **Production Build Validation**: Executes `npm run build`.
3. **Automated Deploy Triggers**:
   - Triggers Render deploy hook if `RENDER_DEPLOY_HOOK_URL` secret is configured in GitHub.
   - Deploys to Vercel if `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets are set.

---

## 🛡️ Health Check Verification

After deployment, verify that the application backend is operational by visiting:
```http
GET /api/health
```
Expected response:
```json
{
  "status": "ok",
  "service": "portfolio-server",
  "timestamp": "2026-07-29T12:00:00.000Z"
}
```
