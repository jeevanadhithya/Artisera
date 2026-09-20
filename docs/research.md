# Research, Background & Domain Analysis

This document synthesizes the problem statement research, official policy foundations, market dynamics, and competitive benchmarking that informed the design and implementation of **Artisera**.

---

## 1. Smart India Hackathon 2026 Context

- **Problem Statement ID**: PS-26090
- **Problem Statement Title**: *AI-Driven Market Linkage and Smart Cataloging Mobile Application for Marginalized Artisans*
- **Theme**: Heritage & Culture / Inclusive Digital Commerce
- **Category**: Software
- **Target Beneficiaries**: Traditional craftspeople, rural weavers, tribal artisans, and micro-enterprises across Indian handicraft clusters.

---

## 2. Sectoral Reality & The Problem Gap

According to reports from the **Ministry of Textiles** and the **Office of Development Commissioner (Handicrafts)**:
1. **Economic Scope**: India is home to over 7 million craftspeople who sustain centuries-old indigenous techniques (e.g. Chanderi weaving, Dokra casting, Blue Pottery, Madhubani painting).
2. **Intermediary Leakage**: In conventional supply chains involving multiple aggregators and regional distributors, artisans capture as little as **15% to 25%** of the ultimate retail selling price.
3. **The Digital Onboarding Chasm**:
   - Modern e-commerce platforms (Amazon, Flipkart, Etsy) require studio-grade lighting, white backgrounds, high-resolution product photography, and fluent English SEO copywriting.
   - Traditional artisans predominantly operate using entry-level smartphones with limited storage and intermittent 2G/3G connectivity.
   - Rural artisans communicate in regional dialects and lack English typing proficiency, creating an insurmountable administrative barrier.
4. **Fair Pricing Information Asymmetry**:
   - Artisans frequently sell goods based solely on urgent cash-flow needs rather than calculated cost floors.
   - Labor hours (often 20–80 hours per piece) are routinely undervalued or omitted from pricing calculations.

---

## 3. Government Policy & Institutional Integration

Artisera incorporates verified programmatic knowledge from official Government of India schemes:

| Scheme / Platform | Administering Body | Platform Integration in Artisera |
|---|---|---|
| **PM Vishwakarma Scheme** | Ministry of MSME | 4-step eligibility check, skill verification, ₹15,000 toolkit voucher assistance, and subsidized loan guidance via the Multilingual Copilot. |
| **Pradhan Mantri MUDRA Yojana** | Ministry of Finance | Guidance on Shishu (up to ₹50,000) and Kishore (up to ₹5,00,000) micro-credit applications without collateral. |
| **Pehchan ID Card** | DC (Handicrafts) | In-app verification workflow to digitize and validate the National Artisan Identification Card. |
| **GeM (Government e-Marketplace)** | Ministry of Commerce | Canonical schema mapping and one-tap generation of official GeM listing dossiers (`.pdf`, `.xlsx`). |
| **ONDC** | DPIIT | Export generation of Beckn-compliant JSON payloads for Open Network for Digital Commerce catalog integration. |

---

## 4. Competitor & Peer Benchmark Analysis

To establish best practices for hackathon and open-source documentation, several contemporary SIH solutions were studied:

| Project | Core Stack | Key Documentation Patterns | Artisera System Differentiation |
|---|---|---|---|
| **KalaSetu** | Flutter, FastAPI, Groq, Drift | Strong offline-first SQLite sync; dual-layer pricing; high-converting bilingual copy. | Artisera expands beyond cataloging into **5-factor B2B buyer matching**, **interactive step-by-step Copilot task flows**, and **GeM/ONDC/Amazon multi-marketplace export packaging**. |
| **KalaMitra** | Next.js, Supabase, AI Auctions | Web-first marketplace; community bidding and seller analytics. | Artisera prioritizes a **mobile-first native Flutter workflow** engineered specifically for low-literacy artisans with **voice-first speech input**. |
| **Kalakriti** | Next.js, FastAPI, U²-Net | Multimodal onboarding with ONDC publishing focus. | Artisera delivers a **dual-tier image studio** (BiRefNet-HR GPU microservice + Node.js Sharp fallback) and an **explainable 5-dimension product readiness score**. |

---

## 5. References & Official Sources

1. **Smart India Hackathon 2026**: [Official SIH Portal](https://sih.gov.in)
2. **PM Vishwakarma Portal**: [https://pmvishwakarma.gov.in](https://pmvishwakarma.gov.in)
3. **Office of the Development Commissioner (Handicrafts)**: [https://handicrafts.nic.in](https://handicrafts.nic.in)
4. **GeM Seller Onboarding Manual**: [https://assets-bg.gem.gov.in/resources/pdf/seller-user-manual.pdf](https://assets-bg.gem.gov.in/resources/pdf/seller-user-manual.pdf)
5. **ONDC Developer Resources**: [https://www.ondc.org/pages/resources-tech.html](https://www.ondc.org/pages/resources-tech.html)
6. **BiRefNet Research Paper & Hugging Face**: *Bilateral Reference Network for High-Resolution Dichotomous Image Segmentation* (`ZhengPeng7/BiRefNet_HR`)
7. **Sarvam AI Indic Foundation Models**: [https://sarvam.ai](https://sarvam.ai)
