# Artisera API Reference

This document provides the complete, authoritative reference for the **Artisera Backend API Gateway** (Node.js / Express / TypeScript).

- **Base URL (Local)**: `http://localhost:8000/api`
- **Hosted Production URL**: `https://artisera-backend.vercel.app/api`
- **Authentication**: Bearer Token via Supabase Auth (`Authorization: Bearer <JWT>`)

---

## 1. Authentication & Security Policies

Endpoints enforce role-based access control through Express middleware:
- **Public**: No authentication required.
- **`requireAuth`**: Requires a valid Supabase JWT Bearer token in the `Authorization` header.
- **`requireArtisan`**: Requires `role === 'artisan'` in the user profile.
- **`requireBuyer`**: Requires `role === 'buyer'` in the user profile.
- **`requireAdmin`**: Requires `role === 'admin'` in the user profile.

---

## 2. Comprehensive Endpoint Matrix

### 2.1 Health & Diagnostics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Core health check returning status, database connectivity, and environment. |
| `GET` | `/api/health` | Public | Standard API health probe. |
| `GET` | `/` | Public | Live HTML dashboard displaying service pings (Supabase, Gemini, Sarvam, ML microservices). |

---

### 2.2 Product Management & Cataloging (`/api/products`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/products` | Optional / Auth | Creates a new draft product record. Generates unique UUID. |
| `GET` | `/api/products` | `requireAuth` | Lists all products belonging to the authenticated artisan. |
| `GET` | `/api/products/:product_id` | `requireAuth` | Fetches comprehensive product details, images, and translations. |
| `PUT` | `/api/products/:product_id` | `requireAuth`, `requireArtisan` | Updates product attributes (title, dimensions, materials, pricing). |
| `DELETE` | `/api/products/:product_id` | `requireAuth`, `requireArtisan` | Soft deletes / archives a product listing. |
| `POST` | `/api/products/:product_id/images` | `requireAuth`, `requireArtisan` | Uploads a raw product photo (multipart/form-data) to Supabase storage. |
| `GET` | `/api/products/:product_id/images` | `requireAuth` | Lists all image assets linked to the product. |
| `POST` | `/api/products/:product_id/enhance-image` | `requireAuth`, `requireArtisan` | Triggers AI studio enhancement on the uploaded photo. |
| `POST` | `/api/products/:product_id/images/:image_id/enhance` | `requireAuth`, `requireArtisan` | Enhances a specific secondary image. |
| `POST` | `/api/products/:product_id/images/:image_id/select` | `requireAuth`, `requireArtisan` | Sets a designated image as the hero/primary product photo. |
| `GET` | `/api/products/:product_id/enhanced-preview` | `requireAuth` | Retrieves comparative before/after preview URLs. |
| `POST` | `/api/products/:product_id/voice` | `requireAuth`, `requireArtisan` | Uploads audio recording, stores file, and invokes Sarvam STT transcription. |
| `POST` | `/api/products/:product_id/generate-catalog` | `requireAuth`, `requireArtisan` | Multimodal catalog generation combining image and voice via Gemini 2.5 Flash. |
| `POST` | `/api/products/:product_id/translate` | `requireAuth` | Translates product title and story into targeted Indic language. |
| `GET` | `/api/products/:product_id/translations` | `requireAuth` | Returns all available multilingual descriptions for the item. |
| `PUT` | `/api/products/:product_id/catalog` | `requireAuth`, `requireArtisan` | Saves edited catalog description after artisan review. |
| `GET` | `/api/products/:product_id/price` | `requireAuth` | Calculates fair-trade price floor and suggested retail bounds. |
| `POST` | `/api/products/:product_id/publish` | `requireAuth`, `requireArtisan` | Publishes reviewed craft to the public marketplace. |
| `PUT` | `/api/products/:product_id/unpublish` | `requireAuth`, `requireArtisan` | Reverts a published listing back to draft status. |
| `GET` | `/api/products/:product_id/score` | `requireAuth` | Evaluates 5-dimension catalog completeness & market readiness score (0-100). |
| `GET` | `/api/products/:product_id/compare` | `requireAuth` | Compares product pricing against indexed market listings. |
| `GET` | `/api/products/:product_id/trends` | `requireAuth` | Returns craft demand trends and seasonal buying indicators. |
| `GET` | `/api/products/:product_id/gem-package` | `requireAuth` | Prepares compliance metadata for Government e-Marketplace. |
| `POST` | `/api/products/:product_id/reel` | `requireAuth` | Generates short-form social video script & marketing asset record. |
| `GET` | `/api/products/:product_id/reel` | `requireAuth` | Retrieves status and media URL of generated marketing reel. |

