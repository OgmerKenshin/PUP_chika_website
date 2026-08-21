# 🤖 AI Assistant Instructions & Project Guide (`AGENTS.md`)

> **Note for AI Assistants**: Read this file at the start of every session. It defines the project context, technical architecture, directory structure, and your operational guidelines when working on this codebase.

---

## 📌 1. Project Overview & Mission

**PUP Chika** is a modern, student-focused web discussion board and community platform tailored for Polytechnic University of the Philippines (PUP) students.

- **Frontend**: Lightweight, responsive Vanilla HTML5, CSS3 (Glassmorphism design aesthetic), and Vanilla JavaScript (SPA architecture).
- **Backend**: Java Spring Boot microservice/service (`account-service`) handling user authentication, session security, account management, and database persistence.
- **Database**: 
  - **Production/Local Dev**: Oracle SQL Database (configured via `application.yaml`).
  - **Testing**: In-memory H2 Database for fast, zero-dependency unit and integration testing.

---

## 🎯 2. Your Job as the AI Assistant

When working on this repository, your responsibilities include:
1. **Context Alignment**: Always inspect relevant backend/frontend files before suggesting or executing code modifications.
2. **Preserve Architectural Patterns**:
   - Keep the frontend dependency-free (Vanilla JS/CSS) unless the user explicitly requests a framework/library.
   - Maintain Spring Boot best practices (Controller -> Service -> Repository layers, DTO pattern, proper exception handling).
3. **Database & Credential Safety**:
   - Never hardcode or commit database credentials.
   - Respect `.gitignore` rules (e.g., `application.yaml` credentials vs `application.yaml.example`).
4. **Code Quality & Reliability**:
   - Run or verify tests with `mvnw test` when making backend changes.
   - Maintain UI responsiveness and clean glassmorphic styling conventions.
5. **Clear Communication**:
   - Provide concise, actionable explanations.
   - Present code diffs or well-commented code snippets.

---

## 📂 3. Repository Directory Structure

```text
├── PUP_chika_website/
│   ├── account-service/                  # Spring Boot Backend Project
│   │   └── account-service/
│   │       ├── src/
│   │       │   ├── main/
│   │       │   │   ├── java/...          # Controllers, Services, Entities, Repositories, Config
│   │       │   │   └── resources/
│   │       │   │       ├── application.yaml.example  # Template DB config
│   │       │   │       └── application.yaml          # Local DB credentials (gitignored)
│   │       │   └── test/                 # Unit & Integration Tests (H2 DB)
│   │       ├── mvnw / mvnw.cmd           # Maven wrapper scripts
│   │       └── pom.xml                   # Maven dependencies
│   ├── public/                           # Frontend Single-Page App
│   │   ├── index.html                    # Main HTML entry point & modals
│   │   ├── script.js                     # Client logic, API integrations, state handling
│   │   └── style.css                     # Glassmorphism styling & animations
│   └── README.md                         # Project documentation
├── pending_features/                     # Implementation roadmaps & specs
│   ├── manual_verification_flow.md       # Student ID upload & admin approval spec
│   └── resend_and_forgot_password.md     # Password recovery feature spec
├── schedule.py                           # Schedule parsing & utility script
├── BSCPE_3-7_Weekly_Schedule.xlsx        # Reference schedule data
├── PUPchicka.sql                         # Database schema & setup scripts
└── AGENTS.md                             # (This file) AI Session Guide & Rules
```

---

## 🛠️ 4. Tech Stack & Environment Reference

| Component | Technology / Tool | Key Details |
| :--- | :--- | :--- |
| **Backend Framework** | Java 17/21 + Spring Boot 3.x | REST API, Spring Security, Spring Data JPA |
| **Build Tool** | Maven (`mvnw` wrapper) | Use `.\mvnw.cmd` on Windows PowerShell |
| **Primary Database** | Oracle SQL | Handled by `DatabaseSeeder` on boot |
| **Test Database** | In-Memory H2 | Automatic fallback during `mvnw test` |
| **Frontend** | HTML5, CSS3, ES6+ JavaScript | Glassmorphism, Fetch API to `http://localhost:8080` |
| **Default Accounts** | Seeded automatically | `admin@example.com` (ADMIN), `adrian@example.com` (USER) |

---

## ⚡ 5. Common Commands for AI Workflows

### Run Backend
```powershell
# In PUP_chika_website/account-service/account-service
.\mvnw.cmd spring-boot:run
```

### Run Tests
```powershell
# In PUP_chika_website/account-service/account-service
.\mvnw.cmd test
```

### Serve Frontend
- Open `PUP_chika_website/public` with VS Code **Live Server** or any static file server on port 5500 / 3000.

---

## 🚧 6. Current Roadmap & Pending Features

When tasked with feature development, check `pending_features/` for detailed blueprints:
1. **Manual Verification & ID Proof Upload** (`pending_features/manual_verification_flow.md`):
   - Adding student number and proof upload (COR/ID) to registration.
   - `PENDING_REVIEW` account status and Admin approval workflow.
2. **Forgot Password & OTP/Resend Logic** (`pending_features/resend_and_forgot_password.md`):
   - Email verification codes and password reset endpoints.
3. **Admin Dashboard**:
   - User moderation, verification approvals, and post management.

---

## 📋 7. AI Session Startup Checklist

At the beginning of any session or when receiving a new task:
- [ ] Review user prompt against `AGENTS.md` guidelines.
- [ ] Check if the task involves backend, frontend, or database changes.
- [ ] Inspect existing implementations in `account-service` or `public/` before editing.
- [ ] Keep changes modular, well-documented, and aligned with existing code conventions.
