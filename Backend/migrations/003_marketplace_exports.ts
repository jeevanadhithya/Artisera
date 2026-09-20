import fs from 'fs';
import path from 'path';
import { getPool } from '../src/services/db';

interface VerifiedTemplate {
  marketplace: string;
  template_name: string;
  category: string;
  version: string;
  source_url: string;
  source_type: string;
  headers: string[];
  field_mappings: Record<string, unknown>;
  validation_rules: Record<string, unknown>;
  active: boolean;
}

const verifiedTemplates: VerifiedTemplate[] = [
  {
    marketplace: 'amazon',
    template_name: 'Amazon India Listing Loader - Handicrafts',
    category: 'Home & Kitchen / Handicrafts',
    version: 'v1.0.0-in',
    source_url: 'https://sell.amazon.in/sell-online/list-your-products',
    source_type: 'official_reference',
    headers: [
      'item_sku', 'item_name', 'external_product_id', 'external_product_id_type',
      'brand_name', 'standard_price', 'quantity', 'main_image_url', 'other_image_url1',
      'product_description', 'bullet_point1', 'bullet_point2', 'bullet_point3',
      'generic_keywords', 'country_of_origin', 'manufacturer', 'model_number'
    ],
    field_mappings: {
      sku: 'item_sku',
      title: 'item_name',
      barcode: 'external_product_id',
      brand: 'brand_name',
      price: 'standard_price',
      stock_quantity: 'quantity',
      images: 'main_image_url',
      description: 'product_description',
      bullet_points: 'bullet_point1',
      tags: 'generic_keywords',
      country_of_origin: 'country_of_origin',
      manufacturer: 'manufacturer',
      model_number: 'model_number'
    },
    validation_rules: {
      required: ['item_sku', 'item_name', 'standard_price', 'quantity', 'main_image_url'],
      max_lengths: { item_name: 200 },
      rules: ['Title <= 200 chars', 'Valid SKU', 'Main image present']
    },
    active: true,
  },
  {
    marketplace: 'flipkart',
    template_name: 'Flipkart Standard Listing Sheet',
    category: 'Home Furnishing / Handicrafts',
    version: 'v1.0.0-fk',
    source_url: 'https://seller.flipkart.com/api-docs/listing-api-docs/LMAPIFtp.html',
    source_type: 'official_reference',
    headers: [
      'Seller SKU ID', 'MRP', 'Selling Price', 'Stock Count', 'Procurement SLA',
      'Product Name', 'Product Description', 'Product Image URL', 'HSN',
      'Country of Origin', 'Manufacturer Details'
    ],
    field_mappings: {
      sku: 'Seller SKU ID',
      mrp: 'MRP',
      price: 'Selling Price',
      stock_quantity: 'Stock Count',
      lead_time_days: 'Procurement SLA',
      title: 'Product Name',
      description: 'Product Description',
      images: 'Product Image URL',
      hsn_code: 'HSN',
      country_of_origin: 'Country of Origin',
      manufacturer_details: 'Manufacturer Details'
    },
    validation_rules: {
      required: ['Seller SKU ID', 'MRP', 'Selling Price', 'Stock Count', 'HSN', 'Country of Origin', 'Manufacturer Details'],
      rules: ['Selling Price <= MRP', 'HSN mandatory', 'Manufacturer details mandatory']
    },
    active: true,
  },
  {
    marketplace: 'gem',
    template_name: 'GeM Product Catalogue Specification',
    category: 'Handicrafts & Handlooms',
    version: 'v1.0.0-gem',
    source_url: 'https://assets-bg.gem.gov.in/resources/pdf/seller-user-manual.pdf',
    source_type: 'official_reference',
    headers: [
      'Product ID', 'Product Name', 'Category', 'Selling Price', 'MRP', 'HSN Code',
      'GST Rate', 'Stock Quantity', 'Manufacturer Details', 'Certifications',
      'Technical Specifications', 'Lead Time Days'
    ],
    field_mappings: {
      product_id: 'Product ID',
      title: 'Product Name',
      category: 'Category',
      price: 'Selling Price',
      mrp: 'MRP',
      hsn_code: 'HSN Code',
      gst_rate: 'GST Rate',
      stock_quantity: 'Stock Quantity',
      manufacturer_details: 'Manufacturer Details',
      certifications: 'Certifications',
      specifications: 'Technical Specifications',
      lead_time_days: 'Lead Time Days'
    },
    validation_rules: {
      required: ['Product Name', 'Selling Price', 'HSN Code', 'GST Rate', 'Manufacturer Details'],
      rules: ['HSN mandatory', 'GST rate mandatory', 'Government listing disclaimer']
    },
    active: true,
  },
  {
    marketplace: 'ondc',
    template_name: 'ONDC Beckn Retail Catalog Schema',
    category: 'Retail / Home & Decor',
    version: 'v1.2.0-ondc',
    source_url: 'https://www.ondc.org/pages/resources-tech.html',
    source_type: 'official_reference',
    headers: [
      'item.id', 'item.descriptor.name', 'item.descriptor.short_desc', 'item.descriptor.long_desc',
      'item.descriptor.images', 'item.price.currency', 'item.price.value',
      'item.quantity.available.count', 'item.category_id', 'item.tags',
      'seller.id', 'seller.name', 'compliance.hsn', 'compliance.gst_rate', 'compliance.country_of_origin'
    ],
    field_mappings: {
      sku: 'item.id',
      title: 'item.descriptor.name',
      short_description: 'item.descriptor.short_desc',
      description: 'item.descriptor.long_desc',
      images: 'item.descriptor.images',
      price: 'item.price.value',
      stock_quantity: 'item.quantity.available.count',
      category: 'item.category_id',
      tags: 'item.tags',
      seller_id: 'seller.id',
      artisan_name: 'seller.name',
      hsn_code: 'compliance.hsn',
      gst_rate: 'compliance.gst_rate',
      country_of_origin: 'compliance.country_of_origin'
    },
    validation_rules: {
      required: ['item.id', 'item.descriptor.name', 'item.price.value', 'compliance.country_of_origin', 'fulfillment_details'],
      rules: ['Beckn catalog format only', 'Network Participant authorization required for live publish']
    },
    active: true,
  },
  {
    marketplace: 'meesho',
    template_name: 'Meesho Supplier Listing Specification',
    category: 'Ethnic Wear & Handcrafted Goods',
    version: 'v1.0.0-meesho',
    source_url: 'https://supplier.meesho.com',
    source_type: 'official_reference',
    headers: [
      'Product Title', 'Product Description', 'Price', 'MRP', 'GST', 'HSN',
      'Color', 'Fabric/Material', 'Weight', 'Inventory', 'Country of Origin'
    ],
    field_mappings: {
      title: 'Product Title',
      description: 'Product Description',
      price: 'Price',
      mrp: 'MRP',
      gst_rate: 'GST',
      hsn_code: 'HSN',
      color: 'Color',
      material: 'Fabric/Material',
      weight: 'Weight',
      stock_quantity: 'Inventory',
      country_of_origin: 'Country of Origin'
    },
    validation_rules: {
      required: ['Product Title', 'Price', 'Inventory'],
      rules: ['Needs marketplace template confirmation before live upload']
    },
    active: true,
  },
  {
    marketplace: 'generic',
    template_name: 'Artisera Canonical Product Interchange Schema',
    category: 'All Handicrafts & Handloom',
    version: 'v1.0.0-canonical',
    source_url: 'Artisera canonical schema',
    source_type: 'official_reference',
    headers: [
      'product_id', 'sku', 'title', 'short_title', 'description', 'category',
      'brand', 'price', 'mrp', 'stock_quantity', 'hsn_code', 'gst_rate',
      'country_of_origin', 'material', 'specifications'
    ],
    field_mappings: {},
    validation_rules: {
      required: ['sku', 'title', 'description', 'category', 'price', 'stock_quantity', 'images']
    },
    active: true,
  }
];

