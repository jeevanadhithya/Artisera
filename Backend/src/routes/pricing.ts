import { Router, Request, Response, NextFunction } from 'express';
import { calculatePrice, getBenchmarkCompetitors, BENCHMARK_CATALOG, PricingRequest } from '../services/pricing';

const router = Router();
const success = (data: any) => ({ success: true, data });

/**
 * POST /api/pricing/recommend
 * Calculate Fair Living Wage Price Recommendation with ML Competitor Benchmarks
 */
router.post('/recommend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      material_cost,
      labor_cost,
      production_cost,
      labor_hours,
      hourly_rate,
      transport_cost,
      overhead_cost,
      market_price_low,
      market_price_high,
      demand_score,
      region,
      category,
      title,
      description,
    } = req.body || {};

    const requestData: PricingRequest = {
      material_cost: Number(material_cost) || 0,
      labor_cost: Number(labor_cost) || 0,
      production_cost: Number(production_cost) || 0,
      labor_hours: Number(labor_hours) || 0,
      hourly_rate: Number(hourly_rate) || 0,
      transport_cost: Number(transport_cost) || 0,
      overhead_cost: Number(overhead_cost) || 0,
      market_price_low: market_price_low ? Number(market_price_low) : null,
      market_price_high: market_price_high ? Number(market_price_high) : null,
      demand_score: demand_score ? Number(demand_score) : null,
      region: region || 'Tamil Nadu',
      category: category || 'Textiles',
      title,
      description,
    };

    const result = calculatePrice(requestData);

    res.status(200).json(success({
      ...result,
      message: 'Fair living wage pricing calculated using Artisera ML Benchmark Model.',
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pricing/benchmarks
 * Retrieve competitor benchmark products from Amazon Karigar, FabIndia, Etsy India, Okhai
 */
router.get('/benchmarks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const benchmarks = getBenchmarkCompetitors(category);

    res.status(200).json(success({
      count: benchmarks.length,
      category: category || 'all',
      benchmarks: category ? benchmarks : BENCHMARK_CATALOG,
      platforms: ['Amazon Karigar', 'FabIndia', 'Etsy India', 'Okhai'],
      message: 'Competitor benchmark catalog retrieved successfully.',
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pricing/health
 * ML Pricing Engine Health & Status
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json(success({
    service: 'artisera-ml-pricing-engine',
    status: 'online',
    version: '2.0.0',
    capabilities: [
      'Cost-Floor Living Wage Calculation (₹120-150/hr)',
      'Benchmark Competitor Embeddings (Amazon Karigar, FabIndia, Etsy India, Okhai)',
      'Regional Provenance & GI Tag Multipliers',
      'Wholesale (82%) & Global Export (145%) Tier Synthesizer'
    ],
  }));
});

export default router;
