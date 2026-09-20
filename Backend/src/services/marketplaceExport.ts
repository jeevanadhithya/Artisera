import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type Marketplace = 'amazon' | 'flipkart' | 'gem' | 'ondc' | 'meesho' | 'generic';
type Issue = { field: string; label: string; required: boolean; message?: string };
type Result = { marketplace: Marketplace; status: 'READY' | 'PARTIALLY_READY' | 'NOT_READY'; readiness: number; missing_fields: Issue[]; warnings: string[]; errors: string[]; mapped_data: Record<string, unknown>; export_formats: string[]; template_version: string };

const sources: Record<Marketplace, string> = {
  amazon: 'https://sell.amazon.in/sell-online/list-your-products',
  flipkart: 'https://seller.flipkart.com/api-docs/listing-api-docs/LMAPIFtp.html',
  gem: 'https://assets-bg.gem.gov.in/resources/pdf/seller-user-manual.pdf',
  ondc: 'https://www.ondc.org/pages/resources-tech.html',
  meesho: 'Needs marketplace template confirmation',
  generic: 'Artisera canonical schema',
};

const text = (v: unknown) => (v == null ? '' : String(v).trim());
const number = (v: unknown) => Number(v || 0);
const list = (v: unknown): string[] => Array.isArray(v) ? v.map(text).filter(Boolean) : text(v).split(',').map(s => s.trim()).filter(Boolean);
const imageUrls = (p: any) => [p.selected_image_url, p.primary_image_url, p.enhanced_image_url, p.image_url, p.original_image_url].filter((v, i, a) => text(v) && a.indexOf(v) === i);

/** Canonical view: adapters read existing Artisera fields only and never invent compliance data. */
export const canonicalProduct = (product: any, artisan?: any) => ({
  product_id: product.id, seller_id: artisan?.user_id || product.artisan_id, sku: text(product.sku),
  title: text(product.name || product.title), short_title: text(product.short_title), description: text(product.description_en || product.description),
  short_description: text(product.short_description), bullet_points: list(product.bullet_points), category: text(product.category), subcategory: text(product.subcategory),
  product_type: text(product.product_type), brand: text(product.brand), manufacturer: text(product.manufacturer), artisan_name: text(artisan?.name),
  craft_type: text(product.craft_type || artisan?.craft_type), craft_story: text(product.craft_story || artisan?.craft_story), material: list(product.material),
  color: list(product.color), pattern: list(product.pattern), style: list(product.style), dimensions: product.dimensions || null, weight: product.weight || product.package_weight || null,
  care_instructions: list(product.care_instructions), country_of_origin: text(product.country_of_origin), state_of_origin: text(product.region || artisan?.state), district_of_origin: text(product.district || artisan?.district),
  price: number(product.price), mrp: number(product.mrp), wholesale_price: number(product.wholesale_price), currency: text(product.currency) || 'INR',
  stock_quantity: product.stock_quantity ?? product.stock ?? null, minimum_order_quantity: product.minimum_order_quantity ?? null, lead_time_days: product.lead_time_days ?? null,
  hsn_code: text(product.hsn_code), gst_rate: product.gst_rate ?? null, barcode: text(product.barcode || product.gtin || product.ean || product.upc), model_number: text(product.model_number),
  images: imageUrls(product), video_urls: list(product.video_urls), tags: list(product.keywords || product.tags), seo_keywords: list(product.seo_keywords), search_terms: list(product.search_terms),
  features: list(product.features), specifications: product.specifications || {}, variants: product.variants || [], packaging_details: product.packaging_details || null,
  shipping_details: product.shipping_details || null, warranty: product.warranty || null, certifications: list(product.certifications),
  manufacturer_details: product.manufacturer_details || null, packer_details: product.packer_details || null, importer_details: product.importer_details || null,
  created_at: product.created_at, updated_at: product.updated_at,
});

