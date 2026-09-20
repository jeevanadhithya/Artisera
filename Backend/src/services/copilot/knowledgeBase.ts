export interface KnowledgeDocument {
  id: string;
  title: string;
  category: 'photography' | 'catalog' | 'pricing' | 'packaging' | 'marketing' | 'platform_help' | 'marketplace' | 'govt_schemes';
  subcategory?: string;
  platform?: 'amazon' | 'flipkart' | 'meesho' | 'gem' | 'ondc' | 'artisera';
  topic: string;
  language: string;
  region?: string;
  sourceUrl: string;
  documentVersion: string;
  publicationDate: string;
  lastVerifiedDate: string;
  content: string;
  tags: string[];
  keyTakeaways: string[];
  officialActionUrl?: string;
}

export const VERIFIED_KNOWLEDGE_BASE: KnowledgeDocument[] = [
  // ─── 1. Product Photography ───────────────────────────────────────────────
  {
    id: 'photo_lighting_01',
    title: 'Natural Lighting and Studio Setup for Handicrafts',
    category: 'photography',
    topic: 'Product Photography Lighting & Background',
    language: 'en',
    sourceUrl: 'https://artisera.in/handbook/artisan-photography-guide-v2',
    documentVersion: '2.4',
    publicationDate: '2025-08-10',
    lastVerifiedDate: '2026-08-15',
    content: `For handcrafted goods (pottery, brassware, woodcraft, and handloom textiles):
1. Diffused Natural Daylight: Shoot between 7:30 AM – 10:00 AM or 3:30 PM – 5:30 PM near a north- or east-facing window. Never shoot under direct harsh noon sunlight or single yellow tungsten bulbs, which cause unnatural color cast and glare.
2. Background: Use a plain, untextured off-white, light beige, or matte grey sheet or muslin cloth. Avoid busy tiled floors, printed bedsheets, or high-gloss plastic sheets that distract from craft textures.
3. Angles Required for E-commerce:
   - Front 0° eye-level hero shot
   - 45° perspective angle revealing depth and volume
   - Top-down 90° view showing mouth, rim, or flat craftwork
   - Macro close-up (10–15 cm) showing handmade texture, brushwork, weave, or GI accreditation mark.
4. Scale Reference: Include a familiar natural item (like an earthen tea cup, wooden spoon, or coin) next to the craft in a secondary lifestyle photo to clearly convey actual physical dimensions to buyers.`,
    tags: ['photography', 'lighting', 'camera_angles', 'natural_light', 'catalog_images'],
    keyTakeaways: [
      'Use soft morning/evening window daylight instead of direct sun or harsh bulbs',
      'Neutral off-white or beige matte background keeps focus on the craft',
      'Capture 4 essential angles: Front, 45° Angle, Top-down, and Texture Macro',
      'Provide scale reference to prevent size-related buyer returns'
    ]
  },

  // ─── 2. Catalog & Storytelling ────────────────────────────────────────────
  {
    id: 'catalog_storytelling_01',
    title: 'Heritage Storytelling and Product Catalog Architecture',
    category: 'catalog',
    topic: 'Craft Catalog & Storytelling',
    language: 'en',
    sourceUrl: 'https://artisera.in/handbook/storytelling-handicrafts',
    documentVersion: '3.1',
    publicationDate: '2025-09-01',
    lastVerifiedDate: '2026-08-20',
    content: `Online buyers of handmade products pay a premium for authenticity, provenance, and artisan connection:
1. Product Title Architecture: [Craft Form/Technique] + [Base Material] + [Product Type] + [Functional Feature/Size] + [Region/GI Tag if applicable]. Example: "Gorakhpur Terracotta Traditional Decorative Water Pot - Natural Clay (12-inch)".
2. The 3-Part Artisan Narrative:
   - The Craft Lineage: Mention the traditional technique (e.g., wheel-thrown terracotta, Dhokra lost-wax casting, Channapatna lacquerware turnery) and generations of lineage.
   - Raw Materials & Organic Purity: Clearly declare natural clay, vegetable dyes, seasoned neem wood, or organic silk.
   - Functional & Care Instructions: Hand-wash only, avoid harsh synthetic abrasives, keep in dry shade.
3. Spec Dimensions: Always state Height, Diameter/Width, Weight, and Capacity in metric units (cm, grams, liters) with approximate handmade tolerances (±5%).`,
    tags: ['catalog', 'storytelling', 'product_title', 'artisan_heritage', 'specifications'],
    keyTakeaways: [
      'Structure titles with Craft + Material + Product + Size + Region',
      'Highlight organic materials, handcrafting techniques, and lineage',
      'Always list dimensions with handmade tolerance margins to manage buyer expectations'
    ]
  },

  // ─── 3. Pricing, Profit & Living Wage Calculation ─────────────────────────
  {
    id: 'pricing_living_wage_01',
    title: 'Artisera Fair Living Wage and Profit Calculation Framework',
    category: 'pricing',
    topic: 'Fair Living Wage & Profit Margin Formulation',
    language: 'en',
    sourceUrl: 'https://artisera.in/standards/fair-trade-artisan-pricing-2026',
    documentVersion: '4.0',
    publicationDate: '2026-01-15',
    lastVerifiedDate: '2026-09-01',
    content: `Artisan products should never be priced based on guesswork or distress selling. Use the Artisera Fair Living Wage formula:
1. Production Floor Cost = Raw Materials + (Hours Worked × Living Wage Rate) + Consumables/Kiln/Tools + Safe Packaging + Transport to Hub.
   - Recommended minimum living wage benchmark: ₹120 to ₹160 per labor hour for skilled craftspersons.
2. Sustainable Retail Price (B2C): Production Floor Cost × 1.35 to 1.50 (guaranteeing a 26% – 33% gross profit margin).
3. Wholesale Price (B2B Bulk Orders ≥25 units): Production Floor Cost × 1.20 to 1.25 (guaranteeing a 16% – 20% margin with guaranteed high volume).
4. Net Profit Calculation:
   Net Profit (₹) = Selling Price - Floor Cost.
   Net Profit Margin (%) = (Net Profit / Selling Price) × 100.
5. Break-Even Calculation:
   Break-Even Quantity = Total Fixed Monthly Overhead / (Selling Price per Unit - Variable Cost per Unit).`,
    tags: ['pricing', 'fair_living_wage', 'profit_calculation', 'break_even', 'wholesale_margin'],
    keyTakeaways: [
      'Never price below Production Floor Cost (Materials + Labor Hours × ₹120/hr + Overheads + Packaging)',
      'Retail pricing requires 35% to 50% markup over floor cost',
      'Wholesale bulk pricing maintains 20% to 25% margin for large volumes'
    ]
  },

  // ─── 4. Packaging & Shipping Standards ────────────────────────────────────
  {
    id: 'packaging_shipping_01',
    title: 'Protective Packaging Standards for Fragile Handicrafts and Terracotta',
    category: 'packaging',
    topic: 'Packaging, Drop Testing & Fragile Shipping',
    language: 'en',
    sourceUrl: 'https://artisera.in/standards/fragile-craft-packaging-sop',
    documentVersion: '2.0',
    publicationDate: '2025-11-04',
    lastVerifiedDate: '2026-07-28',
    content: `Fragile handicrafts (terracotta, blue pottery, ceramic, glass art) require 3-stage protective packaging to withstand multi-transit domestic transport:
1. Primary Layer (Surface Shield): Wrap the craft item in 2 layers of 10mm high-density bubble wrap or sustainable honeycomb Kraft paper. Tape all seams firmly so no surface is exposed.
2. Void Fill & Cushioning: The item must sit centered inside a double-walled 5-ply corrugated carton box. Ensure at least 5 cm (2 inches) of cushioning on ALL six sides using shredded Kraft paper, air pillows, or thermocol corner buffers. The item must not shift or rattle when gently shaken.
3. Secondary Outer Carton for High-Value Goods: Box-in-a-box packaging with 3 cm of fill between inner and outer carton.
4. Labelling: Bold "FRAGILE - HANDLE WITH CARE - THIS SIDE UP" stickers on top and two opposing side faces. Add waterproof tape along center and H-taped flaps.`,
    tags: ['packaging', 'shipping', 'terracotta', 'fragile', 'box_specifications'],
    keyTakeaways: [
      'Primary wrap in 10mm bubble wrap or honeycomb paper',
      'Minimum 5cm void-fill on all sides inside a 5-ply corrugated carton',
      'Do the shake test: zero movement allowed inside the box',
      'Always affix high-visibility Fragile & This Side Up labels'
    ]
  },

  // ─── 5. Marketing, Social Media & Sales Growth ─────────────────────────────
  {
    id: 'marketing_social_reels_01',
    title: 'Authentic Craft Social Media Marketing & Buyer Trust',
    category: 'marketing',
    topic: 'Social Media, Process Reels & Repeat Sales',
    language: 'en',
    sourceUrl: 'https://artisera.in/handbook/artisan-social-commerce',
    documentVersion: '2.1',
    publicationDate: '2026-02-12',
    lastVerifiedDate: '2026-08-30',
    content: `Modern craft buyers seek authentic human stories rather than polished studio ads:
1. Behind-The-Scenes Process Videos: 15 to 30 second reels showing hands shaping wet clay on the potter's wheel, natural block-printing stamping, or carving wood. These generate 4× higher engagement than static photos.
2. Audio & Cultural Connection: Use native craft sounds (turning wheel, chisel tap, loom shuttle rhythm) with a simple voiceover explaining what makes this craft traditional.
3. WhatsApp Business Catalog: Setup your catalog with direct pricing, 3 crisp photos per item, and quick reply messages ("Namaste! This piece is handcrafted in 3 days with pure terracotta").
4. Customer Retention: Include a small handwritten thank-you card and a 10% coupon code for their next order in every package.`,
    tags: ['marketing', 'social_media', 'reels', 'buyer_trust', 'repeat_sales'],
    keyTakeaways: [
      'Hands-at-work process reels generate 4x more engagement than product stills',
      'Include native craft sounds to establish genuine handmade authenticity',
      'Use handwritten artisan cards in boxes to earn 5-star reviews and repeat buyers'
    ]
  },

  // ─── 6. Artisera Platform Help & Workflows ────────────────────────────────
  {
    id: 'artisera_platform_help_01',
    title: 'Artisera Mobile Features & Workflow Guide',
    category: 'platform_help',
    platform: 'artisera',
    topic: 'How to use Artisera Features',
    language: 'en',
    sourceUrl: 'https://artisera.in/help/artisan-mobile-guide',
    documentVersion: '3.0',
    publicationDate: '2026-03-01',
    lastVerifiedDate: '2026-09-10',
    content: `Artisera provides end-to-end digital empowerment for traditional artisans:
1. AI Studio & Image Enhancement: Tap "AI Studio" to automatically balance lighting, sharpen fine craft details, and remove distracting clutter from your craft photos while preserving natural handmade textures.
2. Multilingual Voice Catalog: Tap the microphone icon, speak naturally in Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, or English describing your craft. Artisera transcribes, translates, and generates a structured e-commerce catalog.
3. Fair Pricing Engine: Input your raw materials cost, hours worked, and wage rate. Artisera calculates your living wage floor price and fair retail/wholesale benchmarks.
4. B2B Leads & Marketplace Exports: View verified bulk buyer RFPs under "My Orders / Leads" and export platform-ready listings for Amazon Karigar, Flipkart Samarth, Meesho, and GeM with one tap.`,
    tags: ['artisera', 'ai_studio', 'voice_catalog', 'fair_pricing', 'exports', 'help'],
    keyTakeaways: [
      'AI Studio enhances natural photo lighting and textures',
      'Voice cataloging transcribes and translates 7 regional languages',
      'Fair Pricing calculates transparent living wage floors',
      'Export listings directly in Amazon, Flipkart, and GeM formats'
    ]
  },

  // ─── 7. Amazon Karigar Official Onboarding & Listing ──────────────────────
  {
    id: 'amazon_karigar_guide_01',
    title: 'Amazon Karigar Seller Onboarding, GTIN Exemption and Listing Requirements',
    category: 'marketplace',
    platform: 'amazon',
    topic: 'Amazon Karigar Registration & Listing',
    language: 'en',
    sourceUrl: 'https://sell.amazon.in/grow-your-business/amazon-karigar',
    documentVersion: '2026.2',
    publicationDate: '2026-01-20',
    lastVerifiedDate: '2026-09-05',
    officialActionUrl: 'https://sellercentral.amazon.in',
    content: `Amazon Karigar is an initiative dedicated to Indian artisans and weavers:
1. Eligibility Requirements:
   - Artisan Identification Card (Pehchan Card issued by Ministry of Textiles, DC Handicrafts/Handlooms), or registration with an accredited State Handicrafts Development Corporation / Tribal Co-operative (TRIFED).
   - Valid GSTIN (for intra/inter-state taxable sales; GST exemption applies under ₹20 lakh turnover only for specific non-taxable handicrafts under composition rules).
   - Active Indian Bank Account and PAN card.
2. Subsidized Benefits:
   - Up to 50% referral fee discount on select handicraft subcategories.
   - Dedicated storefront banner and "Amazon Karigar" trust badge.
3. GTIN / Barcode Exemption:
   - Handcrafted items do not require commercial UPC/EAN barcodes. Artisans must apply for "GTIN Exemption" in Seller Central under their brand or "Generic" with photo proof of the craft.
4. Required Listing Attributes:
   - Product Name (under 200 chars), Main Image on pure white background (minimum 1000×1000 px for zoom), Material Type, Country of Origin (India), HSN code, Standard Price, and Item Package Dimensions (Length × Width × Height in cm, Weight in grams).`,
    tags: ['amazon', 'karigar', 'gtin_exemption', 'gst', 'pehchan_card', 'seller_central'],
    keyTakeaways: [
      'Pehchan Artisan ID or government agency certificate qualifies for Karigar benefits',
      'GTIN exemption allows listing without purchasing UPC/EAN barcodes',
      'Main photo must be at least 1000x1000px on pure white background',
      'Artisera provides Amazon-compatible CSV/JSON export ready for Seller Central upload'
    ]
  },

  // ─── 8. Flipkart Samarth Official Onboarding & Listing ────────────────────
  {
    id: 'flipkart_samarth_guide_01',
    title: 'Flipkart Samarth Artisan Program Registration and FSN Cataloging',
    category: 'marketplace',
    platform: 'flipkart',
    topic: 'Flipkart Samarth Onboarding & Listing Requirements',
    language: 'en',
    sourceUrl: 'https://seller.flipkart.com/sell-online/samarth',
    documentVersion: '2026.1',
    publicationDate: '2026-02-05',
    lastVerifiedDate: '2026-09-02',
    officialActionUrl: 'https://seller.flipkart.com',
    content: `Flipkart Samarth is designed to integrate traditional Indian artisans, weavers, and rural SHGs onto Flipkart:
1. Benefits & Incentives:
   - Zero or heavily subsidized commission fee incubation period for verified rural artisans.
   - Dedicated account management support and catalogue onboarding assistance.
   - Samarth verified badge prominently visible on the listing.
2. Required Seller Credentials:
   - GSTIN, PAN Card, active Bank Account with cancelled cheque.
   - Artisan registration proof: Pehchan ID, National Handicrafts/Handloom Awardee certificate, or State Handicrafts Board endorsement.
3. Listing Requirements:
   - Flipkart Serial Number (FSN) generated upon catalogue ingestion.
   - Brand name approval (Generic or registered trademark).
   - High-resolution hero image (minimum 1000×1000 px) plus 3 angle shots.
   - Mandatory attributes: Primary Material, Craft Type, Care Instructions, Package Dimensions (cm), Dead Weight (kg), and Country of Origin (India).`,
    tags: ['flipkart', 'samarth', 'artisan_onboarding', 'fsn', 'commission', 'seller_hub'],
    keyTakeaways: [
      'Subsidized incubation fees for verified rural artisans and SHGs',
      'Requires GSTIN, PAN, Bank Account, and Pehchan ID proof',
      'Listings require 1000x1000px images and exact package dimensions/weight',
      'Artisera generates Flipkart Samarth-compliant export payloads'
    ]
  },

  // ─── 9. Meesho Supplier Official Onboarding & 0% Commission Guide ─────────
  {
    id: 'meesho_supplier_guide_01',
    title: 'Meesho Supplier Registration, 0% Commission and Price Recommendations',
    category: 'marketplace',
    platform: 'meesho',
    topic: 'Meesho Supplier Hub & Zero Commission Model',
    language: 'en',
    sourceUrl: 'https://supplier.meesho.com',
    documentVersion: '2026.3',
    publicationDate: '2026-03-10',
    lastVerifiedDate: '2026-09-08',
    officialActionUrl: 'https://supplier.meesho.com/panel/v2/new/register',
    content: `Meesho operates a seller-friendly 0% commission model across diverse consumer and home decor categories:
1. Key Seller Rules:
   - 0% Commission: Meesho charges zero marketplace commission on product sales. Artisans keep 100% of their selling price after shipping deductions.
   - Simplified Registration: Requires only GSTIN (or Enrolment ID for composite/exempted intra-state sellers where permitted under GST Notification 34/2023), PAN, and Bank Account.
   - No Penalty for Order Cancellation: No cancellation fee if stock shortages occur, though shipping SLA affects seller score.
2. Cataloging Standards:
   - Single-product or combo catalogs.
   - Clear images (minimum 500×500 px, 1000×1000 px recommended).
   - Competitive price recommendation: Meesho buyers are value-conscious; bundle smaller crafts (e.g., set of 2 or 4 terracotta diyas or terracotta planters) to offer attractive value while covering base packaging and shipping.`,
    tags: ['meesho', 'supplier', 'zero_commission', 'catalog_upload', 'gst_enrolment'],
    keyTakeaways: [
      'Meesho charges 0% commission on seller sales',
      'Enrolment ID supported for eligible intra-state exempted micro-sellers',
      'Combo packs (sets of 2 or 4) perform best on Meesho for shipping efficiency',
      'Direct supplier portal registration at supplier.meesho.com'
    ]
  },

  // ─── 10. GeM (Government e-Marketplace) Verified Guide ─────────────────────
  {
    id: 'gem_handicrafts_guide_01',
    title: 'GeM Government e-Marketplace Artisan Onboarding and Public Procurement',
    category: 'marketplace',
    platform: 'gem',
    topic: 'GeM Artisan Onboarding, Make in India & Procurement Rules',
    language: 'en',
    sourceUrl: 'https://gem.gov.in/user/register',
    documentVersion: '2026.1',
    publicationDate: '2026-01-12',
    lastVerifiedDate: '2026-08-25',
    officialActionUrl: 'https://gem.gov.in',
    content: `GeM (Government e-Marketplace) is the official public procurement platform for Indian Central/State ministries, PSUs, and institutions:
1. Special Artisan/Weaver Category (Pehchan Integration):
   - Verified artisans registered with the Ministry of Textiles (DC-Handicrafts) can onboard with special exemption categories.
   - Exemption from Earnest Money Deposit (EMD) and prior turnover/experience requirements under Make in India guidelines.
2. Critical Listing Requirements:
   - Class 1 Local Content declaration: 100% Make in India verified content.
   - Product HSN Code (e.g., 97019900 for handicrafts, 6304 for traditional tapestries).
   - MSTC/Handloom registry code or Self-Help Group registration certificate where applicable.
   - Unit price quoted inclusive of all taxes and delivery to designated government buyer consignee locations.
3. Realistic Scope:
   - Artisera generates GeM-compliant structured listing packages (catalogue name, technical specifications sheet, Make in India local content declaration).
   - Note: GeM does not support automated third-party direct API uploads without DSC (Digital Signature Certificate) token login; artisans must download the Artisera GeM package and upload it via official gem.gov.in portal.`,
    tags: ['gem', 'government_procurement', 'make_in_india', 'emd_exemption', 'public_tender'],
    keyTakeaways: [
      'Exempt from EMD and prior turnover requirements for verified Pehchan artisans',
      'Requires 100% Make in India local content declaration',
      'Government tenders and bulk institutional orders offer stable large payments',
      'Artisera provides the compliant GeM listing package for manual portal upload'
    ]
  },

  // ─── 11. ONDC (Open Network for Digital Commerce) Real Architecture ───────
  {
    id: 'ondc_network_guide_01',
    title: 'ONDC Open Network for Digital Commerce Seller Architecture Explained',
    category: 'marketplace',
    platform: 'ondc',
    topic: 'ONDC Decentralized Architecture & Seller Network Participants',
    language: 'en',
    sourceUrl: 'https://ondc.org/seller-network',
    documentVersion: '2026.1',
    publicationDate: '2026-02-28',
    lastVerifiedDate: '2026-09-07',
    officialActionUrl: 'https://ondc.org',
    content: `Understanding ONDC is essential for artisans because ONDC is NOT a single app or website like Amazon:
1. Decentralized Network Architecture:
   - ONDC is an open protocol network (based on Beckn protocol). There is no central "ONDC seller website" where buyers purchase directly.
   - Artisans join through an authorized Seller-Side Network Participant (SNP) app (such as Mystore, SellerApp, Craftsvilla, or designated state SHG seller nodes).
   - Once listed on one Seller App, the artisan's products automatically become discoverable across ALL Buyer Apps on the network (e.g., Paytm, Pincode by PhonePe, Magicpin, Tata Neu).
2. Key Operational Advantages:
   - Lower network commissions (typically 3%–8% vs 20%–35% on traditional private marketplaces).
   - The artisan owns their catalogue, pricing, and customer relationship.
   - Choice of logistics: Seller can use ONDC on-demand logistics partners (Shiprocket, Dunzo, Shadowfax) or their own local delivery.
3. Catalogue Requirements:
   - Beckn-compatible JSON schema with SKU, Title, Price, Description, Image URLs, Dimension/Weight, Return Policy, and GST details.
   - Artisera formats your craft data directly into ONDC Beckn-compatible JSON payloads ready for your chosen Seller App.`,
    tags: ['ondc', 'open_network', 'beckn_protocol', 'seller_app', 'buyer_app', 'logistics'],
    keyTakeaways: [
      'ONDC is not a store; it is an open network connecting seller apps to buyer apps',
      'List once on an authorized Seller App, sell across Paytm, Pincode, and all buyer apps',
      'Significantly lower network commissions (3%-8%) compared to private platforms',
      'Artisera produces Beckn-compliant JSON exports for instant seller-node upload'
    ]
  },

  // ─── 12. PM Vishwakarma Scheme ─────────────────────────────────────────────
  {
    id: 'scheme_pm_vishwakarma_01',
    title: 'PM Vishwakarma Scheme: Loans, ₹15,000 Tool Incentive & Benefits',
    category: 'govt_schemes',
    topic: 'Government Schemes for Traditional Artisans',
    language: 'en',
    sourceUrl: 'https://pmvishwakarma.gov.in',
    documentVersion: '2026.1',
    publicationDate: '2025-09-17',
    lastVerifiedDate: '2026-09-01',
    officialActionUrl: 'https://pmvishwakarma.gov.in',
    content: `PM Vishwakarma is the central flagship scheme for 18 traditional artisan trades (potters, weavers, carpenters, blacksmiths, sculptors, basket makers):
1. Financial Support:
   - ₹15,000 Tool Kit Incentive via e-voucher or DBT for modern equipment.
   - Collateral-free Enterprise Loans: 1st Tranche up to ₹1,00,000 (18 months) and 2nd Tranche up to ₹2,00,000 (30 months) at a concessional interest rate of only 5% (with 8% subvention paid by MoMSME).
2. Skill Training:
   - 5 to 7 days Basic Training with ₹500/day daily stipend.
   - 15 days Advanced Training for high-value handicraft production.
3. Recognition:
   - Official PM Vishwakarma Certificate and digital ID Card for government procurement eligibility.
4. How to Apply:
   - Free enrollment at any local Common Service Center (CSC) with Aadhaar and bank details.`,
    tags: ['vishwakarma', 'pm_vishwakarma', 'artisan_loan', 'tool_incentive', 'training_stipend', 'subsidy'],
    keyTakeaways: [
      '₹15,000 free toolkit incentive for purchasing modern craft tools',
      'Collateral-free loan up to ₹3 Lakh at just 5% interest',
      'Skill training with ₹500 daily stipend and official ID card',
      'Free registration via local Common Service Center (CSC)'
    ]
  },

  // ─── 13. Mudra Yojana & Pehchan Card ──────────────────────────────────────
  {
    id: 'scheme_mudra_pehchan_01',
    title: 'Pradhan Mantri Mudra Yojana & Pehchan Artisan Card',
    category: 'govt_schemes',
    topic: 'Artisan Working Capital & Government ID Benefits',
    language: 'en',
    sourceUrl: 'https://mudra.org.in',
    documentVersion: '2026.1',
    publicationDate: '2025-10-01',
    lastVerifiedDate: '2026-08-20',
    officialActionUrl: 'https://mudra.org.in',
    content: `1. Pradhan Mantri Mudra Yojana (PMMY):
   - Shishu Loan: Up to ₹50,000 for raw materials, clay, yarn, and small tools (zero processing fee).
   - Kishore Loan: ₹50,000 to ₹5,00,000 for purchasing kilns, pit looms, or small machinery.
   - Tarun Loan: ₹5,00,000 to ₹10,00,000 for workshop expansion and bulk exports.
2. Pehchan Artisan Identity Card:
   - Issued free by the Office of DC (Handicrafts), Ministry of Textiles.
   - Free participation & stall allotment in national Dastkar, Surajkund, and Gandhi Shilp craft bazaars.
   - Eligibility for healthcare and life insurance under Pradhan Mantri Jeevan Jyoti Bima Yojana.`,
    tags: ['mudra', 'shishu_loan', 'pehchan_card', 'working_capital', 'ministry_of_textiles', 'handicraft_card'],
    keyTakeaways: [
      'Mudra Shishu loan up to ₹50,000 without collateral for immediate raw materials',
      'Pehchan card provides free stall allotment at national craft exhibitions',
      'Apply at any public sector bank or via udyamimitra.in'
    ]
  }
];
