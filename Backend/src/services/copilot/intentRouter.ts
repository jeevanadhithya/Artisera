export type GuideFlowType =
  | 'pm_vishwakarma'
  | 'mudra'
  | 'pehchan'
  | 'product_creation'
  | 'marketplace_readiness'
  | 'fair_pricing'
  | 'general_guide';

export type CopilotIntent =
  | 'TASK_GUIDE'
  | 'MARKETPLACE_READINESS'
  | 'FAIR_PRICING'
  | 'KNOWLEDGE_RAG'
  | 'PRODUCT_UPDATE_CONFIRMATION'
  | 'GENERAL_CONVERSATION';

export interface IntentClassification {
  intent: CopilotIntent;
  flowType?: GuideFlowType;
  targetMarketplace?: 'amazon' | 'flipkart' | 'gem' | 'ondc' | 'meesho';
  stepRequested?: number;
  isNextStep: boolean;
  detectedLanguage: 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'kn';
  extractedPrice?: number;
  confidence: number;
}

export class IntentRouter {
  /**
   * Detects language from Unicode script and patterns.
   */
  public static detectLanguage(text: string, fallback: string = 'en'): 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'kn' {
    if (!text) return (fallback as any) || 'en';

    // Tamil Unicode range
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Telugu Unicode range
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Kannada Unicode range
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    // Bengali Unicode range
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    // Devanagari (Hindi / Marathi)
    if (/[\u0900-\u097F]/.test(text)) {
      // Distinguish Marathi specific markers without ASCII \b
      if (/(आहे|नाही|करावी|पायरी|कर्ज|विक्री|माझे|योजनेत|नोंदणी|कशी|कसे|करणे)/i.test(text)) {
        return 'mr';
      }
      return 'hi';
    }

    return (fallback as any) || 'en';
  }

