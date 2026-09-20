import { getPool } from '../db';
import { evaluate, Marketplace } from '../marketplaceExport';
import { OwnershipError } from '../../types/errors';

export interface GuideMissingField {
  field: string;
  label: string;
  friendlyMessage: string;
  action: string;
}

export interface MarketplaceReadinessResult {
  marketplace: Marketplace;
  displayName: string;
  status: 'READY' | 'PARTIALLY_READY' | 'NOT_READY';
  readinessPercentage: number;
  missingFields: GuideMissingField[];
  warnings: string[];
  officialPortalUrl: string;
  exportFormatSupported: string[];
}

export interface ProfitCalculationResult {
  sellingPrice: number;
  floorCost: number;
  netProfit: number;
  profitMarginPct: number;
  breakdown: {
    materialCost: number;
    laborCompensation: number;
    hoursWorked: number;
    hourlyWageEarned: number;
    packagingCost: number;
    transportCost: number;
  };
  fairWageSatisfied: boolean;
  explanation: string;
}

export class CopilotToolRegistry {
  /**
   * Retrieves genuine product from PostgreSQL with strict artisan ownership check.
   * Never falls back to fictional or demo products.
   */
  public static async getCurrentProduct(
    userId?: string,
    productId?: string,
    userRole?: string
  ): Promise<any | null> {
    if (!productId) return null;

    const pool = getPool();
    const prodRes = await pool.query('SELECT * FROM public.products WHERE id = $1', [productId]);
    if (prodRes.rows.length === 0) {
      return null;
    }

    const product = prodRes.rows[0];

    // Ownership Verification
    if (userId && userRole !== 'admin') {
      const artRes = await pool.query('SELECT id FROM public.artisans WHERE user_id = $1', [userId]);
      if (artRes.rows.length === 0) {
        throw new OwnershipError('product');
      }
      const artisan = artRes.rows[0];
      if (product.artisan_id !== artisan.id) {
        throw new OwnershipError('product');
      }
    }

    return product;
  }

  /**
   * Retrieves artisan profile by artisan_id or user_id
   */
  public static async getArtisan(artisanIdOrUserId: string): Promise<any | null> {
    const pool = getPool();
    const res = await pool.query(
      'SELECT * FROM public.artisans WHERE id = $1 OR user_id = $1 LIMIT 1',
      [artisanIdOrUserId]
    );
    return res.rows[0] || null;
  }

  /**
   * Evaluates genuine marketplace readiness using the verified marketplaceExport adapter layer.
   */
  public static evaluateMarketplaceReadiness(
    product: any,
    artisan: any,
    marketplace: Marketplace
  ): MarketplaceReadinessResult {
    const assessed = evaluate(product, artisan, marketplace);

    const friendlyLabels: Record<string, string> = {
      sku: 'Add product SKU',
      title: 'Add a clear product title',
      description: 'Add product description',
      category: 'Select product category',
      price: 'Add selling price',
      mrp: 'Add MRP',
      stock_quantity: 'Add available stock quantity',
      images: 'Add product photos',
      brand: 'Add brand or artisan name',
      dimensions: 'Add package dimensions (L × W × H in cm)',
      weight: 'Add product weight (grams or kg)',
      hsn_code: 'Add HSN code',
      gst_rate: 'Add GST tax rate',
      country_of_origin: 'Set country of origin (India)',
      manufacturer_details: 'Add manufacturer or artisan workshop details',
      shipping_details: 'Add shipping & fulfillment details',
    };

    const missingFields: GuideMissingField[] = assessed.missing_fields.map(item => ({
      field: item.field,
      label: item.label,
      friendlyMessage: friendlyLabels[item.field] || `Add ${item.label.toLowerCase()}`,
      action: `fix_${item.field}`,
    }));

    const officialUrls: Record<Marketplace, string> = {
      amazon: 'https://sell.amazon.in/grow-your-business/amazon-karigar',
      flipkart: 'https://seller.flipkart.com/sell-online/samarth',
      gem: 'https://gem.gov.in',
      ondc: 'https://ondc.org',
      meesho: 'https://supplier.meesho.com',
      generic: 'https://artisera.in',
    };

    const displayNames: Record<Marketplace, string> = {
      amazon: 'Amazon Karigar',
      flipkart: 'Flipkart Samarth',
      gem: 'GeM (Government e-Marketplace)',
      ondc: 'ONDC (Beckn Open Network)',
      meesho: 'Meesho Supplier',
      generic: 'Generic Marketplace',
    };

    return {
      marketplace,
      displayName: displayNames[marketplace],
      status: assessed.status,
      readinessPercentage: assessed.readiness,
      missingFields,
      warnings: assessed.warnings,
      officialPortalUrl: officialUrls[marketplace],
      exportFormatSupported: assessed.export_formats,
    };
  }

  /**
   * Calculates transparent profit and fair living wage floor from genuine product or inputs.
   */
  public static calculateProfit(
    price: number,
    costInputs?: {
      raw_materials?: number;
      labor_hours?: number;
      hourly_wage?: number;
      packaging?: number;
      transport?: number;
    }
  ): ProfitCalculationResult {
    const rawMaterials = costInputs?.raw_materials ?? 90;
    const laborHours = costInputs?.labor_hours ?? 3.5;
    const hourlyWage = costInputs?.hourly_wage ?? 130;
    const packaging = costInputs?.packaging ?? 40;
    const transport = costInputs?.transport ?? 30;

    const laborComp = laborHours * hourlyWage;
    const floorCost = Math.round(rawMaterials + laborComp + packaging + transport);
    const netProfit = Math.round(price - floorCost);
    const profitMarginPct = price > 0 ? Math.round((netProfit / price) * 100) : 0;
    const fairWageSatisfied = price >= floorCost;

    let explanation = '';
    if (netProfit >= 0) {
      explanation = `At ₹${price.toFixed(0)}, your living wage floor cost is ₹${floorCost}. You earn ₹${netProfit} net profit (${profitMarginPct}% margin) with fair labor compensation.`;
    } else {
      explanation = `Price ₹${price.toFixed(0)} is below your production floor cost of ₹${floorCost}. Increase price by at least ₹${Math.abs(netProfit)} to ensure fair artisan wages.`;
    }

    return {
      sellingPrice: price,
      floorCost,
      netProfit,
      profitMarginPct,
      breakdown: {
        materialCost: rawMaterials,
        laborCompensation: laborComp,
        hoursWorked: laborHours,
        hourlyWageEarned: hourlyWage,
        packagingCost: packaging,
        transportCost: transport,
      },
      fairWageSatisfied,
      explanation,
    };
  }

  /**
   * Calculates break-even units.
   */
  public static calculateBreakEven(fixedCosts: number, unitPrice: number, unitVariableCost: number): { breakEvenUnits: number; contributionMargin: number; explanation: string } {
    const cm = unitPrice - unitVariableCost;
    if (cm <= 0) {
      return {
        breakEvenUnits: 0,
        contributionMargin: cm,
        explanation: 'Unit price is less than or equal to variable cost. You cannot break even at this price.',
      };
    }
    const units = Math.ceil(fixedCosts / cm);
    return {
      breakEvenUnits: units,
      contributionMargin: cm,
      explanation: `With fixed monthly overheads of ₹${fixedCosts}, you need to sell ${units} units at ₹${unitPrice} to break even.`,
    };
  }
}
