import { SimilarProduct } from './benchmark';
import { getCategoryStats } from './marketData';

export interface CostInputParams {
  materialCost?: number;
  laborHours?: number;
  hourlyWage?: number; // default living wage standard ₹140/hr
  transportCost?: number;
  overheadCost?: number;
  craftComplexity?: 'simple' | 'moderate' | 'intricate' | 'masterpiece';
  isGiTagged?: boolean;
}

export interface PricingRecommendationResult {
  costFloor: number;
  marketRange: {
    min: number;
    max: number;
  };
  recommendedRange: {
    min: number;
    max: number;
  };
  suggestedPrice: number;
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0.0 to 1.0
  reasoning: string[];
  comparableProducts: SimilarProduct[];
  marketPosition: 'budget' | 'mid-range' | 'premium' | 'luxury';
  breakdown: {
    materialCost: number;
    laborCost: number;
    transportCost: number;
    overheadCost: number;
    fairWageMargin: number;
  };
}

/**
 * Compute Fair-Trade Living Wage pricing recommendation.
 */
export function generatePricingRecommendation(
  product: {
    title: string;
    category?: string;
    description?: string;
    material?: string;
  },
  costs: CostInputParams,
  comparables: SimilarProduct[]
): PricingRecommendationResult {
  const materials = Math.max(0, costs.materialCost || 150);
  const hours = Math.max(0, costs.laborHours || 3);
  const wageRate = Math.max(120, costs.hourlyWage || 140); // Standard living wage floor in India
  const transport = Math.max(0, costs.transportCost || 40);
  const overhead = Math.max(0, costs.overheadCost || 30);

  const laborCost = hours * wageRate;
  const costFloor = Math.round(materials + laborCost + transport + overhead);

  // Complexity & Provenance Multiplier
  let complexityMultiplier = 1.25;
  if (costs.craftComplexity === 'simple') complexityMultiplier = 1.15;
  else if (costs.craftComplexity === 'intricate') complexityMultiplier = 1.45;
  else if (costs.craftComplexity === 'masterpiece') complexityMultiplier = 1.75;

  if (costs.isGiTagged) {
    complexityMultiplier += 0.20; // 20% geographical indication origin premium
  }

  // Calculate Market Anchor from Comparables
  const categoryStats = getCategoryStats(product.category || 'textiles');
  let benchmarkAvg = categoryStats.avgPrice;

  if (comparables.length > 0) {
    const totalWeightedPrice = comparables.reduce(
      (acc, c) => acc + c.sellingPrice * c.similarityScore,
      0
    );
    const totalWeights = comparables.reduce((acc, c) => acc + c.similarityScore, 0);
    if (totalWeights > 0) {
      benchmarkAvg = Math.round(totalWeightedPrice / totalWeights);
    }
  }

  // Suggested Price is the maximum between (costFloor * multiplier) and market anchor
  let rawSuggested = Math.max(
    costFloor * complexityMultiplier,
    Math.round(benchmarkAvg * 0.90)
  );

  // Guarantee minimum 20% profit margin over cost floor
  const minFairPrice = Math.round(costFloor * 1.20);
  const suggestedPrice = Math.max(minFairPrice, Math.round(rawSuggested));

  const rangeLow = Math.round(Math.max(costFloor * 1.10, suggestedPrice * 0.88));
  const rangeHigh = Math.round(suggestedPrice * 1.22);

  // Market Range
  const marketMin = Math.min(...comparables.map((c) => c.sellingPrice), categoryStats.minPrice);
  const marketMax = Math.max(...comparables.map((c) => c.sellingPrice), categoryStats.maxPrice);

  // Determine Confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  let confidenceScore = 0.85;

  if (comparables.length >= 3 && comparables[0]?.similarityScore >= 0.70) {
    confidence = 'high';
    confidenceScore = 0.92;
  } else if (comparables.length === 0) {
    confidence = 'low';
    confidenceScore = 0.65;
  }

  // Determine Market Position
  let marketPosition: 'budget' | 'mid-range' | 'premium' | 'luxury' = 'mid-range';
  if (suggestedPrice > 10000 || costs.craftComplexity === 'masterpiece') {
    marketPosition = 'luxury';
  } else if (suggestedPrice > 2500 || costs.isGiTagged) {
    marketPosition = 'premium';
  } else if (suggestedPrice < 600) {
    marketPosition = 'budget';
  }

  // Build Reasoning Explanations
  const reasoning: string[] = [
    `Guarantees living wage floor of ₹${costFloor.toLocaleString('en-IN')} based on ${hours}h labor at ₹${wageRate}/hr + raw materials & transport.`,
    `Anchored against ${comparables.length} verified listings across FabIndia, Amazon Karigar, Etsy India, and Okhai (category avg: ₹${categoryStats.avgPrice.toLocaleString('en-IN')}).`,
    `Provides artisan net operating profit margin of ${(Math.round(((suggestedPrice - costFloor) / suggestedPrice) * 100))}% above production costs.`,
  ];

  if (costs.isGiTagged) {
    reasoning.push(`Includes +20% verified Geographical Indication (GI) heritage provenance premium.`);
  }

  return {
    costFloor,
    marketRange: {
      min: marketMin,
      max: marketMax,
    },
    recommendedRange: {
      min: rangeLow,
      max: rangeHigh,
    },
    suggestedPrice,
    confidence,
    confidenceScore,
    reasoning,
    comparableProducts: comparables,
    marketPosition,
    breakdown: {
      materialCost: materials,
      laborCost,
      transportCost: transport,
      overheadCost: overhead,
      fairWageMargin: suggestedPrice - costFloor,
    },
  };
}
