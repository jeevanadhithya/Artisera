export interface TrendData {
  category: string;
  demandIndex: number; // 0 - 100
  growthRate: string;
  trendingKeywords: string[];
  seasonalPeak: string;
  averageOrderValue: number;
}

export const CRAFT_MARKET_TRENDS: Record<string, TrendData> = {
  pottery: {
    category: 'Pottery & Ceramics',
    demandIndex: 88,
    growthRate: '+24% YoY',
    trendingKeywords: ['Khurja Blue Pottery', 'Terracotta Planters', 'Lead-Free Glazed Mugs', 'Warli Hand-Painted'],
    seasonalPeak: 'Diwali Festive & Spring Decor (Sept - Nov)',
    averageOrderValue: 1200,
  },
  textiles: {
    category: 'Handloom Textiles & Sarees',
    demandIndex: 95,
    growthRate: '+31% YoY',
    trendingKeywords: ['Banarasi Katan Silk', 'Kalamkari Block Print', 'Ajrakh Natural Dyes', 'Chanderi Zari'],
    seasonalPeak: 'Wedding Season & Festivals (Oct - Feb)',
    averageOrderValue: 4800,
  },
  woodwork: {
    category: 'Hand-Carved Woodcraft',
    demandIndex: 79,
    growthRate: '+18% YoY',
    trendingKeywords: ['Sheesham Spice Box', 'Kashmiri Walnut Inlay', 'Teak Wood Kitchenware', 'Carved Wall Art'],
    seasonalPeak: 'Corporate Gifting & Year End (Nov - Jan)',
    averageOrderValue: 2400,
  },
  metalwork: {
    category: 'Brass & Bell Metal Castings',
    demandIndex: 84,
    growthRate: '+22% YoY',
    trendingKeywords: ['Dhokra Lost-Wax Art', 'Moradabad Engraved Diyas', 'Bidriware Silver Wire', 'Brass Idols'],
    seasonalPeak: 'Festive & Home Temples (Aug - Nov)',
    averageOrderValue: 3100,
  },
  jewelry: {
    category: 'Artisanal & Filigree Jewelry',
    demandIndex: 91,
    growthRate: '+28% YoY',
    trendingKeywords: ['Meenakari Kundan', 'Cuttack Silver Filigree', 'Terracotta Necklaces', 'Tribal Coin Jewelry'],
    seasonalPeak: 'Bridal & Festive (Oct - Jan)',
    averageOrderValue: 3500,
  },
};

/**
 * Get demand trends, seasonal peaks, and high-velocity keywords for handicraft sectors.
 */
export function getMarketTrends(category?: string): TrendData[] {
  if (category) {
    const key = Object.keys(CRAFT_MARKET_TRENDS).find(
      (k) => k.toLowerCase() === category.toLowerCase() || category.toLowerCase().includes(k)
    );
    if (key && CRAFT_MARKET_TRENDS[key]) {
      return [CRAFT_MARKET_TRENDS[key]];
    }
  }
  return Object.values(CRAFT_MARKET_TRENDS);
}