---

### 2.3 Marketplace Export & Compliance (`/api/products/:id/export` & `/api/marketplaces`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/marketplaces` | `requireAuth` | Lists supported export channels (Amazon Karigar, GeM, ONDC, Flipkart, etc.). |
| `GET` | `/api/products/:id/export-options` | `requireAuth` | Returns readiness overview across all marketplace channels for a craft. |
| `GET` | `/api/products/:id/export/:marketplace/readiness` | `requireAuth` | Evaluates missing channel-specific fields and returns readiness percentage. |
| `POST` | `/api/products/:id/export/:marketplace/validate` | `requireAuth` | Validates product data against channel listing schema. |
| `GET` | `/api/products/:id/export/:marketplace/preview` | `requireAuth` | Returns mapped marketplace JSON before package generation. |
| `POST` | `/api/products/:id/export/:marketplace/generate` | `requireAuth` | Generates and downloads export package in `.xlsx`, `.csv`, `.pdf`, or `.json`. |

---

### 2.4 Unified AI & ML Services (`/api/ai`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ai/health` | Public | Reports AI engine capabilities, model versions, and latency. |
| `POST` | `/api/ai/image/enhance` | Public | Direct image enhancement (file upload or Base64). Uses CLAHE + Sharp. |
| `POST` | `/api/ai/pricing` | Public | Computes fair living wage pricing from material costs and artisan hours. |
| `POST` | `/api/ai/product-score` | Public | Instant 0-100 product readiness evaluation for arbitrary JSON payloads. |
| `POST` | `/api/ai/comparison` | Public | Compares craft price against benchmark handicraft listings. |
| `ALL` | `/api/ai/trends` | Public | Returns category demand velocity and festive trend spikes. |
| `ALL` | `/api/ai/opportunities` | Public | Returns active wholesale buyer sourcing leads. |
| `POST` | `/api/ai/catalog` | Public | Server-side Gemini multimodal catalog generation without client keys. |

---

### 2.5 Multilingual Artisan Copilot (`/api/copilot`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/copilot/chat` | Optional / Auth | Multilingual RAG-backed conversational assistant for schemes and marketing. |
| `GET` | `/api/copilot/session/:flowType` | `requireAuth` | Retrieves or initializes a guided task session (`pm_vishwakarma`, `mudra`, `pehchan`). |
| `POST` | `/api/copilot/step/complete` | `requireAuth` | Marks current guided step as complete, advancing the workflow. |
| `PUT` | `/api/copilot/language` | `requireAuth` | Sets the artisan's preferred assistant language (`hi`, `bn`, `te`, `ta`, `mr`, `kn`, `en`). |
| `POST` | `/api/copilot/transcribe` | Public | Audio speech-to-text using Sarvam AI Saaras:v3 model. |
| `POST` | `/api/copilot/synthesize` | Public | Text-to-speech audio synthesis using Sarvam AI Mayura:v1 model. |
| `GET` | `/api/copilot/knowledge` | Public | Semantic search over verified government schemes and market rules. |
| `POST` | `/api/copilot/feedback` | Optional / Auth | Submits helpfulness rating (thumbs up/down) on copilot responses. |
| `POST` | `/api/copilot/confirm-action` | `requireAuth` | Executes an artisan-confirmed sensitive action (e.g. price overwrite). |

---

### 2.6 Public Marketplace & Lead Discovery (`/api/market`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/market/products` | Public | Public catalog feed with search, category filtering, and pagination. |
| `GET` | `/api/market/categories` | Public | Returns list of popular handicraft categories and active counts. |
| `GET` | `/api/market/opportunities/me` | `requireAuth` | Fetches wholesale buyer demand signals matching authenticated artisan. |
| `GET` | `/api/market/opportunities/:artisan_id` | `requireAuth` | Fetches matched buyer opportunities for specific artisan profile. |

---

