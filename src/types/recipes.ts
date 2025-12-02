export type RecipeCategory = 'boxes' | 'printed' | 'personalized' | 'large-print';

export interface Material {
  id: string;
  name: string;
  unit: string; // mp, buc, ml, etc.
  pricePerUnit: number;
}

export interface PersonalizationMethod {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: string;
}

export interface RecipeComponent {
  id: string;
  materialId: string;
  quantity: number;
  formula?: string; // e.g., "width * height * 2" for calculating material needed
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string;
  components: RecipeComponent[];
  personalizationMethods: string[]; // IDs of available methods
  basePrice: number;
  priceFormula: string;
}

// Calculator item when using a recipe
export interface RecipeCalculation {
  id: string;
  recipeId: string;
  recipeName: string;
  category: RecipeCategory;
  quantity: number;
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  selectedPersonalization?: string;
  personalizationDetails?: string;
  materialCost: number;
  personalizationCost: number;
  totalPrice: number;
}

// Predefined materials
export const defaultMaterials: Material[] = [
  { id: 'carton-300', name: 'Carton 300g/mp', unit: 'mp', pricePerUnit: 8.50 },
  { id: 'carton-350', name: 'Carton 350g/mp', unit: 'mp', pricePerUnit: 10.00 },
  { id: 'carton-ondulat', name: 'Carton ondulat', unit: 'mp', pricePerUnit: 6.50 },
  { id: 'hartie-80', name: 'Hârtie 80g/mp', unit: 'mp', pricePerUnit: 0.50 },
  { id: 'hartie-120', name: 'Hârtie 120g/mp', unit: 'mp', pricePerUnit: 0.80 },
  { id: 'hartie-foto', name: 'Hârtie foto glossy', unit: 'mp', pricePerUnit: 15.00 },
  { id: 'vinyl', name: 'Vinyl autoadeziv', unit: 'mp', pricePerUnit: 25.00 },
  { id: 'mesh', name: 'Mesh banner', unit: 'mp', pricePerUnit: 18.00 },
  { id: 'canvas', name: 'Canvas', unit: 'mp', pricePerUnit: 35.00 },
  { id: 'backlit', name: 'Backlit film', unit: 'mp', pricePerUnit: 45.00 },
  { id: 'textil', name: 'Textil printabil', unit: 'mp', pricePerUnit: 28.00 },
];

// Personalization methods
export const defaultPersonalizationMethods: PersonalizationMethod[] = [
  { id: 'uv-print', name: 'Print UV', pricePerUnit: 15.00, unit: 'mp' },
  { id: 'folio-gold', name: 'Folio auriu', pricePerUnit: 25.00, unit: 'mp' },
  { id: 'folio-silver', name: 'Folio argintiu', pricePerUnit: 25.00, unit: 'mp' },
  { id: 'emboss', name: 'Embosare', pricePerUnit: 30.00, unit: 'buc' },
  { id: 'deboss', name: 'Debosare', pricePerUnit: 30.00, unit: 'buc' },
  { id: 'laser-cut', name: 'Tăiere laser', pricePerUnit: 5.00, unit: 'cm' },
  { id: 'laser-engrave', name: 'Gravare laser', pricePerUnit: 8.00, unit: 'cm²' },
  { id: 'serigrafie', name: 'Serigrafie', pricePerUnit: 12.00, unit: 'culoare' },
  { id: 'dtf', name: 'Transfer DTF', pricePerUnit: 18.00, unit: 'mp' },
  { id: 'sublimation', name: 'Sublimare', pricePerUnit: 20.00, unit: 'mp' },
  { id: 'broderie', name: 'Broderie', pricePerUnit: 2.50, unit: 'cusături/1000' },
];

