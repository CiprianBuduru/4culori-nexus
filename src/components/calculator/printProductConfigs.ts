// ──────────────────────────────────────────────
// Tipărituri – universal print product configs
// ──────────────────────────────────────────────

export interface PrintFormat {
  value: string;
  label: string;
  pcsPerSheet: number;
  /** Number of folds for this format (pliant only) */
  folds?: number;
  /** Whether prism glue is needed (pliant only) */
  glue?: boolean;
}

export interface PrintColorMode {
  value: string;
  label: string;
  costPerSheet: number;
}

export interface PrintLamination {
  value: string;
  label: string;
  costPerSheet: number;
}

/** Commercial defaults suggested to sales operators for quick quoting */
export interface CommercialDefaults {
  format: string;
  gsm: number;
  colorMode: string;
  lamination: string;
  labels: Record<string, string>; // field → human-readable label for the suggested value
}

export interface PrintProductConfig {
  id: string;
  name: string;
  icon: string; // lucide icon name hint
  formats: PrintFormat[];
  allowCustomFormat: boolean;
  allowedGsm: number[];
  defaultGsm: number;
  colorModes: PrintColorMode[];
  defaultColorMode: string;
  laminations: PrintLamination[];
  defaultLamination: string;
  minQuantity: number;
  quantityStep: number;
  defaultQuantity: number;
  finishingNotes: string;
  /** DTP setup hours for this product */
  dtpHours: number;
  /** true = config is complete & calculator is fully functional */
  ready: boolean;
  /** Commercial defaults for AI Sales Assistant quick-quote flow */
  commercialDefaults: CommercialDefaults;
}

// ── Shared option sets ──────────────────────

export const ALL_COLOR_MODES: PrintColorMode[] = [
  { value: '4+0', label: '4+0 (color, 1 față)', costPerSheet: 0.10 },
  { value: '4+4', label: '4+4 (color, 2 fețe)', costPerSheet: 0.20 },
  { value: '1+0', label: '1+0 (B/W, 1 față)', costPerSheet: 0.02 },
  { value: '1+1', label: '1+1 (B/W, 2 fețe)', costPerSheet: 0.04 },
];

export const ALL_LAMINATIONS: PrintLamination[] = [
  { value: 'none', label: 'Fără plastifiere', costPerSheet: 0 },
  { value: 'gloss_1', label: 'Lucioasă 1 față', costPerSheet: 0.07 },
  { value: 'gloss_2', label: 'Lucioasă 2 fețe', costPerSheet: 0.14 },
  { value: 'matte_1', label: 'Mată 1 față', costPerSheet: 0.10 },
  { value: 'matte_2', label: 'Mată 2 fețe', costPerSheet: 0.20 },
  { value: 'soft_1', label: 'Soft Touch 1 față', costPerSheet: 0.16 },
  { value: 'soft_2', label: 'Soft Touch 2 fețe', costPerSheet: 0.32 },
];

// Helper to pick a subset by value
const pickColorModes = (ids: string[]) =>
  ALL_COLOR_MODES.filter((m) => ids.includes(m.value));

const pickLaminations = (ids: string[]) =>
  ALL_LAMINATIONS.filter((l) => ids.includes(l.value));

// ── Pricing constants (shared across all print products) ──

export const PRINT_ENGINE = {
  SPOILAGE: 0.10,            // +10 % extra sheets
  PAPER_TECH_LOSS: 0.20,     // +20 % on paper cost
  SETUP_RATE: 15,            // EUR / h
  LABOR_PCT: 0.02,
  MAINTENANCE_PCT: 0.05,
  PRODUCTION_MARKUP: 1.40,
} as const;

// ── Product definitions ─────────────────────

