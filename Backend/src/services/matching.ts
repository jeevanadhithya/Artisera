export interface MatchScoreBreakdown {
  compatibility: number;
  capacity: number;
  price: number;
  location: number;
  availability: number;
  weights: typeof WEIGHTS;
}

export interface ArtisanMatchResult {
  artisan_id: string;
  artisan_name: string;
  craft_type?: string | null;
  region?: string | null;
  state?: string | null;
  match_score: number;
  score_breakdown?: MatchScoreBreakdown | null;
  capacity?: number | null;
  estimated_price?: number | null;
  availability: string;
}

export interface MatchingResponse {
  request_id: string;
  product_category: string;
  quantity_required: number;
  matches: ArtisanMatchResult[];
  total_matches: number;
  algorithm: string;
}

const WEIGHTS = {
  compatibility: 0.40,
  capacity: 0.20,
  price: 0.20,
  location: 0.10,
  availability: 0.10,
};

// ─── Scoring Functions ────────────────────────────────────────────────────────

const scoreCompatibility = (
  buyerCategory: string,
  artisanCraft?: string | null,
  artisanProducts: any[] = []
): number => {
  if (!artisanCraft && artisanProducts.length === 0) {
    return 0.0;
  }

  const buyerWords = new Set(buyerCategory.toLowerCase().split(/\s+/));
  let score = 0.0;

  // Check craft type match
  if (artisanCraft) {
    const craftLower = artisanCraft.toLowerCase();
    const craftWords = new Set(craftLower.split(/\s+/));
    
    // Find intersection
    const overlap = [...buyerWords].filter(w => craftWords.has(w));
    if (overlap.length > 0) {
      score = Math.max(score, Math.min((overlap.length / buyerWords.size) * 100, 80));
    }
    // Substring match
    if ([...buyerWords].some(w => craftLower.includes(w))) {
      score = Math.max(score, 70.0);
    }
  }

  // Check product name/category matches
  for (const product of artisanProducts) {
    const productName = `${product.name || ''} ${product.category || ''}`.toLowerCase();
    const productWords = new Set(productName.split(/\s+/));
    const overlap = [...buyerWords].filter(w => productWords.has(w));
    
    if (overlap.length > 0) {
      const productScore = Math.min((overlap.length / buyerWords.size) * 100, 100);
      score = Math.max(score, productScore);
    }
  }

  return Math.round(score * 10) / 10;
};

const scoreCapacity = (
  requiredQuantity: number,
  artisanPublishedProductsCount: number
): number => {
  if (artisanPublishedProductsCount === 0) {
    return 20.0; // Base score for new artisans
  }

  // Proxy: each published product represents an estimated capacity of 50 units/month
  const estimatedCapacity = artisanPublishedProductsCount * 50;

  if (estimatedCapacity >= requiredQuantity) return 100.0;
  if (estimatedCapacity >= requiredQuantity * 0.75) return 80.0;
  if (estimatedCapacity >= requiredQuantity * 0.50) return 60.0;
  if (estimatedCapacity >= requiredQuantity * 0.25) return 40.0;
  return 20.0;
};

const scorePrice = (
  buyerBudget: number,
  artisanMinPrice?: number | null,
  artisanMaxPrice?: number | null,
  artisanPrice?: number | null
): number => {
  const pricePoint = artisanPrice ?? artisanMinPrice ?? artisanMaxPrice ?? null;
  if (pricePoint === null) return 50.0; // Neutral score if unknown

  if (pricePoint <= buyerBudget) {
    // Within budget, calculate headroom score
    const headroom = (buyerBudget - pricePoint) / buyerBudget;
    return Math.round((70 + headroom * 30) * 10) / 10;
  } else {
    // Over budget, calculate overage penalty
    const overage = (pricePoint - buyerBudget) / buyerBudget;
    if (overage <= 0.10) return 50.0; // 10% over
    if (overage <= 0.25) return 25.0; // 25% over
    return 0.0;
  }
};

const scoreLocation = (
  buyerLocation: string,
  artisanState?: string | null,
  artisanDistrict?: string | null
): number => {
  if (!artisanState && !artisanDistrict) return 50.0;

  const buyerLocLower = buyerLocation.toLowerCase();
  const artisanLoc = `${artisanDistrict || ''} ${artisanState || ''}`.toLowerCase().trim();

  const buyerWords = new Set(buyerLocLower.split(/\s+/));
  const artisanWords = new Set(artisanLoc.split(/\s+/));
  
  const overlap = [...buyerWords].filter(w => artisanWords.has(w));
  if (overlap.length > 0) return 90.0; // Same region
  return 40.0; // Different region
};

