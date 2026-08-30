import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'mr' | 'bn';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'கன்னட / ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳' },
];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentOption: LanguageOption;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    home: 'Home',
    explore: 'Explore',
    add: 'Add Craft',
    leads: 'Leads',
    profile: 'Profile',
    published_products: 'Published Products',
    draft_products: 'Draft Products',
    categories: 'Craft Categories',
    pricing_calculator: 'Pricing Calculator',
    change_language: 'App Language / भाषा बदलें',
    sign_out: 'Sign Out',
    my_profile: 'My Profile',
    verified_artisan: 'Verified Artisan',
  },
  hi: {
    home: 'होम',
    explore: 'खोजें',
    add: 'उत्पाद जोड़ें',
    leads: 'लीड्स',
    profile: 'प्रोफाइल',
    published_products: 'प्रकाशित उत्पाद',
    draft_products: 'ड्राफ्ट उत्पाद',
    categories: 'शिल्प श्रेणियां',
    pricing_calculator: 'मूल्य कैलकुलेटर',
    change_language: 'ऐप भाषा / Select Language',
    sign_out: 'साइन आउट',
    my_profile: 'मेरी प्रोफाइल',
    verified_artisan: 'सत्यापित कारीगर',
  },
  ta: {
    home: 'முகப்பு',
    explore: 'ஆராயுங்கள்',
    add: 'சேர்',
    leads: 'வாய்ப்புகள்',
    profile: 'சுயவிவரம்',
    published_products: 'வெளியிடப்பட்ட பொருட்கள்',
    draft_products: 'வரைவு பொருட்கள்',
    categories: 'கைவினைப் பிரிவுகள்',
    pricing_calculator: 'விலை கணக்கீடு',
    change_language: 'பயன்பாட்டு மொழி / Language',
    sign_out: 'வெளியேறு',
    my_profile: 'என் சுயவிவரம்',
    verified_artisan: 'சரிபார்க்கப்பட்ட கலைஞர்',
  },
  te: {
    home: 'హోమ్',
    explore: 'అన్వేషించండి',
    add: 'జతచేయి',
    leads: 'లీడ్స్',
    profile: 'ప్రొఫైల్',
    published_products: 'ప్రచురించిన ఉత్పత్తులు',
    draft_products: 'డ్రాఫ్ట్ ఉత్పత్తులు',
    categories: 'చేతివృత్తుల వర్గాలు',
    pricing_calculator: 'ధర కాలిక్యులేటర్',
    change_language: 'యాప్ భాష / Language',
    sign_out: 'సైన్ అవుట్',
    my_profile: 'నా ప్రొఫైల్',
    verified_artisan: 'ధృవీకరించబడిన కళాకారుడు',
  },
  kn: {
    home: 'ಮುಖಪುಟ',
    explore: 'ಅನ್ವೇಷಿಸಿ',
    add: 'ಸೇರಿಸಿ',
    leads: 'ಲೀಡ್ಸ್',
    profile: 'ಪ್ರೊಫೈಲ್',
    published_products: 'ಪ್ರಕಟಿತ ಉತ್ಪನ್ನಗಳು',
    draft_products: 'ಖರಡು ಉತ್ಪನ್ನಗಳು',
    categories: 'ಕರಕುಶಲ ವರ್ಗಗಳು',
    pricing_calculator: 'ಬೆಲೆ ಕ್ಯಾಲ್ಕುಲೇಟರ್',
    change_language: 'ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ / Language',
    sign_out: 'ಸೈನ್ ಔಟ್',
    my_profile: 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    verified_artisan: 'ಪರಿಶೀಲಿಸಿದ ಕಲಾಕಾರ',
  },
  mr: {
    home: 'होम',
    explore: 'शोधा',
    add: 'जोडा',
    leads: 'लीड्स',
    profile: 'प्रोफाइल',
    published_products: 'प्रकाशित उत्पादने',
    draft_products: 'ड्राफ्ट उत्पादने',
    categories: 'हस्तकला वर्ग',
    pricing_calculator: 'किंमत कॅल्क्युलेटर',
    change_language: 'अ‍ॅप भाषा / Language',
    sign_out: 'साइन आउट',
    my_profile: 'माझी प्रोफाइल',
    verified_artisan: 'सत्यापित कारागीर',
  },
  bn: {
    home: 'হোম',
    explore: 'খুঁজুন',
    add: 'যোগ করুন',
    leads: 'লিডসমূহ',
    profile: 'প্রোফাইল',
    published_products: 'প্রকাশিত পণ্যসমূহ',
    draft_products: 'খসড়া পণ্যসমূহ',
    categories: 'শিল্পের বিভাগসমূহ',
    pricing_calculator: 'মূল্য গণকযন্ত্র',
    change_language: 'অ্যাপের ভাষা / Language',
    sign_out: 'সাইন আউট',
    my_profile: 'আমার প্রোফাইল',
    verified_artisan: 'যাচাইকৃত কারিগর',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  currentOption: SUPPORTED_LANGUAGES[0]!,
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('artisera_app_language') as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('artisera_app_language', lang);
    }
  };

  const currentOption = (SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0])!;

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentOption, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
