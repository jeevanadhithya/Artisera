import fs from 'fs';
import path from 'path';
import { getPool } from '../src/services/db';
import { EmbeddingService } from '../src/services/copilot/embeddingService';

interface SeedDoc {
  id: string;
  title: string;
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'kn';
  topic: string;
  scheme_or_marketplace?: string;
  official_source_url: string;
  last_verified_date: string;
  document_version: string;
  state_applicability?: string[];
  content: string;
  key_takeaways: string[];
}

const verifiedDocs: SeedDoc[] = [
  // ─── PM Vishwakarma Scheme ────────────────────────────────────────────────
  {
    id: 'scheme_pm_vishwakarma_en_v1',
    title: 'PM Vishwakarma Central Scheme for Traditional Artisans',
    language: 'en',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `PM Vishwakarma Scheme provides holistic support to traditional craftspeople across 18 artisan trades (potters, blacksmiths, carpenters, weavers, sculptors):
1. Financial Support:
   - Free Toolkit Incentive: ₹15,000 via e-voucher or DBT for modern tools.
   - Collateral-Free Enterprise Loans: 1st Tranche up to ₹1,00,000 (18-month tenure) and 2nd Tranche up to ₹2,00,000 (30-month tenure) at a concessional interest rate of 5%.
2. Skill Training:
   - 5 to 7 days Basic Training with ₹500/day daily stipend.
   - 15 days Advanced Training for high-value handicraft production.
3. Recognition:
   - Official PM Vishwakarma Certificate and digital Artisan ID card.
4. Application:
   - Free enrollment at local Common Service Centers (CSC) with Aadhaar and bank account.`,
    key_takeaways: [
      '₹15,000 free toolkit incentive for purchasing modern equipment',
      'Collateral-free loan up to ₹3 Lakh at 5% interest',
      'Basic and advanced training with ₹500/day stipend',
      'Apply at your local Common Service Center (CSC) or pmvishwakarma.gov.in'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_hi_v1',
    title: 'पीएम विश्वकर्मा योजना: पारंपरिक कारीगरों के लिए ऋण और उपकरण सहायता',
    language: 'hi',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `पीएम विश्वकर्मा योजना 18 पारंपरिक शिल्पकलाओं (कुम्हार, लोहार, बढ़ई, बुनकर, मूर्तिकार) के लिए भारत सरकार की योजना है:
1. ₹15,000 टूलकिट प्रोत्साहन राशि: आधुनिक औजार खरीदने के लिए वित्तीय सहायता।
2. बिना गारंटी ऋण: 5% रियायती ब्याज दर पर ₹1 लाख (पहला चरण) और ₹2 लाख (दूसरा चरण) तक का ऋण।
3. प्रशिक्षण व दैनिक भत्ता: 5-7 दिन का बुनियादी प्रशिक्षण और ₹500 प्रति दिन का वजीफा।
4. आवेदन प्रक्रिया: अपने नजदीकी जन सेवा केंद्र (CSC) पर आधार कार्ड व बैंक पासबुक के साथ निःशुल्क पंजीकरण करें।`,
    key_takeaways: [
      '₹15,000 का निःशुल्क टूलकिट वाउचर',
      '5% ब्याज पर ₹3 लाख तक का कोलैटरल-फ्री ऋण',
      'प्रशिक्षण के दौरान ₹500 प्रतिदिन का वजीफा',
      'नजदीकी सीएससी (CSC) या pmvishwakarma.gov.in पर आवेदन करें'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_ta_v1',
    title: 'பிரதமர் விஸ்வகர்மா திட்டம்: கைவினைஞர்களுக்கான கடனுதவி மற்றும் கருவி மானியம்',
    language: 'ta',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `மத்திய அரசின் பிரதமர் விஸ்வகர்மா திட்டம் 18 பாரம்பரிய கைவினைத் தொழிலாளர்களுக்கு (மண்பாண்டக் கலைஞர், தச்சர், கொல்லர், நெசவாளர்) முழு ஆதரவை வழங்குகிறது:
1. ₹15,000 இலவச கருவி உதவித்தொகை (Toolkit Incentive).
2. பிணையில்லா தொழில் கடன்: 5% வட்டி விகிதத்தில் ₹1 லட்சம் (முதல் தவணை) மற்றும் ₹2 லட்சம் (இரண்டாம் தவணை).
3. திறன் பயிற்சி மற்றும் தினசரி ₹500 உதவித்தொகை.
4. விண்ணப்பிக்கும் முறை: உங்கள் அருகிலுள்ள பொது சேவை மையத்தில் (CSC) ஆதார் மற்றும் வங்கிக் கணக்கு விவரங்களுடன் பதிவு செய்யலாம்.`,
    key_takeaways: [
      'புதிய கருவிகள் வாங்க ₹15,000 மானியம்',
      '5% வட்டியில் ₹3 லட்சம் வரை பிணையில்லா கடன்',
      'பயிற்சி காலத்தில் நாள் ஒன்றுக்கு ₹500 உதவித்தொகை',
      'அருகிலுள்ள CSC மையம் அல்லது pmvishwakarma.gov.in மூலம் விண்ணப்பிக்கவும்'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_te_v1',
    title: 'పీఎం విశ్వకర్మ పథకం: చేతివృత్తుల వారికి రుణాలు మరియు టూల్ కిట్ ప్రయోజనాలు',
    language: 'te',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `పీఎం విశ్వకర్మ పథకం 18 రకాల సాంప్రదాయ వృత్తుల వారికి (కుమ్మరి, వడ్రంగి, కమ్మరి, నేతకారులు):
1. ₹15,000 ఉచిత టూల్ కిట్ ప్రోత్సాహకం.
2. పూచీకత్తు లేని రుణం: కేవలం 5% వడ్డీతో ₹1 లక్ష (మొదటి విడత), ₹2 లక్షలు (రెండవ విడత).
3. శిక్షణ మరియు రోజుకు ₹500 స్టైపెండ్.
4. దరఖాస్తు: సమీపంలోని కామన్ సర్వీస్ సెంటర్ (CSC) వద్ద ఆధార్‌తో నమోదు చేసుకోవచ్చు.`,
    key_takeaways: [
      'ఆధునిక పరికరాల కొనుగోలుకు ₹15,000 ప్రోత్సాహకం',
      '5% వడ్డీతో ₹3 లక్షల వరకు పూచీకత్తు లేని రుణం',
      'శిక్షణ సమయంలో రోజుకు ₹500 భత్యం',
      'CSC సెంటర్ లేదా pmvishwakarma.gov.in ద్వారా దరఖాస్తు చేయండి'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_bn_v1',
    title: 'প্রধানমন্ত্রী বিশ্বকর্মা যোজনা: কারিগরদের জন্য অনুদান ও ঋণ সুবিধা',
    language: 'bn',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `১৮টি ঐতিহ্যবাহী পেশার কারিগরদের (মৃৎশিল্পী, তাঁতি, কামার, ছুতার) জন্য পিএম বিশ্বকর্মা যোজনা:
১. ₹১৫,০০০ বিনামূল্যে টুলকিট ইনসেনটিভ।
২. জামানতবিহীন সহজ ঋণ: ৫% সুদে ₹১ লাখ এবং ₹২ লাখ পর্যন্ত ঋণ।
৩. দক্ষতা প্রশিক্ষণ এবং দৈনিক ₹৫০০ স্টাইপেন্ড।
৪. আবেদন: স্থানীয় কমন সার্ভিস সেন্টারে (CSC) আধার ও ব্যাঙ্ক অ্যাকাউন্ট দিয়ে আবেদন করুন।`,
    key_takeaways: [
      'টুলকিট কিনতে ₹১৫,০০০ অনুদান',
      '৫% সুদে ₹৩ লাখ পর্যন্ত জামানতহীন ঋণ',
      'প্রশিক্ষণ চলাকালীন দৈনিক ₹৫০০ স্টাইপেন্ড',
      'নিকটস্থ সিএসসি (CSC) বা pmvishwakarma.gov.in-এ আবেদন করুন'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_mr_v1',
    title: 'पीएम विश्वकर्मा योजना: कारागिरांसाठी कर्ज आणि साधनसामग्री अनुदान',
    language: 'mr',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `पीएम विश्वकर्मा योजना कुंभार, सुतार, लोहार, विणकर अशा १८ पारंपरिक व्यवसायांसाठी:
१. ₹१५,००० मोफत टूलकिट प्रोत्साहन (Tool Kit Incentive).
२. विनातारण कर्ज: ५% सवलतीच्या व्याजदरात ₹३ लाखांपर्यंत कर्ज.
३. मोफत कौशल्य प्रशिक्षण व दररोज ₹५०० भत्ता.
४. अर्ज: जवळच्या ग्राहक सेवा केंद्रात (CSC) आधार कार्डासह नोंदणी करा.`,
    key_takeaways: [
      'साधने खरेदीसाठी ₹१५,००० मोफत अनुदान',
      '५% व्याजाने ₹३ लाखांपर्यंत विनातारण कर्ज',
      'प्रशिक्षणादरम्यान दररोज ₹५०० विद्यावेतन',
      'ग्राहक सेवा केंद्र किंवा pmvishwakarma.gov.in वर अर्ज करा'
    ],
  },
  {
    id: 'scheme_pm_vishwakarma_kn_v1',
    title: 'ಪಿಎಂ ವಿಶ್ವಕರ್ಮ ಯೋಜನೆ: ಸಾಂಪ್ರದಾಯಿಕ ಕುಶಲಕರ್ಮಿಗಳಿಗೆ ಸಾಲ ಮತ್ತು ಉಪಕರಣ ಸೌಲಭ್ಯ',
    language: 'kn',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'pm_vishwakarma',
    official_source_url: 'https://pmvishwakarma.gov.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `೧೮ ಸಾಂಪ್ರದಾಯಿಕ ಕುಶಲಕರ್ಮಿಗಳಿಗೆ (ಕುಂಬಾರರು, ನೇಕಾರರು, ಕಮ್ಮಾರರು, ಬಡಿಗರು) ಪಿಎಂ ವಿಶ್ವಕರ್ಮ ಯೋಜನೆ:
೧. ₹೧೫,೦೦೦ ಉಚಿತ ಟೂಲ್‌ಕಿಟ್ ಪ್ರೋತ್ಸಾಹಧನ.
೨. ಭದ್ರತೆ ರಹಿತ ಸಾಲ: ಕೇವಲ ೫% ಬಡ್ಡಿದರದಲ್ಲಿ ₹೩ ಲಕ್ಷದವರೆಗೆ ಉದ್ಯಮ ಸಾಲ.
೩. ಕೌಶಲ್ಯ ತರಬೇತಿ ಮತ್ತು ದಿನಕ್ಕೆ ₹೫೦೦ ಸ್ಟೈಫಂಡ್.
೪. ಅರ್ಜಿ: ಹತ್ತಿರದ ಸಿಎಸ್‌ಸಿ (CSC) ಕೇಂದ್ರದಲ್ಲಿ ಆಧಾರ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ವಿವರಗಳೊಂದಿಗೆ ನೋಂದಾಯಿಸಿ.`,
    key_takeaways: [
      'ಉಪಕರಣ ಖರೀದಿಗೆ ₹೧೫,೦೦೦ ಉಚಿತ ಪ್ರೋತ್ಸಾಹಧನ',
      '೫% ಬಡ್ಡಿದರದಲ್ಲಿ ₹೩ ಲಕ್ಷದವರೆಗೆ ಭದ್ರತೆ ರಹಿತ ಸಾಲ',
      'ತರಬೇತಿ ಸಮಯದಲ್ಲಿ ದಿನಕ್ಕೆ ₹೫೦೦ ಭತ್ಯೆ',
      'ಹತ್ತಿರದ CSC ಕೇಂದ್ರ ಅಥವಾ pmvishwakarma.gov.in ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ'
    ],
  },

  // ─── Mudra Yojana & Pehchan Card ──────────────────────────────────────────
  {
    id: 'scheme_mudra_pehchan_en_v1',
    title: 'Pradhan Mantri Mudra Yojana & Pehchan Artisan ID Card',
    language: 'en',
    topic: 'Government Schemes',
    scheme_or_marketplace: 'mudra',
    official_source_url: 'https://udyamimitra.in',
    last_verified_date: '2026-09-01',
    document_version: 'v2026.1',
    state_applicability: ['All India'],
    content: `1. Pradhan Mantri Mudra Yojana (PMMY):
   - Shishu Loan: Up to ₹50,000 for raw materials, clay, yarn, and small tools without collateral.
   - Kishore Loan: ₹50,000 to ₹5,00,000 for purchasing kilns, pit looms, or small machinery.
   - Tarun Loan: ₹5,00,000 to ₹10,00,000 for workshop expansion and bulk exports.
   - Apply at any nationalized bank or online via udyamimitra.in.
2. Pehchan Artisan Identity Card:
   - Issued free by Office of DC (Handicrafts), Ministry of Textiles.
   - Provides free participation & stall allotment in national Dastkar, Surajkund, and Gandhi Shilp craft bazaars.
   - Grants access to life/health insurance under central welfare schemes.
   - Apply at nearest Field Service Center or online at indianhandicrafts.gov.in.`,
    key_takeaways: [
      'Mudra Shishu loan up to ₹50,000 with zero processing fees for working capital',
      'Pehchan card provides free stall allotment at national craft expos',
      'Apply for Mudra at udyamimitra.in and Pehchan at indianhandicrafts.gov.in'
    ],
  },

  // ─── Product Creation Flow ────────────────────────────────────────────────
  {
    id: 'flow_product_creation_en_v1',
    title: 'Artisera 6-Step Craft Product Creation Guide',
    language: 'en',
    topic: 'Product Creation',
    scheme_or_marketplace: 'product_creation',
    official_source_url: 'https://artisera.in/help/artisan-mobile-guide',
    last_verified_date: '2026-09-10',
    document_version: 'v2026.1',
    content: `Create and publish authentic craft listings in 6 structured steps:
Step 1: Add a product photo (clear front, 45° angle, and handmade texture).
Step 2: Record or type craft story (explain tradition, material origin, and technique).
Step 3: Review AI-generated title, description, category, and materials.
Step 4: Add raw material costs, labor hours, and set your fair price.
Step 5: Run AI Studio image enhancement to balance natural lighting and colors.
Step 6: Review final details and publish to your digital catalogue.`,
    key_takeaways: [
      'Step 1: Photo, Step 2: Story, Step 3: Catalog Review, Step 4: Fair Pricing, Step 5: AI Studio, Step 6: Publish',
      'Each step has a direct action button in the Artisera mobile app'
    ],
  },

  // ─── Marketplace Readiness ────────────────────────────────────────────────
  {
    id: 'flow_marketplace_readiness_en_v1',
    title: 'Artisera Marketplace Readiness & Export Suite Guide',
    language: 'en',
    topic: 'Marketplace Readiness',
    scheme_or_marketplace: 'amazon',
    official_source_url: 'https://sell.amazon.in/grow-your-business/amazon-karigar',
    last_verified_date: '2026-09-05',
    document_version: 'v2026.2',
    content: `Artisera Marketplace Readiness verifies your genuine product attributes across major channels:
1. Amazon Karigar: Requires SKU, Brand/Artisan, Price, Dimensions/Weight, White background image, and Country of Origin. GTIN exemption is applicable.
2. Flipkart Samarth: Requires Seller SKU, MRP, Selling Price, Stock Count, HSN code, Country of Origin, and Manufacturer Details.
3. GeM (Government e-Marketplace): Requires HSN code, GST rate, Manufacturer details, and 100% Make in India local content declaration.
4. ONDC (Beckn Protocol): Generates retail-ready JSON package with item, seller, and compliance nodes.
5. Meesho: Requires Title, Price, and Stock Count. 0% marketplace commission.
Note: Exports generate verified packages; they do not automatically publish live listings without your authorized seller credentials.`,
    key_takeaways: [
      'Readiness is calculated dynamically from genuine product attributes',
      'Exports produce XLSX, CSV, PDF, and JSON packages ready for portal upload',
      'Never claims products are automatically published without official seller account connection'
    ],
  },

  // ─── Fair Living Wage & Pricing ───────────────────────────────────────────
  {
    id: 'flow_fair_pricing_en_v1',
    title: 'Artisera Fair Living Wage and Pricing Formulation Guide',
    language: 'en',
    topic: 'Fair Pricing',
    scheme_or_marketplace: 'pricing',
    official_source_url: 'https://artisera.in/standards/fair-trade-artisan-pricing-2026',
    last_verified_date: '2026-09-01',
    document_version: 'v4.0',
    content: `Formulate authentic handmade craft pricing without distress selling:
1. Production Floor Cost: Raw Materials + (Hours Worked × Living Wage ₹120–₹160/hr) + Safe Packaging + Transport to Hub. Never sell below this cost.
2. Sustainable Retail Price (B2C): Floor Cost × 1.35 to 1.50 (26%–33% gross profit margin).
3. Wholesale Price (B2B Bulk Orders ≥25 units): Floor Cost × 1.20 to 1.25 (16%–20% margin for large volumes).
4. Net Profit = Selling Price - Production Floor Cost.
5. Break-Even Units = Fixed Overheads / (Selling Price - Variable Cost per unit).`,
    key_takeaways: [
      'Floor Cost = Materials + (Labor Hours × ₹120–₹160/hr) + Packaging + Transport',
      'Retail requires 35%–50% markup over floor cost',
      'Wholesale maintains 20%–25% margin for guaranteed volume'
    ],
  }
];

async function run() {
  const pool = getPool();
  console.log('Applying 004_artisan_guide.sql migration...');
  const sql = fs.readFileSync(path.join(__dirname, '004_artisan_guide.sql'), 'utf8');
  await pool.query(sql);
  console.log('004_artisan_guide schema applied.');

  console.log('Seeding verified knowledge documents with vector embeddings...');
  let inserted = 0;
  for (const doc of verifiedDocs) {
    const existing = await pool.query(
      'SELECT id FROM public.guide_knowledge_documents WHERE id = $1;',
      [doc.id]
    );

    if (existing.rows.length === 0) {
      const textToEmbed = `${doc.title}\n${doc.topic}\n${doc.content}\n${doc.key_takeaways.join(' ')}`;
      const embedding = EmbeddingService.deterministicEmbedding(textToEmbed);

      await pool.query(
        `INSERT INTO public.guide_knowledge_documents
          (id, title, language, topic, scheme_or_marketplace, official_source_url,
           last_verified_date, document_version, state_applicability, content,
           key_takeaways, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
        [
          doc.id,
          doc.title,
          doc.language,
          doc.topic,
          doc.scheme_or_marketplace || null,
          doc.official_source_url,
          doc.last_verified_date,
          doc.document_version,
          doc.state_applicability || ['All India'],
          doc.content,
          JSON.stringify(doc.key_takeaways),
          embedding,
          JSON.stringify({ seeded: true, source: 'Artisera Verified Registry' })
        ]
      );
      inserted++;
      console.log(`  + Seeded doc: [${doc.language}] ${doc.title}`);
    } else {
      console.log(`  - Preserved doc: ${doc.id} already exists`);
    }
  }

  console.log(`Knowledge base seeding complete. ${inserted} new documents inserted.`);
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
