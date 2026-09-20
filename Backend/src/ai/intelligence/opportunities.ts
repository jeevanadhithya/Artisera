export interface WholesaleOpportunity {
  id: string;
  buyerType: 'Boutique Retailer' | 'Corporate Gifting' | 'Export House' | 'Hotel & Hospitality';
  targetCategory: string;
  estimatedQuantity: number;
  budgetRange: string;
  requiredWithinDays: number;
  matchScore: number;
}

export const ACTIVE_SOURCING_LEADS: WholesaleOpportunity[] = [
  {
    id: 'lead-01',
    buyerType: 'Corporate Gifting',
    targetCategory: 'woodwork',
    estimatedQuantity: 250,
    budgetRange: '₹800 – ₹1,400 per unit',
    requiredWithinDays: 30,
    matchScore: 94,
  },
  {
    id: 'lead-02',
    buyerType: 'Boutique Retailer',
    targetCategory: 'textiles',
    estimatedQuantity: 50,
    budgetRange: '₹2,500 – ₹6,000 per unit',
    requiredWithinDays: 15,
    matchScore: 98,
  },
  {
    id: 'lead-03',
    buyerType: 'Export House',
    targetCategory: 'pottery',
    estimatedQuantity: 500,
    budgetRange: '₹500 – ₹1,200 per unit',
    requiredWithinDays: 45,
    matchScore: 89,
  },
  {
    id: 'lead-04',
    buyerType: 'Hotel & Hospitality',
    targetCategory: 'metalwork',
    estimatedQuantity: 120,
    budgetRange: '₹1,500 – ₹3,500 per unit',
    requiredWithinDays: 20,
    matchScore: 91,
  },
];

/**
 * Match an artisan craft product with active verified wholesale and corporate buyer leads.
 */
export function getMarketOpportunities(category?: string): WholesaleOpportunity[] {
  if (category) {
    const target = category.toLowerCase().trim();
    const matched = ACTIVE_SOURCING_LEADS.filter((l) =>
      l.targetCategory.toLowerCase().includes(target) || target.includes(l.targetCategory.toLowerCase())
    );
    if (matched.length > 0) return matched;
  }
  return ACTIVE_SOURCING_LEADS;
}
