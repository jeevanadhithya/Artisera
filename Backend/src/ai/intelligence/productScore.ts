export interface ProductScoreInput {
  title: string;
  description?: string;
  category?: string;
  material?: string;
  region?: string;
  price?: number;
  imageUrl?: string;
  giCertified?: boolean;
}

export interface ProductScoreResult {
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  breakdown: {
    storytellingScore: number; // 0 - 25
    visualQualityScore: number; // 0 - 25
    pricingAuthenticityScore: number; // 0 - 25
    marketReadinessScore: number; // 0 - 25
  };
  strengths: string[];
  improvements: string[];
}

/**
 * Evaluate product catalog completeness, heritage storytelling, visual appeal, and fair-pricing score.
 */
export function scoreProductListing(product: ProductScoreInput): ProductScoreResult {
  let storytelling = 10;
  let visual = 10;
  let pricing = 15;
  let readiness = 12;

  const strengths: string[] = [];
  const improvements: string[] = [];

  // Storytelling evaluation
  const desc = product.description || '';
  if (desc.length > 120) {
    storytelling += 10;
    strengths.push('Detailed artisan heritage narrative provided');
  } else if (desc.length > 40) {
    storytelling += 5;
  } else {
    improvements.push('Add a richer craft origin story or artisan biography');
  }

  if (product.giCertified) {
    storytelling += 5;
    strengths.push('Geographical Indication (GI) certified authenticity');
  }

  // Visual Quality
  if (product.imageUrl && product.imageUrl.startsWith('http')) {
    visual += 15;
    strengths.push('High-resolution product showcase image uploaded');
  } else {
    improvements.push('Process and upload a studio-quality enhanced image');
  }

  // Pricing Authenticity
  if (product.price && product.price >= 300) {
    pricing += 10;
    strengths.push('Price covers essential living wage floor standards');
  } else if (!product.price || product.price < 200) {
    improvements.push('Review price setting against living wage production costs');
  }

  // Market Readiness
  if (product.title && product.title.length >= 10 && product.category && product.material) {
    readiness += 13;
    strengths.push('Complete catalog metadata (category, material, craft title)');
  } else {
    improvements.push('Specify primary raw material and precise craft category');
  }

  const overallScore = Math.min(100, storytelling + visual + pricing + readiness);

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (overallScore >= 90) grade = 'A+';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else grade = 'D';

  return {
    overallScore,
    grade,
    breakdown: {
      storytellingScore: storytelling,
      visualQualityScore: visual,
      pricingAuthenticityScore: pricing,
      marketReadinessScore: readiness,
    },
    strengths,
    improvements,
  };
}
