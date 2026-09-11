# Sabbir Ahamed — Software QA Engineer Portfolio

An interactive, high-performance portfolio website for **Sabbir Ahamed**, a Software Quality Assurance (SQA) Engineer specializing in Manual QA, Automated E2E Testing (Playwright, Python, Cypress, Selenium), REST API Assertions, and Performance Load Testing (JMeter).

Designed with modern dark luxury aesthetics, responsive micro-interactions, smooth scroll navigation, and comprehensive SQA project showcases.

---

## ⚡ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Motion (`motion/react`)
- **Icons:** Lucide React
- **Deployment & Hosting:** Vercel (Free Tier Ready)
- **CI/CD:** GitHub Actions workflow (`.github/workflows/ci-cd.yml`)

---

## 🛠️ Software QA Capabilities Featured

- **Automation Testing:** Playwright (Python / TypeScript), Cypress, Selenium Webdriver
- **API & Backend Testing:** Postman, REST Assured, Swagger/OpenAPI, Newman CLI
- **Performance & Load Testing:** Apache JMeter, K6
- **Test Management & Bug Tracking:** Jira, TestRail, Zephyr, ClickUp
- **Database Auditing:** SQL (PostgreSQL, MySQL) data integrity queries
- **CI/CD Integration:** GitHub Actions, Jenkins test execution pipelines

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Ensure you have Node.js (v18 or higher) and `npm` installed.

```bash
node -v
npm -v
```

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sabbir-qa-portfolio.git
   cd sabbir-qa-portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local dev server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:5173`) in your browser.

4. **Lint & Type Check:**
   ```bash
   npm run lint
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

6. **Preview Production Build locally:**
   ```bash
   npm run preview
   ```

---

## 🌐 Deploying to Vercel (Free)

This project is pre-configured with `vercel.json` and Vite build output (`dist`) for seamless, zero-config deployment on Vercel's free hobby tier.

### Option 1: Direct GitHub Integration (Recommended)

1. Push this repository to **GitHub**.
2. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
3. Click **"Add New"** > **"Project"**.
4. Import your portfolio repository.
5. Vercel will automatically detect **Vite** and configure the build settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Click **Deploy**. Your live portfolio URL will be generated immediately!

---

### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```

2. Deploy directly from your terminal:
   ```bash
   vercel
   ```

3. To deploy to production:
   ```bash
   vercel --prod
   ```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

A GitHub Actions workflow is included at `.github/workflows/ci-cd.yml`. It performs:
1. **Type Checking & Linting:** `npm run lint` (`tsc --noEmit`)
2. **Build Verification:** `npm run build`
3. **Automated Vercel Deployment:** Automatically triggers a production deployment to Vercel upon pushing to `main` or `master` branch.

### Setting up GitHub Actions Vercel Secrets

To enable automated CI/CD deployments through GitHub Actions:
1. Go to your GitHub Repository > **Settings** > **Secrets and variables** > **Actions**.
2. Add the following repository secrets:
   - `VERCEL_TOKEN`: Generated from [Vercel Account Tokens](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID`: Found in `.vercel/project.json` or Vercel Team settings
   - `VERCEL_PROJECT_ID`: Found in `.vercel/project.json` or Vercel Project settings

---

## 📂 Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions CI/CD pipeline script
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images and media assets
│   ├── components/         # React UI Components
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── SkillsGrid.tsx
│   │   ├── Projects.tsx
│   │   ├── ExperienceTimeline.tsx
│   │   ├── EducationCertifications.tsx
│   │   └── Footer.tsx
│   ├── App.tsx             # Main App layout & context
│   ├── data.ts             # Centralized portfolio data (experiences, projects, certs)
│   ├── main.tsx            # React entry point
│   └── index.css           # Global Tailwind CSS styles
├── vercel.json             # Vercel configuration file for single page application routing
├── package.json            # Project dependencies and build scripts
└── README.md               # Project documentation
```

---

## 👤 Contact & Author

**Sabbir Ahamed** — Software QA Engineer  
- 📍 **Location:** Gazipur / Tejgaon, Dhaka, Bangladesh  
- ✉️ **Email:** sabbir.altersense@gmail.com  
- 💼 **LinkedIn:** [linkedin.com/in/sabbirahamedqa](https://www.linkedin.com/in/sabbirahamedqa)  
- 🐙 **GitHub:** [github.com/Sabbirahamed-qa](https://github.com/Sabbirahamed-qa)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