const scoreAvailability = (
  publishedProductsCount: number,
  totalProductsCount: number
): number => {
  if (totalProductsCount === 0) return 30.0;
  if (publishedProductsCount === 0) return 20.0;

  const ratio = publishedProductsCount / Math.max(totalProductsCount, 1);
  return Math.round((40 + ratio * 60) * 10) / 10;
};

// ─── Calculate Overall Score ──────────────────────────────────────────────────

const calculateMatchScore = (
  buyerRequest: any,
  artisan: any,
  artisanProducts: any[]
): { score: number; breakdown: MatchScoreBreakdown } => {
  const publishedProducts = artisanProducts.filter(p => p.status === 'published');
  
  const compatibility = scoreCompatibility(
    buyerRequest.product_category || '',
    artisan.craft_type,
    artisanProducts
  );
  
  const capacity = scoreCapacity(
    buyerRequest.quantity || 0,
    publishedProducts.length
  );

  // Extract prices from published products to compare
  const prices = publishedProducts
    .map(p => Number(p.price || p.minimum_price))
    .filter(p => !isNaN(p) && p > 0);
  const cheapestPrice = prices.length > 0 ? Math.min(...prices) : undefined;

  const minPrices = artisanProducts
    .map(p => Number(p.minimum_price))
    .filter(p => !isNaN(p) && p > 0);
  const maxPrices = artisanProducts
    .map(p => Number(p.maximum_price))
    .filter(p => !isNaN(p) && p > 0);

  const price = scorePrice(
    buyerRequest.budget_per_unit || 0,
    minPrices.length > 0 ? Math.min(...minPrices) : undefined,
    maxPrices.length > 0 ? Math.max(...maxPrices) : undefined,
    cheapestPrice
  );

  const location = scoreLocation(
    buyerRequest.location || '',
    artisan.state,
    artisan.district
  );

  const availability = scoreAvailability(
    publishedProducts.length,
    artisanProducts.length
  );

  const total = 
    compatibility * WEIGHTS.compatibility +
    capacity * WEIGHTS.capacity +
    price * WEIGHTS.price +
    location * WEIGHTS.location +
    availability * WEIGHTS.availability;

  const breakdown: MatchScoreBreakdown = {
    compatibility,
    capacity,
    price,
    location,
    availability,
    weights: WEIGHTS,
  };

  return {
    score: Math.round(total),
    breakdown
  };
};

// ─── Public Interface ─────────────────────────────────────────────────────────

export const matchArtisansToRequest = async (
  buyerRequest: any,
  artisans: any[],
  artisanProductsMap: Record<string, any[]>,
  maxResults: number = 10,
  includeBreakdown: boolean = true
): Promise<MatchingResponse> => {
  const scoredMatches: ArtisanMatchResult[] = [];

  for (const artisan of artisans) {
    const artisanId = artisan.id;
    const products = artisanProductsMap[artisanId] || [];

    const { score, breakdown } = calculateMatchScore(buyerRequest, artisan, products);
    if (score <= 0) continue; // Skip zero compatibility matches

    const published = products.filter(p => p.status === 'published');
    const prices = published.map(p => Number(p.price)).filter(p => !isNaN(p) && p > 0);
    const estimatedPrice = prices.length > 0 ? Math.min(...prices) : null;
    const capacityVal = published.length * 50;

    scoredMatches.push({
      artisan_id: artisanId,
      artisan_name: artisan.name || 'Unknown',
      craft_type: artisan.craft_type,
      region: artisan.district,
      state: artisan.state,
      match_score: score,
      score_breakdown: includeBreakdown ? breakdown : null,
      capacity: capacityVal > 0 ? capacityVal : null,
      estimated_price: estimatedPrice,
      availability: published.length > 0 ? 'Ready to produce' : 'No published products',
    });
  }

  // Sort by match score descending
  scoredMatches.sort((a, b) => b.match_score - a.match_score);
  const topMatches = scoredMatches.slice(0, maxResults);

  return {
    request_id: buyerRequest.id || '',
    product_category: buyerRequest.product_category || '',
    quantity_required: buyerRequest.quantity || 0,
    matches: topMatches,
    total_matches: topMatches.length,
    algorithm: 'weighted_score_v1',
  };
};
