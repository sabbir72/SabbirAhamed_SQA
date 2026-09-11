# Contributing Guidelines

Thank you for your interest in contributing to the **Sabbir Ahamed SQA Portfolio** project!

---

## 📜 Development Standards & Code Quality

To maintain production standards, please follow these guidelines when submitting Pull Requests:

### 1. Code Formatting & Style
- Follow strict TypeScript typing. Avoid `any` types where possible.
- Use explicit component function return types (`JSX.Element`).
- Ensure all source code files include standard JSDoc header comments:
  ```ts
  /**
   * -----------------------------------------
   * Project     : Sabbir Ahamed SQA Portfolio
   * Module      : <Module Name>
   * Description : <Brief Description>
   * Author      : Sabbir Ahamed
   * -----------------------------------------
   */
  ```

### 2. Commit Message Guidelines
Use Conventional Commits format:
- `feat:` New user-facing feature or SQA project entry
- `fix:` Bug fix or path resolution fix
- `docs:` Documentation updates (`README.md`, `INSTALL.md`, etc.)
- `style:` UI styling adjustments or Tailwind CSS tweaks
- `refactor:` Code improvements without functionality changes
- `ci:` Pipeline changes (`ci-cd.yml`, `render.yaml`)

### 3. Pull Request Workflow
1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Run lint and build verification locally:
   ```bash
   npm run lint
   npm run build
   ```
3. Ensure no compiler or linting errors remain.
4. Commit your changes and open a Pull Request against `main`.