  /**
   * Multilingual Intent Classification
   */
  public static classify(
    query: string,
    hasProductContext: boolean = false,
    languageHint?: string,
    activeFlow?: GuideFlowType
  ): IntentClassification {
    const q = (query || '').toLowerCase().trim();
    const detectedLanguage = this.detectLanguage(query, languageHint || 'en');

    // 1. Detect Next Step Progression
    const isNextStep =
      q.includes('next step') ||
      q.includes('next') ||
      q.includes('continue') ||
      q.includes('अगला चरण') ||
      q.includes('आगे') ||
      q.includes('அடுத்த படி') ||
      q.includes('తదుపరి దశ') ||
      q.includes('পরবর্তী ধাপ') ||
      q.includes('पुढील पायरी') ||
      q.includes('ಮುಂದಿನ ಹಂತ');

    // 2. Marketplace Reference
    let targetMarketplace: 'amazon' | 'flipkart' | 'gem' | 'ondc' | 'meesho' | undefined;
    if (q.includes('amazon') || q.includes('अमेज़न') || q.includes('அமேசான்') || q.includes('అమెజాన్')) targetMarketplace = 'amazon';
    else if (q.includes('flipkart') || q.includes('फ्लिपकार्ट') || q.includes('ஃபிளிப்கார்ட்') || q.includes('ఫ్లిప్‌కార్ట్')) targetMarketplace = 'flipkart';
    else if (q.includes('gem') || q.includes('जेम') || q.includes('அரசு சந்தை') || q.includes('government e-marketplace')) targetMarketplace = 'gem';
    else if (q.includes('ondc') || q.includes('ओएनडीसी')) targetMarketplace = 'ondc';
    else if (q.includes('meesho') || q.includes('मीशो') || q.includes('மீஷோ')) targetMarketplace = 'meesho';

    // 3. Price extraction
    let extractedPrice: number | undefined;
    const priceMatch = q.match(/(?:₹|rs\.?|inr|\bfor\b)\s*(\d{2,6})/i) || q.match(/(\d{3,6})\s*(?:₹|rupees|रुपये)/i);
    if (priceMatch && priceMatch[1]) {
      extractedPrice = parseInt(priceMatch[1], 10);
    }

    // 4. Scheme Flows
    // PM Vishwakarma
    if (
      q.includes('vishwakarma') ||
      q.includes('विश्वकर्मा') ||
      q.includes('விஸ்வகர்மா') ||
      q.includes('విశ్వకర్మ') ||
      q.includes('বিশ্বকর্মা') ||
      q.includes('ವಿಶ್ವಕರ್ಮ')
    ) {
      return {
        intent: 'TASK_GUIDE',
        flowType: 'pm_vishwakarma',
        isNextStep,
        detectedLanguage,
        confidence: 0.98,
      };
    }

    // Mudra Loan
    if (
      q.includes('mudra') ||
      q.includes('मुद्रा') ||
      q.includes('முத்ரா') ||
      q.includes('ముద్ర') ||
      q.includes('মুদ্রা') ||
      q.includes('ಮುದ್ರಾ')
    ) {
      return {
        intent: 'TASK_GUIDE',
        flowType: 'mudra',
        isNextStep,
        detectedLanguage,
        confidence: 0.98,
      };
    }

    // Pehchan Card
    if (
      q.includes('pehchan') ||
      q.includes('पहचान') ||
      q.includes('பெஹ்சான்') ||
      q.includes('పెహచాన్') ||
      q.includes('পহেচান') ||
      q.includes('ಪೆಹಚಾನ್') ||
      q.includes('artisan id') ||
      q.includes('artisan card')
    ) {
      return {
        intent: 'TASK_GUIDE',
        flowType: 'pehchan',
        isNextStep,
        detectedLanguage,
        confidence: 0.98,
      };
    }

    // 5. Product Creation Flow
    if (
      q.includes('add product') ||
      q.includes('create product') ||
      q.includes('new product') ||
      q.includes('பொருளைச் சேர்க்க') ||
      q.includes('பொருள் சேர்க்க') ||
      q.includes('सामग्री जोड़ें') ||
      q.includes('उत्पाद जोड़ें') ||
      q.includes('नया उत्पाद') ||
      q.includes('వస్తువును జోడించు') ||
      q.includes('పণ্য যোগ করুন') ||
      q.includes('उत्पादन जोडा') ||
      q.includes('ಉತ್ಪನ್ನ ಸೇರಿಸಿ') ||
      (activeFlow === 'product_creation' && isNextStep)
    ) {
      return {
        intent: 'TASK_GUIDE',
        flowType: 'product_creation',
        isNextStep,
        detectedLanguage,
        confidence: 0.97,
      };
    }

    // 6. Marketplace Readiness Flow
    if (
      targetMarketplace ||
      q.includes('sell online') ||
      q.includes('marketplace') ||
      q.includes('मार्केटप्लेस') ||
      q.includes('விற்பனை') ||
      q.includes('readiness') ||
      (activeFlow === 'marketplace_readiness' && isNextStep)
    ) {
      return {
        intent: 'MARKETPLACE_READINESS',
        flowType: 'marketplace_readiness',
        targetMarketplace: targetMarketplace || 'amazon',
        isNextStep,
        detectedLanguage,
        confidence: 0.96,
      };
    }

    // 7. Fair Pricing Flow
    if (
      q.includes('price') ||
      q.includes('profit') ||
      q.includes('wage') ||
      q.includes('cost') ||
      q.includes('कीमत') ||
      q.includes('मुनाफा') ||
      q.includes('மार्जिन') ||
      q.includes('விலை') ||
      q.includes('లాభం') ||
      q.includes('ధర') ||
      q.includes('লাভ') ||
      q.includes('দাম') ||
      q.includes('नफा') ||
      q.includes('किंमत') ||
      q.includes('ಲಾಭ') ||
      q.includes('ಬೆಲೆ') ||
      q.includes('break even') ||
      q.includes('break-even') ||
      extractedPrice !== undefined
    ) {
      return {
        intent: 'FAIR_PRICING',
        flowType: 'fair_pricing',
        extractedPrice,
        isNextStep,
        detectedLanguage,
        confidence: 0.95,
      };
    }

    // 8. If in an active flow and user asks next step
    if (activeFlow && isNextStep) {
      return {
        intent: 'TASK_GUIDE',
        flowType: activeFlow,
        isNextStep: true,
        detectedLanguage,
        confidence: 0.95,
      };
    }

    // 9. General RAG Knowledge
    return {
      intent: 'KNOWLEDGE_RAG',
      isNextStep: false,
      detectedLanguage,
      confidence: 0.85,
    };
  }
}