// Default recipe templates
export const defaultRecipes: Recipe[] = [
  // Cutii
  {
    id: 'box-simple',
    name: 'Cutie simplă',
    category: 'boxes',
    description: 'Cutie din carton cu capac',
    components: [{ id: '1', materialId: 'carton-300', quantity: 1 }],
    personalizationMethods: ['uv-print', 'folio-gold', 'folio-silver', 'emboss'],
    basePrice: 5.00,
    priceFormula: 'basePrice + (width * height * 2 + width * depth * 2 + height * depth * 2) / 10000 * materialPrice',
  },
  {
    id: 'box-magnetic',
    name: 'Cutie cu închidere magnetică',
    category: 'boxes',
    description: 'Cutie premium cu magneți',
    components: [{ id: '1', materialId: 'carton-350', quantity: 1 }],
    personalizationMethods: ['uv-print', 'folio-gold', 'folio-silver', 'emboss', 'deboss'],
    basePrice: 15.00,
    priceFormula: 'basePrice + surfaceArea * materialPrice + 5',
  },
  {
    id: 'box-corrugated',
    name: 'Cutie carton ondulat',
    category: 'boxes',
    description: 'Cutie pentru transport/expediere',
    components: [{ id: '1', materialId: 'carton-ondulat', quantity: 1 }],
    personalizationMethods: ['uv-print', 'serigrafie'],
    basePrice: 3.00,
    priceFormula: 'basePrice + surfaceArea * materialPrice',
  },
  // Produse tipărite
  {
    id: 'flyer-a5',
    name: 'Flyer A5',
    category: 'printed',
    description: 'Flyer format A5, o față sau două fețe',
    components: [{ id: '1', materialId: 'hartie-120', quantity: 0.031 }],
    personalizationMethods: [],
    basePrice: 0.15,
    priceFormula: 'basePrice * quantity',
  },
  {
    id: 'flyer-a4',
    name: 'Flyer A4',
    category: 'printed',
    description: 'Flyer format A4, o față sau două fețe',
    components: [{ id: '1', materialId: 'hartie-120', quantity: 0.0625 }],
    personalizationMethods: [],
    basePrice: 0.25,
    priceFormula: 'basePrice * quantity',
  },
  {
    id: 'business-card',
    name: 'Cărți de vizită',
    category: 'printed',
    description: 'Set cărți de vizită 90x50mm',
    components: [{ id: '1', materialId: 'carton-350', quantity: 0.0045 }],
    personalizationMethods: ['folio-gold', 'folio-silver', 'emboss', 'laser-cut'],
    basePrice: 0.20,
    priceFormula: 'basePrice * quantity',
  },
  {
    id: 'poster',
    name: 'Poster',
    category: 'printed',
    description: 'Poster pe hârtie foto sau canvas',
    components: [{ id: '1', materialId: 'hartie-foto', quantity: 1 }],
    personalizationMethods: [],
    basePrice: 5.00,
    priceFormula: 'basePrice + (width * height / 10000) * materialPrice',
  },
  // Produse personalizate
  {
    id: 'tshirt-custom',
    name: 'Tricou personalizat',
    category: 'personalized',
    description: 'Tricou cu print DTF sau serigrafie',
    components: [{ id: '1', materialId: 'textil', quantity: 0.1 }],
    personalizationMethods: ['dtf', 'serigrafie', 'sublimation', 'broderie'],
    basePrice: 25.00,
    priceFormula: 'basePrice + personalizationCost',
  },
  {
    id: 'mug-custom',
    name: 'Cană personalizată',
    category: 'personalized',
    description: 'Cană ceramică cu sublimare',
    components: [],
    personalizationMethods: ['sublimation'],
    basePrice: 18.00,
    priceFormula: 'basePrice + personalizationCost',
  },
  {
    id: 'plaque-custom',
    name: 'Plachetă gravată',
    category: 'personalized',
    description: 'Plachetă din lemn/acril cu gravare laser',
    components: [],
    personalizationMethods: ['laser-engrave', 'uv-print'],
    basePrice: 35.00,
    priceFormula: 'basePrice + (width * height) * personalizationPrice',
  },
  // Printuri mari
  {
    id: 'banner-vinyl',
    name: 'Banner vinyl',
    category: 'large-print',
    description: 'Banner din vinyl pentru exterior',
    components: [{ id: '1', materialId: 'vinyl', quantity: 1 }],
    personalizationMethods: [],
    basePrice: 10.00,
    priceFormula: '(width * height / 10000) * (materialPrice + printPrice)',
  },
  {
    id: 'banner-mesh',
    name: 'Mesh banner',
    category: 'large-print',
    description: 'Banner mesh perforat pentru fațade',
    components: [{ id: '1', materialId: 'mesh', quantity: 1 }],
    personalizationMethods: [],
    basePrice: 8.00,
    priceFormula: '(width * height / 10000) * (materialPrice + printPrice)',
  },
  {
    id: 'canvas-print',
    name: 'Tablou canvas',
    category: 'large-print',
    description: 'Print pe canvas cu rame',
    components: [{ id: '1', materialId: 'canvas', quantity: 1 }],
    personalizationMethods: [],
    basePrice: 25.00,
    priceFormula: 'basePrice + (width * height / 10000) * materialPrice',
  },
  {
    id: 'backlit-print',
    name: 'Print backlit',
    category: 'large-print',
    description: 'Print translucid pentru casete luminoase',
    components: [{ id: '1', materialId: 'backlit', quantity: 1 }],
    personalizationMethods: [],
    basePrice: 15.00,
    priceFormula: '(width * height / 10000) * (materialPrice + printPrice)',
  },
];

export const categoryLabels: Record<RecipeCategory, string> = {
  'boxes': 'Cutii',
  'printed': 'Produse Tipărite',
  'personalized': 'Produse Personalizate',
  'large-print': 'Printuri Mari',
};

export const categoryIcons: Record<RecipeCategory, string> = {
  'boxes': 'box',
  'printed': 'file-text',
  'personalized': 'sparkles',
  'large-print': 'image',
};

export const categoryColors: Record<RecipeCategory, string> = {
  'boxes': 'brand-orange',
  'printed': 'brand-blue',
  'personalized': 'brand-teal',
  'large-print': 'brand-green',
};