### 2.7 B2B Buyer Sourcing & Matchmaking (`/api/buyers` & `/api/matching`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/buyers/requests` | `requireAuth`, `requireBuyer` | Posts a new B2B bulk request for proposal (RFP). |
| `GET` | `/api/buyers/requests` | `requireAuth` | Lists active buyer requests. |
| `GET` | `/api/buyers/requests/:id` | `requireAuth` | Retrieves specific buyer requirement details. |
| `PUT` | `/api/buyers/requests/:id` | `requireAuth`, `requireBuyer` | Updates buyer request quantity, budget, or specifications. |
| `POST` | `/api/matching/:request_id` | `requireAuth` | Executes 5-factor weighted algorithm matching artisans to the request. |

---

### 2.8 Inquiries & Quotations (`/api/inquiries`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/inquiries` | `requireAuth` | Buyer initiates an inquiry / quotation request for a specific product. |
| `GET` | `/api/inquiries/artisan/me` | `requireAuth`, `requireArtisan` | Lists all RFPs received by the logged-in artisan. |
| `GET` | `/api/inquiries/buyer/me` | `requireAuth` | Lists inquiries submitted by the logged-in buyer. |
| `POST` | `/api/inquiries/:id/proposal` | `requireAuth`, `requireArtisan` | Artisan submits formal wholesale quotation with price and lead time. |

---

### 2.9 User Profiles & Admin Oversight (`/api/profile` & `/api/admin`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/profile/me` | `requireAuth` | Returns complete user profile including craft guild and language. |
| `PUT` | `/api/profile/me` | `requireAuth` | Updates user details, avatar, craft story, and experience years. |
| `POST` | `/api/profile/verify` | `requireAuth` | Submits government ID / Pehchan card for verified artisan badge. |
| `GET` | `/api/admin/dashboard` | `requireAuth`, `requireAdmin` | Aggregated analytics: total artisans, active listings, GMV, match rate. |
| `GET` | `/api/admin/artisans` | `requireAuth`, `requireAdmin` | Platform-wide artisan directory management. |
| `GET` | `/api/admin/products` | `requireAuth`, `requireAdmin` | Moderation queue for published products. |

---

## 3. Sample Requests & Responses

### 3.1 Calculate Living Wage Fair Price (`POST /api/ai/pricing`)
**Request**:
```json
{
  "title": "Chanderi Silk Handloom Saree",
  "category": "Textiles",
  "material": "Pure Mulberry Silk and Zari",
  "region": "Madhya Pradesh",
  "craftComplexity": "high",
  "isGiTagged": true,
  "costInputs": {
    "materialCost": 1200,
    "hoursWorked": 32,
    "hourlyWage": 150,
    "packagingCost": 120
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recommendedPrice": 7450,
    "minimumFairPrice": 6120,
    "wholesalePrice": 6400,
    "exportPrice": 9200,
    "breakdown": {
      "rawMaterials": 1200,
      "laborValue": 4800,
      "overheadAndPackaging": 120,
      "baseCostFloor": 6120,
      "giPremiumAmount": 600,
      "fairMarginAmount": 730
    },
    "explanation": "Calculated using 32 artisan labor hours at ₹150/hr living wage standard, including 10% GI-tag heritage premium."
  }
}
```

### 3.2 Multilingual Catalog Generation (`POST /api/ai/catalog`)
**Request**:
```json
{
  "voice_transcript": "यह शुद्ध टेराकोटा मिट्टी का बना दीपक है जिसे हमने कुम्हार चक्र पर हाथ से ढाला है।",
  "image_base64": "data:image/jpeg;base64,...",
  "existing_category": "Pottery"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "product_title": "Handcrafted Terracotta Diya with Natural Clay Finish",
    "title_hi": "हस्तनिर्मित प्राकृतिक टेराकोटा मिट्टी का दीपक",
    "category": "Pottery",
    "visible_material": "Natural Clay",
    "description": "Authentic artisan diya handcrafted on traditional potter wheels using eco-friendly natural terracotta clay. Meticulously shaped and kiln-fired for festive occasions.",
    "description_hi": "पारंपरिक कुम्हार के चाक पर पर्यावरण-अनुकूल प्राकृतिक मिट्टी से हस्तनिर्मित सुंदर टेराकोटा दीपक।",
    "tags": ["Handmade", "Terracotta", "Eco-Friendly", "Traditional Pottery", "Festive Decor"],
    "regional_descriptions": {
      "ta": "பாரம்பரிய முறையில் களிமண்ணால் செய்யப்பட்ட அழகான அகல் விளக்கு.",
      "bn": "হাতে তৈরি পরিবেশ-বান্ধব ঐতিহ্যবাহী মাটির প্রদীপ।"
    }
  }
}
```
