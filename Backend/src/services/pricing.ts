import { ValidationError } from '../types/errors';

export interface PricingRequest {
  material_cost: number;
  labor_cost: number;
  production_cost: number;
  market_price_low?: number | null;
  market_price_high?: number | null;
  demand_score?: number | null;
  region?: string | null;
  category?: string | null;
}

export interface PricingResponse {
  recommended_price: number;
  minimum_price: number;
  maximum_price: number;
  estimated_margin: number;
  margin_percentage: number;
  demand: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  explanation: string;
}

const CATEGORY_MARKUP: Record<string, number> = {
  'textile': 0.40,
  'textiles': 0.40,
  'pottery': 0.45,
  'ceramics': 0.45,
  'bamboo': 0.38,
  'bamboo craft': 0.38,
  'wood': 0.35,
  'woodwork': 0.35,
  'jewelry': 0.50,
  'jewellery': 0.50,
  'leather': 0.40,
  'painting': 0.55,
  'embroidery': 0.45,
  'metal': 0.35,
  'stone': 0.30,
  'home decor': 0.42,
  'toy': 0.38,
  'toys': 0.38,
  'default': 0.35,
};

const DEMAND_ADJUSTMENTS = [
  { threshold: 80, multiplier: 1.10 },
  { threshold: 60, multiplier: 1.05 },
  { threshold: 40, multiplier: 1.00 },
  { threshold: 20, multiplier: 0.95 },
  { threshold: 0,  multiplier: 0.90 },
];

const REGION_PREMIUM: Record<string, number> = {
  'rajasthan': 1.08,
  'kashmir': 1.15,
  'varanasi': 1.10,
  'assam': 1.05,
  'manipur': 1.05,
  'west bengal': 1.05,
  'gujarat': 1.06,
  'odisha': 1.04,
  'default': 1.00,
};

const getMarkup = (category?: string | null): number => {
  if (!category) return CATEGORY_MARKUP.default;
  const catLower = category.toLowerCase().trim();
  for (const [key, rate] of Object.entries(CATEGORY_MARKUP)) {
    if (key === 'default') continue;
    if (catLower.includes(key) || key.includes(catLower)) {
      return rate;
    }
  }
  return CATEGORY_MARKUP.default;
};

const getDemandAdjustment = (demandScore?: number | null): number => {
  if (demandScore === undefined || demandScore === null) return 1.00;
  for (const adj of DEMAND_ADJUSTMENTS) {
    if (demandScore >= adj.threshold) {
      return adj.multiplier;
    }
  }
  return 0.90;
};

const getDemandLevel = (demandScore?: number | null): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (demandScore === undefined || demandScore === null) return 'MEDIUM';
  if (demandScore >= 80) return 'HIGH';
  if (demandScore >= 50) return 'MEDIUM';
  return 'LOW';
};

const getRegionPremium = (region?: string | null): number => {
  if (!region) return REGION_PREMIUM.default;
  const regionLower = region.toLowerCase().trim();
  for (const [key, premium] of Object.entries(REGION_PREMIUM)) {
    if (key === 'default') continue;
    if (regionLower.includes(key)) {
      return premium;
    }
  }
  return REGION_PREMIUM.default;
};

const buildExplanation = (
  costBase: number,
  markup: number,
  demandAdj: number,
  regionPremium: number,
  marketClampApplied: boolean,
  margin: number
): string => {
  const parts = [
    `Base cost: ₹${costBase.toFixed(0)}.`,
    `Markup applied: ${(markup * 100).toFixed(0)}% (category-based).`,
  ];
  if (demandAdj !== 1.00) {
    const direction = demandAdj > 1 ? 'increased' : 'reduced';
    parts.push(`Demand ${direction} price by ${Math.abs((demandAdj - 1) * 100).toFixed(0)}%.`);
  }
  if (regionPremium !== 1.00) {
    parts.push(`Regional premium: ${((regionPremium - 1) * 100).toFixed(0)}% applied.`);
  }
  if (marketClampApplied) {
    parts.push('Price adjusted to fit within market range.');
  }
  parts.push(`Estimated profit margin: ₹${margin.toFixed(0)} per unit.`);
  return parts.join(' ');
};

export const calculatePrice = (request: PricingRequest): PricingResponse => {
  // Step 1: Cost base
  let costBase = request.material_cost + request.labor_cost + request.production_cost;
  if (costBase <= 0) {
    costBase = 1.0; // Prevent divide by zero
  }

  // Step 2: Apply category markup
  const markup = getMarkup(request.category);
  let basePrice = costBase * (1 + markup);

  // Step 3: Apply demand adjustment
  const demandAdj = getDemandAdjustment(request.demand_score);
  let adjustedPrice = basePrice * demandAdj;

  // Step 4: Apply regional premium
  const regionPremium = getRegionPremium(request.region);
  adjustedPrice *= regionPremium;

  // Step 5: Calculate min/max
  let minPrice = costBase * 1.10; // At least 10% above cost
  let maxPrice = adjustedPrice * 1.25;

  // Step 6: Clamp to market range if provided
  let marketClampApplied = false;
  if (
    request.market_price_low !== undefined &&
    request.market_price_low !== null &&
    request.market_price_high !== undefined &&
    request.market_price_high !== null
  ) {
    const marketMid = (request.market_price_low + request.market_price_high) / 2;
    // Blend our calculation with market data (60/40 weighting)
    adjustedPrice = (adjustedPrice * 0.6) + (marketMid * 0.4);
    // Clamp to market bounds with some tolerance
    adjustedPrice = Math.max(
      request.market_price_low * 0.95,
      Math.min(adjustedPrice, request.market_price_high * 1.05)
    );
    minPrice = Math.max(minPrice, request.market_price_low * 0.90);
    maxPrice = Math.min(maxPrice, request.market_price_high * 1.10);
    marketClampApplied = true;
  }

  // Ensure sensible ordering
  const recommended = Math.round(adjustedPrice);
  minPrice = Math.round(Math.min(minPrice, recommended * 0.92));
  maxPrice = Math.round(Math.max(maxPrice, recommended * 1.08));

  // Margin & confidence
  const margin = recommended - costBase;
  const marginPct = recommended > 0 ? (margin / recommended) * 100 : 0;

  // Confidence calculation
  const inputsCount = [
    request.demand_score !== undefined && request.demand_score !== null,
    request.market_price_low !== undefined && request.market_price_low !== null,
    request.market_price_high !== undefined && request.market_price_high !== null,
    !!request.region,
    !!request.category,
  ].filter(Boolean).length;
  
  const confidence = Math.min(0.55 + (inputsCount * 0.09), 0.95);

  const explanation = buildExplanation(
    costBase,
    markup,
    demandAdj,
    regionPremium,
    marketClampApplied,
    margin
  );

  return {
    recommended_price: recommended,
    minimum_price: minPrice,
    maximum_price: maxPrice,
    estimated_margin: Math.round(margin),
    margin_percentage: Math.round(marginPct * 10) / 10,
    demand: getDemandLevel(request.demand_score),
    confidence: Math.round(confidence * 100) / 100,
    explanation,
  };
};