const requirement = (p: any, key: keyof ReturnType<typeof canonicalProduct>, label: string, required = true): Issue | null => {
  const value: any = p[key];
  const empty = value == null || value === '' || (Array.isArray(value) && !value.length) || (typeof value === 'number' && value <= 0);
  return empty ? { field: String(key), label, required, message: `Add ${label.toLowerCase()}.` } : null;
};
const result = (marketplace: Marketplace, p: any, required: Array<Issue | null>, warnings: string[], mapped_data: Record<string, unknown>, formats: string[]): Result => {
  const missing_fields = required.filter(Boolean) as Issue[];
  const filled = required.length - missing_fields.length;
  const readiness = required.length ? Math.round((filled / required.length) * 100) : 100;
  return { marketplace, readiness, status: readiness === 100 ? 'READY' : readiness >= 50 ? 'PARTIALLY_READY' : 'NOT_READY', missing_fields, warnings, errors: [], mapped_data, export_formats: formats, template_version: 'artisera-default-v1' };
};

export const marketplaceMetadata = () => (Object.keys(sources) as Marketplace[]).map(id => ({ id, name: ({amazon:'Amazon',flipkart:'Flipkart',gem:'GeM',ondc:'ONDC',meesho:'Meesho',generic:'Generic'})[id], source_url: sources[id], live_connection: false }));

export function evaluate(product: any, artisan: any, marketplace: Marketplace): Result {
  const p = canonicalProduct(product, artisan);
  const base = [requirement(p, 'sku', 'SKU'), requirement(p, 'title', 'Product title'), requirement(p, 'description', 'Description'), requirement(p, 'category', 'Category'), requirement(p, 'price', 'Selling price'), requirement(p, 'stock_quantity', 'Stock quantity'), requirement(p, 'images', 'Product image')];
  const common = { sku:p.sku, title:p.title, description:p.description, category:p.category, price:p.price, stock_quantity:p.stock_quantity, images:p.images };
  if (marketplace === 'amazon') {
    const warnings = [p.title.length > 200 ? 'Title exceeds the 200-character Amazon India guide limit.' : '', !p.barcode ? 'GTIN / barcode may be required or exemption may be applicable.' : '', !p.dimensions ? 'Package dimensions need marketplace template confirmation.' : ''].filter(Boolean);
    return result(marketplace, p, [...base, requirement(p, 'brand', 'Brand or artisan brand')], warnings, {...common, brand:p.brand, manufacturer:p.manufacturer, bullet_points:p.bullet_points, keywords:p.search_terms.length ? p.search_terms : p.tags, country_of_origin:p.country_of_origin, variations:p.variants}, ['xlsx','csv','json']);
  }
  if (marketplace === 'flipkart') return result(marketplace, p, [...base, requirement(p, 'mrp', 'MRP'), requirement(p, 'manufacturer_details', 'Manufacturer details'), requirement(p, 'country_of_origin', 'Country of origin'), requirement(p, 'hsn_code', 'HSN code')], ['A seller account must be connected before any Flipkart API submission.'], { 'Seller SKU ID':p.sku, MRP:p.mrp, 'Selling Price':p.price, 'Stock Count':p.stock_quantity, 'Procurement SLA':p.lead_time_days, 'Product Name':p.title, 'Product Description':p.description, 'Product Image URL':p.images[0] || '', HSN:p.hsn_code, 'Country of Origin':p.country_of_origin, 'Manufacturer Details':p.manufacturer_details || '' }, ['csv','json']);
  if (marketplace === 'gem') return result(marketplace, p, [...base, requirement(p, 'hsn_code', 'HSN code'), requirement(p, 'gst_rate', 'GST rate'), requirement(p, 'manufacturer_details', 'Manufacturer details')], ['Category-specific GeM fields require seller/category confirmation.', 'Prepared for GeM listing; this does not upload to GeM.'], {...common, mrp:p.mrp, hsn_code:p.hsn_code, gst_rate:p.gst_rate, certifications:p.certifications, technical_specifications:p.specifications, warranty:p.warranty, lead_time_days:p.lead_time_days}, ['json','pdf','xlsx']);
  if (marketplace === 'ondc') return result(marketplace, p, [...base, requirement(p, 'country_of_origin', 'Country of origin'), requirement(p, 'shipping_details', 'Fulfillment details')], ['Live ONDC publishing requires an authorised Seller Network Participant connection.'], { item:{id:p.product_id, descriptor:{name:p.title,short_desc:p.short_description,long_desc:p.description,images:p.images}, price:{currency:p.currency,value:p.price}, quantity:{available:{count:p.stock_quantity}}, category_id:p.category, tags:p.tags}, seller:{id:p.seller_id, name:p.artisan_name}, compliance:{hsn:p.hsn_code,gst_rate:p.gst_rate,country_of_origin:p.country_of_origin} }, ['json']);
  return result(marketplace, p, base, marketplace === 'meesho' ? ['Needs marketplace template confirmation.'] : [], {...common, canonical_product:p}, ['csv','json','pdf']);
}

