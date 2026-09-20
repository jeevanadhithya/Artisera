import { findSimilarBenchmarks, SimilarProduct } from './benchmark';
import { generatePricingRecommendation, CostInputParams, PricingRecommendationResult } from './recommendation';
import { BENCHMARK_CATALOG, BenchmarkItem, getCategoryStats } from './marketData';

export interface PricingEngineInput {
  title: string;
  description?: string;
  category?: string;
  material?: string;
  region?: string;
  craftComplexity?: 'simple' | 'moderate' | 'intricate' | 'masterpiece';
  isGiTagged?: boolean;
  costInputs?: {
    rawMaterials?: number;
    laborHours?: number;
    hourlyWage?: number;
    packaging?: number;
    transport?: number;
    overhead?: number;
  };
}

export class PricingEngine {
  /**
   * Main calculation method: compute Fair-Trade market pricing and recommendations.
   */
  public static calculatePrice(input: PricingEngineInput): PricingRecommendationResult {
    // 1. Retrieve market benchmark comparables
    const comparables: SimilarProduct[] = findSimilarBenchmarks({
      title: input.title,
      description: input.description,
      category: input.category,
      material: input.material,
    });

    // 2. Prepare cost parameter object
    const packagingCost = input.costInputs?.packaging || 0;
    const overheadCost = (input.costInputs?.overhead || 30) + packagingCost;

    const costs: CostInputParams = {
      materialCost: input.costInputs?.rawMaterials,
      laborHours: input.costInputs?.laborHours,
      hourlyWage: input.costInputs?.hourlyWage,
      transportCost: input.costInputs?.transport,
      overheadCost,
      craftComplexity: input.craftComplexity,
      isGiTagged: input.isGiTagged,
    };

    // 3. Generate structured pricing recommendation
    return generatePricingRecommendation(
      {
        title: input.title,
        category: input.category,
        description: input.description,
        material: input.material,
      },
      costs,
      comparables
    );
  }

  /**
   * Get all available benchmark catalog items.
   */
  public static getBenchmarks(category?: string): BenchmarkItem[] {
    if (category) {
      const target = category.toLowerCase().trim();
      return BENCHMARK_CATALOG.filter((b) => b.category.toLowerCase().includes(target));
    }
    return BENCHMARK_CATALOG;
  }

  /**
   * Get category summary statistics.
   */
  public static getStats(category: string) {
    return getCategoryStats(category);
  }
}

export * from './marketData';
export * from './benchmark';
export * from './recommendation';