export const PRINT_PRODUCTS: PrintProductConfig[] = [
  // 1 ─ Flyer
  {
    id: 'flyer',
    name: 'Flyer',
    icon: 'FileText',
    formats: [
      { value: 'DL', label: 'DL', pcsPerSheet: 6 },
      { value: 'A6', label: 'A6', pcsPerSheet: 8 },
      { value: 'A5', label: 'A5', pcsPerSheet: 4 },
      { value: 'A4', label: 'A4', pcsPerSheet: 2 },
    ],
    allowCustomFormat: true,
    allowedGsm: [90, 120, 160, 200],
    defaultGsm: 120,
    colorModes: pickColorModes(['4+0', '4+4']),
    defaultColorMode: '4+0',
    laminations: pickLaminations(['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2', 'soft_1', 'soft_2']),
    defaultLamination: 'none',
    minQuantity: 50,
    quantityStep: 50,
    defaultQuantity: 100,
    finishingNotes: 'Tăiere inclusă',
    dtpHours: 0.5,
    ready: true,
    commercialDefaults: {
      format: 'A5',
      gsm: 120,
      colorMode: '4+4',
      lamination: 'none',
      labels: { format: 'A5', gsm: '120 g/mp', colorMode: '4+4 (color, 2 fețe)', lamination: 'Fără plastifiere' },
    },
  },

  // 2 ─ Cărți de vizită
  {
    id: 'business-card',
    name: 'Cărți de vizită',
    icon: 'CreditCard',
    formats: [
      { value: '9x5', label: '9 × 5 cm', pcsPerSheet: 20 },
      { value: '8.5x5.5', label: '8.5 × 5.5 cm', pcsPerSheet: 20 },
    ],
    allowCustomFormat: true,
    allowedGsm: [300, 350, 400],
    defaultGsm: 300,
    colorModes: pickColorModes(['4+0', '4+4']),
    defaultColorMode: '4+4',
    laminations: pickLaminations(['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2', 'soft_1', 'soft_2']),
    defaultLamination: 'none',
    minQuantity: 60,
    quantityStep: 20,
    defaultQuantity: 100,
    finishingNotes: 'Tăiere inclusă',
    dtpHours: 0.2,
    ready: true,
    commercialDefaults: {
      format: '9x5',
      gsm: 350,
      colorMode: '4+4',
      lamination: 'matte_1',
      labels: { format: '9 × 5 cm', gsm: '350 g/mp', colorMode: '4+4 (color, 2 fețe)', lamination: 'Mată 1 față' },
    },
  },

  // 3 ─ Pliant (placeholder)
  {
    id: 'pliant',
    name: 'Pliant',
    icon: 'BookOpen',
    formats: [
      { value: 'A4-tri', label: 'A4 tri-fold', pcsPerSheet: 2 },
      { value: 'A3-bi', label: 'A3 bi-fold', pcsPerSheet: 1 },
      { value: 'DL-bi', label: 'DL bi-fold', pcsPerSheet: 6 },
    ],
    allowCustomFormat: true,
    allowedGsm: [120, 160, 200, 250],
    defaultGsm: 160,
    colorModes: pickColorModes(['4+4']),
    defaultColorMode: '4+4',
    laminations: pickLaminations(['none', 'gloss_1', 'gloss_2', 'matte_1', 'matte_2']),
    defaultLamination: 'none',
    minQuantity: 50,
    quantityStep: 50,
    defaultQuantity: 100,
    finishingNotes: 'Tăiere + fălțuire inclusă (placeholder – de validat)',
    dtpHours: 0.5,
    ready: false,
    commercialDefaults: {
      format: 'A4-tri',
      gsm: 160,
      colorMode: '4+4',
      lamination: 'none',
      labels: { format: 'A4 tri-fold', gsm: '160 g/mp', colorMode: '4+4 (color, 2 fețe)', lamination: 'Fără plastifiere' },
    },
  },

  // 4 ─ Broșură (placeholder)
  {
    id: 'brosura',
    name: 'Broșură',
    icon: 'BookMarked',
    formats: [
      { value: 'A5', label: 'A5 (capsată)', pcsPerSheet: 4 },
      { value: 'A4', label: 'A4 (capsată)', pcsPerSheet: 2 },
    ],
    allowCustomFormat: true,
    allowedGsm: [90, 120, 160],
    defaultGsm: 120,
    colorModes: pickColorModes(['4+4']),
    defaultColorMode: '4+4',
    laminations: pickLaminations(['none', 'gloss_1', 'matte_1']),
    defaultLamination: 'none',
    minQuantity: 25,
    quantityStep: 25,
    defaultQuantity: 50,
    finishingNotes: 'Capsare + tăiere inclusă (placeholder – de validat)',
    dtpHours: 0.5,
    ready: false,
    commercialDefaults: {
      format: 'A5',
      gsm: 120,
      colorMode: '4+4',
      lamination: 'none',
      labels: { format: 'A5 (capsată)', gsm: '120 g/mp', colorMode: '4+4 (color, 2 fețe)', lamination: 'Fără plastifiere' },
    },
  },

  // 5 ─ Afiș (placeholder)
  {
    id: 'afis',
    name: 'Afiș',
    icon: 'Image',
    formats: [
      { value: 'A3', label: 'A3', pcsPerSheet: 1 },
      { value: 'A2', label: 'A2 (2×SRA3)', pcsPerSheet: 1 },
      { value: 'SRA3', label: 'SRA3', pcsPerSheet: 1 },
    ],
    allowCustomFormat: true,
    allowedGsm: [160, 200, 250, 300],
    defaultGsm: 200,
    colorModes: pickColorModes(['4+0']),
    defaultColorMode: '4+0',
    laminations: pickLaminations(['none', 'gloss_1', 'matte_1']),
    defaultLamination: 'none',
    minQuantity: 10,
    quantityStep: 10,
    defaultQuantity: 50,
    finishingNotes: 'Tăiere inclusă (placeholder – de validat)',
    dtpHours: 0.5,
    ready: false,
    commercialDefaults: {
      format: 'A3',
      gsm: 200,
      colorMode: '4+0',
      lamination: 'none',
      labels: { format: 'A3', gsm: '200 g/mp', colorMode: '4+0 (color, 1 față)', lamination: 'Fără plastifiere' },
    },
  },
];

export const getProductById = (id: string) =>
  PRINT_PRODUCTS.find((p) => p.id === id);
