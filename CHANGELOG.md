# Changelog

All notable changes to the **Sabbir Ahamed SQA Portfolio** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-29

### Added
- **Full-Stack Express + Vite Integration**: Backend server running on Node.js / Express with TypeScript support.
- **Brevo REST API Integration**: Server-side `/api/contact` endpoint for transactional contact email delivery.
- **ATS Resume Builder Modal**: Interactive resume compiler supporting 5 professional ATS-friendly templates with instant A4 PDF export via `html2pdf.js`.
- **AI Cover Letter Generator Modal**: AI-powered cover letter generator featuring job description match score analysis and PDF download.
- **Interactive Test Runner & Bug Tracker**: Real-time interactive components demonstrating SQA test case assertions, execution logs, and defect lifecycle tracking.
- **Render & Vercel Blueprints**: Included `render.yaml` and `vercel.json` for multi-platform deployment compatibility.
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci-cd.yml`) for pull request checks and automated deployments.
- **Comprehensive Documentation**: Complete `INSTALL.md`, `DEPLOYMENT.md`, `CONTRIBUTING.md`, and environment configuration templates (`.env.example`, `.env.local`, `.env.production`).

### Refactored
- Added standardized JSDoc file headers, component documentation, and business logic inline comments across all source files.
- Optimized package build dependencies (`esbuild`, `vite`, `typescript`) for seamless server bundling on Render and Vercel.
- Enforced strict TypeScript type safety (`tsc --noEmit`).
