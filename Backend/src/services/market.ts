import crypto from 'crypto';

export interface PriceRange {
  min: number;
  max: number;
}

export interface MarketOpportunity {
  id: string;
  artisan_id: string;
  product: string;
  demand: string;
  demand_score: number;
  suggested_quantity: number;
  price_range: PriceRange;
  potential_buyers: number;
  reason: string;
  is_demo: boolean;
}

const DEMO_DEMAND_DATA = [
  {
    product: 'Bamboo Storage Basket',
    category: 'bamboo',
    demand: 'HIGH',
    demand_score: 91,
    suggested_quantity: 20,
    price_min: 750,
    price_max: 1050,
    potential_buyers: 7,
    reason: 'Strong demand from e-commerce platforms and eco-friendly retail chains in metro cities.',
    tags: ['bamboo', 'storage', 'eco', 'home decor'],
  },
  {
    product: 'Handloom Cotton Saree',
    category: 'textile',
    demand: 'HIGH',
    demand_score: 87,
    suggested_quantity: 15,
    price_min: 1200,
    price_max: 2500,
    potential_buyers: 12,
    reason: 'Government procurement and fashion retailers are actively sourcing handloom textiles.',
    tags: ['textile', 'handloom', 'saree', 'cotton', 'clothing'],
  },
  {
    product: 'Blue Pottery Decorative Plate',
    category: 'pottery',
    demand: 'MEDIUM',
    demand_score: 74,
    suggested_quantity: 10,
    price_min: 400,
    price_max: 800,
    potential_buyers: 5,
    reason: 'Tourism sector and gifting companies seek authentic blue pottery products.',
    tags: ['pottery', 'blue pottery', 'ceramic', 'rajasthan', 'decor'],
  },
  {
    product: 'Madhubani Painting (A4)',
    category: 'painting',
    demand: 'MEDIUM',
    demand_score: 69,
    suggested_quantity: 25,
    price_min: 300,
    price_max: 700,
    potential_buyers: 8,
    reason: 'Growing demand from corporate gifting and online art marketplaces.',
    tags: ['painting', 'madhubani', 'art', 'bihar', 'folk art'],
  },
  {
    product: 'Dokra Metal Figurine',
    category: 'metal',
    demand: 'LOW',
    demand_score: 52,
    suggested_quantity: 8,
    price_min: 500,
    price_max: 1200,
    potential_buyers: 3,
    reason: 'Niche collector market; consider craft fairs and heritage tourism channels.',
    tags: ['metal', 'dokra', 'tribal', 'figurine', 'west bengal'],
  },
  {
    product: 'Cane Furniture Set',
    category: 'bamboo',
    demand: 'HIGH',
    demand_score: 82,
    suggested_quantity: 5,
    price_min: 3000,
    price_max: 6000,
    potential_buyers: 4,
    reason: 'Rising demand for sustainable furniture in urban markets and hospitality sector.',
    tags: ['cane', 'bamboo', 'furniture', 'home', 'eco'],
  },
  {
    product: 'Block Print Fabric (per meter)',
    category: 'textile',
    demand: 'HIGH',
    demand_score: 78,
    suggested_quantity: 100,
    price_min: 150,
    price_max: 400,
    potential_buyers: 9,
    reason: 'Fashion designers and boutique textile brands actively source block print fabrics.',
    tags: ['block print', 'textile', 'fabric', 'rajasthan', 'jaipur'],
  },
  {
    product: 'Terracotta Wind Chime',
    category: 'pottery',
    demand: 'MEDIUM',
    demand_score: 65,
    suggested_quantity: 30,
    price_min: 120,
    price_max: 300,
    potential_buyers: 6,
    reason: 'Garden decor and gifting segment shows steady demand for terracotta items.',
    tags: ['terracotta', 'pottery', 'wind chime', 'garden', 'decor'],
  },
];

const CRAFT_CATEGORY_MAP: Record<string, string[]> = {
  'bamboo': ['bamboo', 'cane'],
  'weaving': ['textile', 'handloom'],
  'pottery': ['pottery', 'ceramic', 'terracotta'],
  'embroidery': ['textile', 'embroidery'],
  'painting': ['painting', 'art'],
  'metal craft': ['metal', 'dokra'],
  'wood carving': ['wood', 'woodwork'],
  'jewelry': ['jewelry', 'jewellery'],
  'leather': ['leather'],
  'stone': ['stone'],
  'tribal art': ['tribal', 'folk art', 'painting'],
};

const matchCraftToCategories = (craftType?: string | null): string[] => {
  if (!craftType) return [];
  const craftLower = craftType.toLowerCase();
  const matched: string[] = [];
  
  for (const [craftKey, categories] of Object.entries(CRAFT_CATEGORY_MAP)) {
    if (craftLower.includes(craftKey) || categories.some(c => craftLower.includes(c))) {
      matched.push(...categories);
    }
  }
  return [...new Set(matched)];
};

const scoreOpportunityRelevance = (
  opportunity: typeof DEMO_DEMAND_DATA[0],
  craftType?: string | null,
  matchedCategories: string[] = []
): number => {
  let score = 0;
  const oppCategory = opportunity.category.toLowerCase();
  const oppTags = (opportunity.tags || []).map(t => t.toLowerCase());

  // Category match
  if (matchedCategories.includes(oppCategory)) {
    score += 50;
  }
  // Tag overlap with craft type
  if (craftType) {
    const craftWords = craftType.toLowerCase().split(/\s+/);
    const tagMatches = craftWords.filter(w => oppTags.some(tag => tag.includes(w))).length;
    score += Math.min(tagMatches * 10, 30);
  }
  // Demand score boost
  score += Math.floor(opportunity.demand_score / 10);

  return score;
};

export const getOpportunitiesForArtisan = async (
  artisanId: string,
  craftType?: string | null,
  artisanProducts: any[] = [],
  limit: number = 5
): Promise<MarketOpportunity[]> => {
  const matchedCategories = matchCraftToCategories(craftType);

  // Score each demo opportunity for this artisan's craft
  let scoredOpps = DEMO_DEMAND_DATA.map(opp => {
    const relevance = scoreOpportunityRelevance(opp, craftType, matchedCategories);
    return { relevance, opp };
  });

  // Filter out irrelevant opportunities unless there are none
  const relevantOpps = scoredOpps.filter(x => x.relevance > 0);
  
  let selectedOpps = relevantOpps;
  if (selectedOpps.length === 0) {
    console.log(`No craft-specific opportunities for ${artisanId}, returning top opportunities by demand`);
    // Fallback to top sorting by demand score
    selectedOpps = scoredOpps;
  }

  // Sort by relevance desc, then demand_score desc
  selectedOpps.sort((a, b) => {
    if (b.relevance !== a.relevance) {
      return b.relevance - a.relevance;
    }
    return b.opp.demand_score - a.opp.demand_score;
  });

  const results: MarketOpportunity[] = selectedOpps.slice(0, limit).map(({ opp }) => ({
    id: crypto.randomUUID(),
    artisan_id: artisanId,
    product: opp.product,
    demand: opp.demand,
    demand_score: opp.demand_score,
    suggested_quantity: opp.suggested_quantity,
    price_range: {
      min: opp.price_min,
      max: opp.price_max,
    },
    potential_buyers: opp.potential_buyers,
    reason: opp.reason,
    is_demo: true,
  }));

  console.log(`Generated ${results.length} opportunities for artisan ${artisanId} (craft: ${craftType})`);
  return results;
};

// Export raw demo data for use in admin / analytics routes
export const getDemoDemandData = () => DEMO_DEMAND_DATA;
