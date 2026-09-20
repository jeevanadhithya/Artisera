# Artisera Installation & Local Setup Guide

This guide provides reproducible, step-by-step instructions for installing, configuring, and running the entire Artisera ecosystem locally.

---

## 1. Prerequisites

Ensure your development environment meets the following requirements:

| Component | Required Version | Verification Command |
|---|---|---|
| **Node.js** | 20.x or higher | `node -v` |
| **npm** | 10.x or higher | `npm -v` |
| **Python** | 3.10 or 3.11 | `python --version` |
| **Flutter SDK** | 3.13.x or higher | `flutter --version` |
| **Git** | 2.x or higher | `git --version` |

---

## 2. Environment Configuration

1. Copy the root environment template into `Backend/.env`:
   ```bash
   cp .env.example Backend/.env
   ```
2. Open `Backend/.env` and update the values:
   - **`SUPABASE_URL`**: Your Supabase project URL (`https://<project-id>.supabase.co`).
   - **`SUPABASE_ANON_KEY`**: Your public client-safe anon key.
   - **`SUPABASE_SERVICE_ROLE_KEY`**: Your private server-side service role key.
   - **`GEMINI_API_KEY`**: API key from Google AI Studio.
   - **`SARVAM_API_KEY`**: API key from Sarvam AI for Indic STT/TTS (optional for basic testing; deterministic fallbacks exist).

> [!CAUTION]
> Never commit `Backend/.env` or expose the `SUPABASE_SERVICE_ROLE_KEY` in the mobile application.

---

## 3. Database & Supabase Migrations

Execute the migration scripts in sequential order using the **Supabase SQL Editor** or via PostgreSQL `psql`:

1. [`Backend/migrations/001_enhancement_features.sql`](file:///Backend/migrations/001_enhancement_features.sql): Core image variations and translation columns.
2. [`Backend/migrations/002_artisera_master_schema.sql`](file:///Backend/migrations/002_artisera_master_schema.sql): Master profiles, product scores, AI jobs, and B2B inquiries.
3. [`Backend/migrations/003_marketplace_exports.sql`](file:///Backend/migrations/003_marketplace_exports.sql): Canonical marketplace export schema and templates.
4. [`Backend/migrations/004_artisan_guide.sql`](file:///Backend/migrations/004_artisan_guide.sql): RAG vector knowledge base, task sessions, and step analytics.

Alternatively, execute migrations via TypeScript runners:
```bash
cd Backend
npm install
npm run migrate
```

---

## 4. Backend Service Setup (Node.js API Gateway)

1. Open a terminal and navigate to `Backend`:
   ```bash
   cd Backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the development server with hot-reload:
   ```bash
   npm run dev
   ```
4. Confirm successful startup:
   - Terminal should display: `Artisera API Node.js server running... Port: 8000`
   - Open your browser to `http://localhost:8000/` to view the **Live Diagnostics Dashboard**.
   - Test health endpoint: `http://localhost:8000/api/health`

---

## 5. AI Image Studio Setup (Python Microservice)

The AI Image Studio microservice runs BiRefNet-HR deep segmentation.

1. Open a second terminal and navigate to `AI_Models`:
   ```bash
   cd AI_Models
   ```
2. Create and activate a Python virtual environment:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI microservice:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8001 --reload
   ```
   *(Or run `python app.py` which defaults to port 8000. If port 8000 is used by Node.js, run on port 8001 and set `IMAGE_AI_URL=http://localhost:8001` in `Backend/.env`)*.

> [!NOTE]
> If running without an NVIDIA GPU, the service automatically switches to CPU Float32 execution at 768×768 resolution. If the Python service is not started, the Node.js backend seamlessly defaults to its built-in Sharp CLAHE pipeline.

---

## 6. Mobile Application Setup (Flutter)

1. Open a third terminal and navigate to `Mobile_App`:
   ```bash
   cd Mobile_App
   ```
2. Fetch Flutter packages:
   ```bash
   flutter pub get
   ```
3. Inspect connected devices:
   ```bash
   flutter devices
   ```
4. Launch the application:
   - **Chrome / Web Browser**:
     ```bash
     flutter run -d chrome
     ```
   - **Android Device / Emulator**:
     ```bash
     flutter run -d android
     ```
   - **Windows Desktop**:
     ```bash
     flutter run -d windows
     ```

---

## 7. Verifying End-to-End Operation

Follow this 2-minute verification checklist:
1. Open the Flutter app and select your preferred language (e.g. Hindi or English).
2. Tap **"Sign In"** or continue as Guest Artisan.
3. Tap **"Add Craft"** (`+` button).
4. Upload or capture a product photograph.
5. Tap **"Enhance Photo"** — observe studio backdrop transformation.
6. Record or type a short voice note describing the craft.
7. Tap **"Generate AI Catalog"** — verify bilingual title and structured specifications.
8. Review the **Product Score** (0-100) and calculated **Fair Living Wage Price**.
9. Tap **"Publish"** to list on the live marketplace feed.
