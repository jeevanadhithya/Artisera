# Artisera Backend API

AI-Driven Market Linkage and Smart Cataloging Mobile Application Backend for Marginalized Artisans.

## 1. Project Overview

Artisera is an MVP backend designed using Python 3.11+, FastAPI, Pydantic v2, and Supabase. The goal is to provide a central API layer that interfaces a mobile application (Flutter) with database tables, private AI models (Qwen3-VL on AWS, Gemini fallback), pricing engines, and buyer matching algorithms.

This backend serves as the central orchestration hub, preventing the Flutter app from directly communicating with database systems or private API keys.

---

## 2. Architecture

```
Flutter (Mobile App)
   │
   │ HTTPS / JSON
   ▼
FastAPI (Central Monolithic Backend on Vercel)
   │
   ├─► Supabase Auth (JWT token validation)
   ├─► Supabase Storage (product images, audio files)
   ├─► Supabase PostgreSQL (artisan, buyer, product data)
   ├─► Speech Service (Speech-To-Text / Transcription)
   ├─► Pricing Engine (deterministic, rule-based)
   ├─► Buyer Matching Engine (weighted, deterministic scoring)
   │
   └─► AI Service (Multimodal Catalog Generator)
         ├─► Primary: Qwen3-VL via vLLM on AWS EC2 GPU (A10G)
         └─► Fallback: Google Gemini API (gemini-1.5-flash)
```

---

## 3. Folder Structure

```
backend/
├── api/
│   └── index.py            # Vercel entry point
├── app/
│   ├── __init__.py
│   ├── main.py             # App initialization and routing
│   ├── core/
│   │   ├── config.py       # Pydantic Settings
│   │   ├── security.py     # Auth dependencies and Role Guards
│   │   └── exceptions.py   # Global Exception handlers
│   ├── routes/
│   │   ├── health.py
│   │   ├── artisans.py
│   │   ├── products.py
│   │   ├── ai.py
│   │   ├── pricing.py
│   │   ├── market.py
│   │   ├── buyers.py
│   │   ├── matching.py
│   │   └── admin.py
│   ├── schemas/
│   │   ├── artisan.py
│   │   ├── product.py
│   │   ├── catalog.py
│   │   ├── buyer.py
│   │   ├── pricing.py
│   │   ├── market.py
│   │   └── matching.py
│   ├── services/
│   │   ├── supabase_service.py # Central DB queries
│   │   ├── storage_service.py  # Supabase Storage operations
│   │   ├── llm_service.py      # Vision-LLM integration (Qwen + Gemini)
│   │   ├── speech_service.py   # Speech-to-text
│   │   ├── image_service.py    # Multi-part image/audio validation
│   │   ├── pricing_service.py  # Pricing math engine
│   │   ├── market_service.py   # Opportunities generator
│   │   └── matching_service.py # Core matching algorithms
│   └── utils/
│       ├── validators.py
│       └── helpers.py
├── tests/
│   ├── conftest.py
│   ├── test_health.py
│   ├── test_products.py
│   ├── test_catalog.py
│   ├── test_pricing.py
│   ├── test_market.py
│   ├── test_buyers.py
│   ├── test_matching.py
│   └── test_admin.py
├── requirements.txt
├── .env.example
├── vercel.json
├── README.md
└── .gitignore
```

---

## 4. Environment Variables

Create a `.env` file in the root directory following `.env.example`:

| Variable | Description | Example / Default |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | PRIVATE role key. **NEVER expose to clients.** | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | Client-safe public anonymous key. | `eyJhbGci...` |
| `LLM_PROVIDER` | Preferred LLM backend. | `qwen` or `gemini` |
| `VLLM_BASE_URL` | vLLM endpoint URL on AWS. | `http://aws-gpu-ip:8000` |
| `VLLM_API_KEY` | Auth key for vLLM (optional). | `bearer_token_here` |
| `GEMINI_API_KEY` | API Key for Google AI Studio. | `AIzaSy...` |
| `CORS_ORIGINS` | Permitted origins for CORS. | `http://localhost:3000` |
| `ENVIRONMENT` | Deployment environment. | `development` or `production` |

---

## 5. Supabase Setup

For the MVP backend to run, ensure that your Supabase database contains the following tables (matching the schema structure expected by `supabase_service.py`):

1. **artisans**:
   - `id` (UUID, primary key)
   - `user_id` (UUID, linked to auth.users)
   - `name` (text)
   - `language` (text)
   - `state` (text)
   - `district` (text)
   - `location` (text, optional)
   - `craft_type` (text)
   - `cluster_id` (text, optional)
   - `profile_image` (text, optional)
   - `created_at` / `updated_at` (timestamp)

2. **products**:
   - `id` (UUID, primary key)
   - `artisan_id` (UUID, references artisans.id)
   - `name` (text)
   - `category` (text)
   - `material` (text)
   - `craft_type` (text)
   - `region` (text)
   - `price` / `minimum_price` / `maximum_price` (numeric)
   - `description_en` / `description_hi` (text)
   - `keywords` (text[])
   - `status` (text: draft, review, published, archived)
   - `image_url` (text)
   - `voice_transcript` (text)
   - `ai_generated` (boolean)
   - `ai_confidence` (numeric)
   - `created_at` / `updated_at` (timestamp)

