import bamboo from "@/assets/product-bamboo.jpg";
import vase from "@/assets/product-vase.jpg";
import saree from "@/assets/product-saree.jpg";
import cotton from "@/assets/product-cotton.jpg";

export const popularProducts = [
  {
    id: "woven-basket",
    name: "Woven Storage Basket",
    craft: "Bamboo Craft • Assam",
    price: "₹1,200",
    rating: "4.9",
    image: bamboo,
  },
  {
    id: "ceramic-floral",
    name: "Ceramic Floral",
    craft: "Pottery • Rajasthan",
    price: "₹2,500",
    rating: "5.0",
    image: vase,
  },
];

export const myProducts = [
  {
    id: "kanjivaram",
    status: "Published" as const,
    name: "Indigo Kanjivaram Silk",
    price: "₹14,500",
    tags: ["Handwoven", "Silk"],
    image: saree,
  },
  {
    id: "cotton-set",
    status: "Draft" as const,
    name: "Organic Cotton Saree Set",
    price: "--",
    tags: ["Cotton"],
    image: cotton,
  },
];

export const categories = [
  "Textiles",
  "Bamboo",
  "Pottery",
  "Woodcraft",
  "Jewelry",
  "Metal",
];

export type Opportunity = {
  id: string;
  buyer: string;
  type: string;
  match: number;
  title: string;
  summary: string;
  units: string;
  budget: string;
  timeline: string;
  tags: string[];
};

export const opportunities: Opportunity[] = [
  {
    id: "bamboo-craft-store",
    buyer: "Bamboo Craft Store",
    type: "Retail Chain • Looking for new suppliers",
    match: 94,
    title: "Woven Bamboo Baskets",
    summary:
      "Handwoven bamboo organizers with natural finish for a nationwide retail rollout.",
    units: "1,000 units",
    budget: "₹700 / unit",
    timeline: "45 Days",
    tags: ["Handwoven", "Sustainable Materials", "Export Quality"],
  },
  {
    id: "boutique-hotel-group",
    buyer: "Boutique Hotel Group",
    type: "Hospitality • 5 properties",
    match: 82,
    title: "Custom Terracotta Vases",
    summary:
      "Looking for custom terracota vases for lobby decor across 5 properties.",
    units: "250 units",
    budget: "₹1,200 / unit",
    timeline: "60 Days",
    tags: ["Terracotta", "Custom Design"],
  },
  {
    id: "corporate-gifting-co",
    buyer: "Corporate Gifting Co.",
    type: "Gifting • Bulk orders",
    match: 78,
    title: "Hand-painted Wooden Coasters",
    summary:
      "Seeking bulk hand-painted wooden coasters for Diwali hampers.",
    units: "5,000 units",
    budget: "₹150 / unit",
    timeline: "30 Days",
    tags: ["Woodcraft", "Hand-painted"],
  },
];
