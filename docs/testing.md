# Artisera Testing & Quality Assurance

This document details the quality assurance status, static analysis, verification commands, and testing roadmap for the Artisera codebase.

---

## 1. Testing Philosophy & Honesty Declaration

In accordance with rigorous hackathon and engineering evaluation standards:
- **Implemented & Executed**: TypeScript strict compilation, static code analysis (`flutter_lints`), and manual end-to-end API integration verification.
- **In Progress / Planned**: Automated unit testing suites (`flutter test`, Jest/Supertest) and CI/CD automated test runners.

---

## 2. Static Analysis & Build Verification

### 2.1 Backend TypeScript Compilation
The Node.js/Express backend uses TypeScript 5.8 with strict type checking.

```bash
cd Backend
npm run build
```
- **Execution Result**: **PASS** (Exit code: `0`).
- Validates type safety across all route controllers, middleware, pricing algorithms, marketplace export adapters, and Supabase service clients.

### 2.2 Flutter Mobile Analysis
The Flutter mobile application enforces `flutter_lints` rules defined in `Mobile_App/analysis_options.yaml`.

```bash
cd Mobile_App
flutter analyze
```
- **Execution Result**: **PASS** (`No issues found!`). Exit code: `0`.
- Validates widget construction, null safety compliance, and Dart code conventions across all 71 Dart source files.

---

## 3. Evaluator Manual Verification Suite

To verify system functionality without running automated test runners, follow these direct curl / browser commands:

### Test 1: API Gateway & Service Diagnostics
```bash
curl -s http://localhost:8000/api/health
```
**Expected Response**:
```json
{
  "status": "ok",
  "service": "artisera-backend",
  "version": "1.0.0",
  "timestamp": "..."
}
```

### Test 2: Living Wage Pricing Engine
```bash
curl -X POST http://localhost:8000/api/ai/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Dokra Brass Figurine",
    "category": "Metal",
    "material": "Recycled Brass & Clay Core",
    "craftComplexity": "high",
    "costInputs": {
      "materialCost": 450,
      "hoursWorked": 12,
      "hourlyWage": 120,
      "packagingCost": 80
    }
  }'
```
**Verification Points**:
- Confirms `recommendedPrice` strictly exceeds total cost floor ($450 + 12 \times 120 + 80 = ₹1,970$).
- Confirms mathematical margin and living wage breakdown returned in JSON.

### Test 3: Product Readiness Scoring
```bash
curl -X POST http://localhost:8000/api/ai/product-score \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Handmade Blue Pottery Vase",
    "category": "Pottery",
    "description": "Traditional Jaipur blue pottery vase glazed with natural quartz.",
    "price": 1850,
    "images": ["https://example.com/craft.jpg"],
    "keywords": ["Jaipur", "Blue Pottery", "Ceramic"]
  }'
```
**Verification Points**:
- Confirms overall score is bounded between 0 and 100.
- Confirms score breakdown across the 5 dimensions.

### Test 4: Multilingual Catalog Synthesis
```bash
curl -X POST http://localhost:8000/api/ai/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "voice_transcript": "यह हाथ से बुनी हुई पट्टू शॉल है जिसमें प्राकृतिक ऊन का उपयोग किया गया है।",
    "existing_category": "Textiles"
  }'
```
**Verification Points**:
- Confirms generated `title_en` and `title_hi`.
- Confirms presence of regional translations (`ta`, `te`, `bn`, `mr`, `kn`).

### Test 5: Marketplace Export Package Generation
```bash
curl -s http://localhost:8000/api/marketplaces
```
**Verification Points**:
- Confirms metadata for Amazon, GeM, ONDC, Flipkart, and Meesho channels.

---

## 4. Testing Roadmap

| Test Category | Target Framework | Scope | Current Status |
|---|---|---|---|
| **TypeScript Compilation** | `tsc` | 100% of backend codebase | **Passing (Verified)** |
| **Dart Static Analysis** | `flutter analyze` | All 22 mobile screens and services | **Passing (Verified)** |
| **Pricing Engine Unit Tests** | Jest | Mathematical edge cases & GI premiums | *Planned* |
| **Marketplace Export Tests** | Jest | Schema field parity for Amazon, GeM, ONDC | *Planned* |
| **Widget UI Tests** | `flutter_test` | Language selector & Draft lifecycle | *Planned* |
| **CI/CD Pipeline** | GitHub Actions | Automated build and lint checks | *Planned* |