const csv = (data: Record<string, unknown>) => {
  const entries = Object.entries(data);
  const esc = (v: unknown) => `"${(typeof v === 'string' ? v : JSON.stringify(v ?? '')).replace(/"/g, '""')}"`;
  return `\uFEFF${entries.map(([k]) => esc(k)).join(',')}\n${entries.map(([,v]) => esc(v)).join(',')}\n`;
};
const pdf = (title: string, assessed: Result) => new Promise<Buffer>((resolve, reject) => {
  const document = new PDFDocument({ margin: 48 }); const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject);
  document.fillColor('#9F3D22').fontSize(22).text('ARTISERA'); document.fillColor('#30251F').fontSize(16).text(title); document.moveDown(.5);
  document.fillColor('#75665D').fontSize(10).text('Prepared for listing. This file does not publish your product to any marketplace.'); document.moveDown();
  document.fillColor('#30251F').fontSize(13).text(`Readiness: ${assessed.readiness}% — ${assessed.status.replace('_', ' ')}`); document.moveDown(.5);
  if (assessed.missing_fields.length) { document.fillColor('#A63D2F').fontSize(12).text('Details to add'); assessed.missing_fields.forEach(item => document.fillColor('#30251F').fontSize(10).text(`• ${item.label}`)); document.moveDown(); }
  if (assessed.warnings.length) { document.fillColor('#75665D').fontSize(12).text('Notes'); assessed.warnings.forEach(item => document.fillColor('#30251F').fontSize(10).text(`• ${item}`)); document.moveDown(); }
  document.fillColor('#30251F').fontSize(12).text('Marketplace field preview'); Object.entries(assessed.mapped_data).forEach(([key, value]) => { document.fontSize(9).fillColor('#75665D').text(key); document.fontSize(10).fillColor('#30251F').text(typeof value === 'string' ? value : JSON.stringify(value)); document.moveDown(.35); });
  document.end();
});
export async function generate(product: any, artisan: any, marketplace: Marketplace, format: string) {
  const assessed = evaluate(product, artisan, marketplace);
  const day = new Date().toISOString().slice(0, 10);
  const safeSku = canonicalProduct(product, artisan).sku || String(product.id);
  const filename = `ARTISERA_${marketplace.toUpperCase()}_${safeSku.replace(/[^a-z0-9_-]/gi, '_')}_${day}`;
  if (format === 'xlsx') { const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Listing'); sheet.columns = Object.keys(assessed.mapped_data).map(key => ({ header:key, key, width:Math.min(45, Math.max(16, key.length + 4)) })); sheet.addRow(assessed.mapped_data); return { buffer:Buffer.from(await book.xlsx.writeBuffer()), filename:`${filename}.xlsx`, contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', assessed }; }
  if (format === 'csv') return { buffer:Buffer.from(csv(assessed.mapped_data)), filename:`${filename}.csv`, contentType:'text/csv; charset=utf-8', assessed };
  if (format === 'pdf') return { buffer:await pdf(`${marketplace.toUpperCase()} Listing Package`, assessed), filename:`${filename}.pdf`, contentType:'application/pdf', assessed };
  const payload = { ...assessed, canonical_product: canonicalProduct(product, artisan), generated_at:new Date().toISOString(), source_url:sources[marketplace] };
  return { buffer:Buffer.from(JSON.stringify(payload, null, 2)), filename:`${filename}.json`, contentType:'application/json', assessed };
}