async function run() {
  const pool = getPool();
  console.log('Applying 003_marketplace_exports.sql migration...');
  const sql = fs.readFileSync(path.join(__dirname, '003_marketplace_exports.sql'), 'utf8');
  await pool.query(sql);
  console.log('Marketplace export schema migration applied successfully.');

  console.log('Seeding officially verified marketplace templates...');
  let inserted = 0;
  for (const t of verifiedTemplates) {
    const checkRes = await pool.query(
      'SELECT id FROM public.marketplace_templates WHERE marketplace = $1 AND version = $2;',
      [t.marketplace, t.version]
    );

    if (checkRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO public.marketplace_templates
          (marketplace, template_name, category, version, source_url, source_type, headers, field_mappings, validation_rules, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [
          t.marketplace,
          t.template_name,
          t.category,
          t.version,
          t.source_url,
          t.source_type,
          JSON.stringify(t.headers),
          JSON.stringify(t.field_mappings),
          JSON.stringify(t.validation_rules),
          t.active
        ]
      );
      inserted++;
      console.log(`  + Seeded template: ${t.marketplace} (${t.version})`);
    } else {
      console.log(`  - Template preserved: ${t.marketplace} (${t.version}) already exists`);
    }
  }

  console.log(`Seeding complete. ${inserted} new templates inserted (historical versions preserved).`);
  await pool.end();
}

run().catch(error => {
  console.error('Marketplace migration failed:', error);
  process.exit(1);
});
