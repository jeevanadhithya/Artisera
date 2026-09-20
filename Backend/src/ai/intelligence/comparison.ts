import { findSimilarBenchmarks, SimilarProduct } from '../pricing/benchmark';

export interface ComparisonInput {
  title: string;
  category?: string;
  price: number;
  description?: string;
  material?: string;
}

export interface MarketComparisonResult {
  productTitle: string;
  productPrice: number;
  priceDeltaPercent: number;
  marketPosition: 'below_average' | 'at_market' | 'premium';
  topCompetitors: SimilarProduct[];
  insights: string[];
}

/**
 * Compare artisan craft against live benchmark competitor listings.
 */
export function compareProductToMarket(input: ComparisonInput): MarketComparisonResult {
  const competitors = findSimilarBenchmarks({
    title: input.title,
    category: input.category,
    description: input.description,
    material: input.material,
  }, 4);

  const avgCompetitorPrice =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + c.sellingPrice, 0) / competitors.length
      : input.price;

  const delta = Math.round(((input.price - avgCompetitorPrice) / avgCompetitorPrice) * 100);

  let marketPosition: 'below_average' | 'at_market' | 'premium' = 'at_market';
  if (delta < -15) marketPosition = 'below_average';
  else if (delta > 15) marketPosition = 'premium';

  const insights: string[] = [
    `Product is priced at ₹${input.price.toLocaleString('en-IN')}, which is ${Math.abs(delta)}% ${delta >= 0 ? 'higher' : 'lower'} than comparable marketplace benchmarks (avg: ₹${Math.round(avgCompetitorPrice).toLocaleString('en-IN')}).`,
  ];

  if (marketPosition === 'below_average') {
    insights.push('You may be underpricing your handcrafted work relative to FabIndia & Amazon Karigar standards.');
  } else if (marketPosition === 'premium') {
    insights.push('Ensure unique craftsmanship details and GI heritage story are highlighted to support the premium price tag.');
  } else {
    insights.push('Your pricing is well-aligned with active direct-to-consumer artisanal market averages.');
  }

  return {
    productTitle: input.title,
    productPrice: input.price,
    priceDeltaPercent: delta,
    marketPosition,
    topCompetitors: competitors,
    insights,
  };
}