3. **buyer_requests**:
   - `id` (UUID, primary key)
   - `buyer_id` (UUID)
   - `product_category` (text)
   - `description` (text)
   - `quantity` (integer)
   - `budget_per_unit` (numeric)
   - `location` (text)
   - `deadline` (date)
   - `status` (text: open, matching, fulfilled, cancelled)
   - `created_at` / `updated_at` (timestamp)

4. **market_opportunities**:
   - `id` (UUID, primary key)
   - `artisan_id` (UUID)
   - `product` (text)
   - `demand` (text)
   - `demand_score` (integer)
   - `suggested_quantity` (integer)
   - `price_range` (jsonb/json)
   - `potential_buyers` (integer)
   - `reason` (text)
   - `created_at` (timestamp)

5. **matching_results**:
   - `id` (UUID, primary key)
   - `request_id` (UUID)
   - `matches` (jsonb/json)
   - `created_at` (timestamp)

---

## 6. Local Setup

Create virtual environment:
```bash
python -m venv .venv
```

Activate the environment:
- **Windows**: `.venv\Scripts\activate`
- **Mac/Linux**: `source .venv/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

---

## 7. Running FastAPI

Start the local uvicorn hot-reloading development server:
```bash
uvicorn app.main:app --reload --port 8000
```

---

## 8. API Documentation

Interactive Swagger UI docs are automatically available at:
- **Local Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Local ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 8.1 Authentication & Testing (Swagger)

All endpoints (except `/health` and the public marketplace) require a Supabase JWT.
The Swagger "**Authorize**" button is for *testing protected APIs only* — it is **not**
your app's login system.

### How to authenticate in Swagger

1. Open `http://localhost:8000/docs`.
2. Click **Authorize** (top-right).
3. Enter a token and click **Authorize**:
   - **Development quick test** — type exactly: `test-token`
     → gives you an artisan (`role=artisan`, `user_id=11111111-...`) so you can
     try product/image/voice/price endpoints immediately.
   - **Real user** — you need a valid Supabase access token. Get one by signing in
     through the frontend (Google OAuth or email/password) and copying the
     `token` you store in the browser under `artisera.session`, then paste it.
     (The API reads `Authorization: Bearer <token>` and validates it against
     `GET {SUPABASE_URL}/auth/v1/user`.)
4. Click **Authorize** — now authenticated endpoints show a padlock 🔓.

> The frontend never uses the Authorize button; it attaches `Bearer <token>`
> automatically from the current session.

### One-click AI feature tests (dev-only)
To try **image enhancement** and **voice-to-text** without creating a product first,
use the **Dev & Testing** group (registered only when `ENVIRONMENT != production`):

| Endpoint | What it does |
|---|---|
| `GET  /api/dev/status` | Shows if Sarvam is configured and your auth role |
| `POST /api/dev/voice-to-text` | Upload an audio file → returns Sarvam transcript + language |
| `POST /api/dev/enhance-image` | Upload an image → returns an enhanced JPEG preview |

### Full product flow (test the real endpoints)
1. `POST /api/products` → get a product `id` (an artisan profile is auto-created
   if missing, matching `GET /api/artisans/me` — no manual profile setup needed).
2. `POST /api/products/{id}/image` → upload the original photo.
3. `POST /api/products/{id}/enhance-image` → enhance it.
4. `POST /api/products/{id}/voice` → upload a voice note (Sarvam transcribes it).
5. `POST /api/products/{id}/generate-catalog` → AI generates `description_en` + `description_hi`.
6. `PUT  /api/products/{id}/catalog` → review/edit, then `POST /api/products/{id}/publish`.

---

## 9. AI Architecture & Fallback

- **Catalog Generation Workflow**:
  - Image is uploaded to Storage -> voice is uploaded and transcribed using the configured Speech-to-Text service -> `/api/products/{id}/generate-catalog` is called -> Multimodal LLM parses the image + voice script -> validates it via Pydantic (`AICatalogOutput`) -> stores fields in Database -> status becomes `review`.
- **Primary AI Provider (Qwen3-VL)**:
  - Communicates over HTTPS to a vLLM server running on an AWS EC2 `G5.xlarge` instance (NVIDIA A10G).
- **Fallback AI Provider (Google Gemini)**:
  - If Qwen is down, unconfigured, or returns an error, the system automatically falls back to Google's `gemini-1.5-flash` model, ensuring robust operational continuity.

---

## 10. Core Algorithms

### Deterministic Pricing Engine
Determines optimal prices by computing material + labor + production costs, applying category-specific markup (e.g. 40% for textiles, 45% for pottery), and adjusting based on demand signals (0-100 score). The calculation is completely rule-based and transparent.

### Matching Engine
Scores artisans against a buyer's bulk requirement request using a deterministic weighted scoring system:
- **Product Compatibility** (40%): Overlap between buyer request and artisan craft/product history.
- **Production Capacity** (20%): Derived from historical production stats.
- **Price Compatibility** (20%): Ensuring budget bounds match.
- **Location Proximity** (10%): Regional proximity checks.
- **Availability** (10%): Operational availability signals.

---

## 11. Security Notes

- **JWT Validation**: Authenticates Supabase-issued Bearer tokens at the API gateway layer using role metadata (artisan, buyer, admin).
- **Role-Based Guards**: Restricts endpoint access strictly based on identity rules (e.g., only artisans can modify their products; only admins can access analytics dashboard).
- **Data Protection**: Database endpoints, model access, and API credentials are kept private to protect internal systems.
