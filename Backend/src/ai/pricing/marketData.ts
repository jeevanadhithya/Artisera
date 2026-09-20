export interface BenchmarkItem {
  id: string;
  title: string;
  category: string;
  price: number;
  platform: 'amazon_karigar' | 'fabindia' | 'etsy_india' | 'okhai' | 'seed_data';
  description: string;
  provenance?: string;
  url?: string;
}

/**
 * Expanded and trained authentic benchmark market catalog spanning all major Indian handicraft traditions.
 */
export const BENCHMARK_CATALOG: BenchmarkItem[] = [
  // ── Pottery & Ceramics ──
  {
    id: 'pot-001',
    title: 'Khurja Blue Pottery Ceramic Floral Vase',
    category: 'pottery',
    price: 850,
    platform: 'fabindia',
    description: 'Traditional quartz stone powder hand-painted glazed blue pottery vase with Mughal floral motifs.',
    provenance: 'Khurja, Uttar Pradesh',
  },
  {
    id: 'pot-002',
    title: 'Terracotta Table Lamp with Warli Tribal Painting',
    category: 'pottery',
    price: 1100,
    platform: 'amazon_karigar',
    description: 'Eco-friendly natural terracotta base lamp hand-painted with authentic Warli tribal motifs.',
    provenance: 'Dahanu, Maharashtra',
  },
  {
    id: 'pot-003',
    title: 'Nizamabad Black Pottery Decorative Serving Platter',
    category: 'pottery',
    price: 650,
    platform: 'etsy_india',
    description: 'Traditional smoked black clay pottery with fine silver-sheen etched pattern engraving.',
    provenance: 'Nizamabad, Uttar Pradesh',
  },
  {
    id: 'pot-004',
    title: 'Longpi Black Serpentinite Stone Cooking Pot',
    category: 'pottery',
    price: 1800,
    platform: 'okhai',
    description: 'Authentic Longpi coil pottery made of serpentine stone and brown clay with cane handles.',
    provenance: 'Manipur',
  },
  {
    id: 'pot-005',
    title: 'Jaipur Glazed Ceramic Decorative Hanging Plate',
    category: 'pottery',
    price: 950,
    platform: 'fabindia',
    description: 'Handcrafted Egyptian paste decorative wall plate featuring vibrant peacock patterns.',
    provenance: 'Jaipur, Rajasthan',
  },

  // ── Textiles & Handlooms ──
  {
    id: 'tex-001',
    title: 'Banarasi Pure Katan Silk Handloom Saree with Kadwa Zari',
    category: 'textiles',
    price: 14500,
    platform: 'fabindia',
    description: 'Master handloom woven pure silk saree with real metallic zari floral bootis across the palla.',
    provenance: 'Varanasi, Uttar Pradesh',
  },
  {
    id: 'tex-002',
    title: 'Chanderi Silk Cotton Handwoven Dupatta',
    category: 'textiles',
    price: 2400,
    platform: 'okhai',
    description: 'Lightweight translucent Chanderi dupatta with gold zari border and geometric buttis.',
    provenance: 'Madhya Pradesh',
  },
  {
    id: 'tex-003',
    title: 'Kalamkari Natural Dyed Hand-Painted Saree',
    category: 'textiles',
    price: 4200,
    platform: 'amazon_karigar',
    description: 'Organic cotton fabric with mythological narrative scenes hand-drawn using bamboo kalam pens and natural vegetable pigments.',
    provenance: 'Srikalahasti, Andhra Pradesh',
  },
  {
    id: 'tex-004',
    title: 'Pashmina Pure Cashmere Hand-Embroidered Shawl',
    category: 'textiles',
    price: 22000,
    platform: 'etsy_india',
    description: 'GI-certified authentic Changthangi goat fine cashmere wool shawl with dense Sozni floral embroidery needlework.',
    provenance: 'Srinagar, Kashmir',
  },
  {
    id: 'tex-005',
    title: 'Kutch Rogan Art Handcrafted Silk Stole',
    category: 'textiles',
    price: 3600,
    platform: 'okhai',
    description: 'Castor oil boiled pigment paste pulled by metal stylus onto hand-dyed mulberry silk.',
    provenance: 'Nirona, Gujarat',
  },
  {
    id: 'tex-006',
    title: 'Pochampally Ikat Pure Silk Handwoven Saree',
    category: 'textiles',
    price: 8800,
    platform: 'fabindia',
    description: 'Double ikat resist-dyed geometric silk saree woven on traditional pit looms.',
    provenance: 'Bhoodan Pochampally, Telangana',
  },
  {
    id: 'tex-007',
    title: 'Phulkari Hand-Embroidered Georgette Dupatta',
    category: 'textiles',
    price: 1950,
    platform: 'amazon_karigar',
    description: 'Traditional Punjabi folk embroidery using vibrant pat silk threads in geometric floral stitches.',
    provenance: 'Patiala, Punjab',
  },

  // ── Woodwork & Carvings ──
  {
    id: 'wood-001',
    title: 'Saharanpur Sheesham Wood Hand-Carved Spice Box',
    category: 'woodwork',
    price: 1250,
    platform: 'amazon_karigar',
    description: 'Solid rosewood box with brass inlay detailing and 9 removable handcrafted compartments.',
    provenance: 'Saharanpur, Uttar Pradesh',
  },
  {
    id: 'wood-002',
    title: 'Kashmiri Walnut Wood Intricate Carved Jewellery Box',
    category: 'woodwork',
    price: 3400,
    platform: 'fabindia',
    description: 'Seasoned natural walnut timber box carved with high-relief chinar leaf patterns and secret lock.',
    provenance: 'Kashmir',
  },
  {
    id: 'wood-003',
    title: 'Channapatna Lacquer-Polished Wooden Kitchen Toys Set',
    category: 'woodwork',
    price: 850,
    platform: 'okhai',
    description: 'GI-tagged Wrightia tinctoria non-toxic vegetable-dyed turnery craft by Channapatna master artisans.',
    provenance: 'Channapatna, Karnataka',
  },

  // ── Metalwork, Brass & Bell Metal ──
  {
    id: 'metal-001',
    title: 'Dhokra Lost-Wax Cast Brass Tribal Figurine (Musicians)',
    category: 'metalwork',
    price: 2100,
    platform: 'okhai',
    description: 'Ancient lost-wax bell metal casting crafted by Bastar indigenous artisan collectives.',
    provenance: 'Bastar, Chhattisgarh',
  },
  {
    id: 'metal-002',
    title: 'Moradabad Engraved Brass Peacock Temple Diya',
    category: 'metalwork',
    price: 1650,
    platform: 'amazon_karigar',
    description: 'Heavy solid brass oil lamp with filigree peacock finial and floral etching.',
    provenance: 'Moradabad, Uttar Pradesh',
  },
  {
    id: 'metal-003',
    title: 'Bidriware Silver Inlay Zinc-Copper Alloy Vase',
    category: 'metalwork',
    price: 4800,
    platform: 'etsy_india',
    description: 'GI-tagged Bidri black metal vase inlaid with pure 99.9% fine silver wire floral vines.',
    provenance: 'Bidar, Karnataka',
  },
  {
    id: 'metal-004',
    title: 'Thanjavur Art Plate Embossed Brass and Silver Wall Mount',
    category: 'metalwork',
    price: 3800,
    platform: 'fabindia',
    description: 'Hand-hammered brass circular plate relief with silver foil embossing depicting temple deities.',
    provenance: 'Thanjavur, Tamil Nadu',
  },

  // ── Jewelry & Filigree ──
  {
    id: 'jew-001',
    title: 'Jaipur Meenakari Enamelled Kundan Drop Earrings',
    category: 'jewelry',
    price: 2800,
    platform: 'fabindia',
    description: 'Traditional reverse-enamelled Meenakari work with uncut glass stones and freshwater pearls.',
    provenance: 'Jaipur, Rajasthan',
  },
  {
    id: 'jew-002',
    title: 'Cuttack Tarakasi Pure Silver Filigree Brooch',
    category: 'jewelry',
    price: 3200,
    platform: 'etsy_india',
    description: 'Hair-thin 92.5 sterling silver wires spun and soldered into delicate konark chakra mandala.',
    provenance: 'Cuttack, Odisha',
  },
  {
    id: 'jew-003',
    title: 'Terracotta Hand-Moulded Tribal Choker Necklace Set',
    category: 'jewelry',
    price: 650,
    platform: 'okhai',
    description: 'Natural kiln-fired terracotta clay beads painted with waterproof acrylic earth tones.',
    provenance: 'West Bengal',
  },

  // ── Jute, Bamboo & Cane ──
  {
    id: 'eco-001',
    title: 'Natural Braided Jute Handwoven Floor Rug',
    category: 'jute & natural fiber',
    price: 1750,
    platform: 'fabindia',
    description: '100% biodegradable golden jute fiber tightly woven into a circular textured floor mat.',
    provenance: 'West Bengal',
  },
  {
    id: 'eco-002',
    title: 'Assam Fine Bamboo Weave Tea Coasters Set of 6',
    category: 'bamboo & cane',
    price: 450,
    platform: 'okhai',
    description: 'Hand-split cured bamboo strips woven into weather-resistant natural dining table coasters.',
    provenance: 'Assam',
  },
  {
    id: 'eco-003',
    title: 'Sitalpati Cold-Weave Natural River Reed Sleeping Mat',
    category: 'bamboo & cane',
    price: 2100,
    platform: 'amazon_karigar',
    description: 'Handwoven natural Murta cane mat known for its natural cool touch during summer months.',
    provenance: 'Cooch Behar, West Bengal',
  },

  // ── Traditional Paintings & Fine Crafts ──
  {
    id: 'art-001',
    title: 'Madhubani Hand-Painted Mithila Canvas Painting (Tree of Life)',
    category: 'paintings',
    price: 2900,
    platform: 'etsy_india',
    description: 'Authentic handmade paper painting using natural nibs, twigs, and mineral pigments.',
    provenance: 'Madhubani, Bihar',
  },
  {
    id: 'art-002',
    title: 'Tanjore 22K Gold Foil Hand-Painted Wooden Plaque',
    category: 'paintings',
    price: 9500,
    platform: 'fabindia',
    description: 'Dense gesso paste relief layered with genuine 22-carat gold leaf foil and Jaipur semi-precious gems.',
    provenance: 'Thanjavur, Tamil Nadu',
  },
  {
    id: 'art-003',
    title: 'Pattachitra Traditional Palm Leaf Engraving (Scroll)',
    category: 'paintings',
    price: 2400,
    platform: 'amazon_karigar',
    description: 'Etched cured dried palm leaves inked with natural lampblack and vegetable pastes.',
    provenance: 'Raghurajpur, Odisha',
  },
];

/**
 * Get category price statistics across benchmark platforms.
 */
export function getCategoryStats(category: string): {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
} {
  const normCat = category.toLowerCase().trim();
  const matches = BENCHMARK_CATALOG.filter(
    (b) => b.category.toLowerCase().includes(normCat) || normCat.includes(b.category.toLowerCase())
  );

  const pool = matches.length > 0 ? matches : BENCHMARK_CATALOG;
  const prices = pool.map((p) => p.price);
  const sum = prices.reduce((acc, p) => acc + p, 0);

  return {
    count: pool.length,
    avgPrice: Math.round(sum / pool.length),
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}
