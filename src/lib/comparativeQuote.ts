/**
 * Comparative Quote Engine
 *
 * Generates 3 commercial variants (economică / recomandată / premium) for a
 * given product type, using allowed product configurations and the same pricing
 * engine constants as PrintCalculator.
 */

import {
  PRINT_PRODUCTS,
  PRINT_ENGINE,
  type PrintProductConfig,
  type PrintFormat,
} from '@/components/calculator/printProductConfigs';
import { type PrintConfigSnapshot } from '@/types/recipes';
import {
  type ComparativeVariant,
  type ComparativeQuoteState,
  type VariantTier,
  VARIANT_META,
} from '@/types/comparativeQuote';
import { type BriefExtraction } from '@/types/briefAnalysis';

// ── Variant rule definitions per product ─────────────────────────────────────

interface VariantRule {
  /** Preferred gsm; falls back to closest allowed */
  gsm?: number;
  /** Preferred color mode */
  colorMode?: string;
  /** Preferred lamination */
  lamination?: string;
  /** Preferred format override (otherwise use brief / default) */
  format?: string;
}

type ProductVariantRules = Record<VariantTier, VariantRule>;

const VARIANT_RULES: Record<string, ProductVariantRules> = {
  flyer: {
    economica: { gsm: 90, lamination: 'none' },
    recomandata: { gsm: 120, colorMode: '4+4', lamination: 'none' },
    premium: { gsm: 160, lamination: 'matte_1' },
  },
  'business-card': {
    economica: { gsm: 300, lamination: 'none' },
    recomandata: { gsm: 350, colorMode: '4+4', lamination: 'matte_1' },
    premium: { gsm: 400, lamination: 'soft_1' },
  },
  pliant: {
    economica: { gsm: 120, lamination: 'none' },
    recomandata: { gsm: 160, colorMode: '4+4', lamination: 'none' },
    premium: { gsm: 250, lamination: 'matte_2' },
  },
};

// ── Pricing calculation (mirrors PrintCalculator logic) ──────────────────────

interface CalcInput {
  product: PrintProductConfig;
  formatObj: PrintFormat;
  gsm: number;
  colorMode: string;
  lamination: string;
  quantity: number;
  paperPricePerSheet: number;
}

interface CalcResult {
  unitPrice: number;
  totalPrice: number;
  internalCost: number;
  sheetsWithWaste: number;
}

function calculatePrice(input: CalcInput): CalcResult {
  const { product, formatObj, quantity, paperPricePerSheet } = input;
  const pcsPerSheet = formatObj.pcsPerSheet;
  const folds = formatObj.folds ?? 0;
  const glue = formatObj.glue ?? false;

  const colorCostPerSheet =
    product.colorModes.find((c) => c.value === input.colorMode)?.costPerSheet ?? 0;
  const laminationCostPerSheet =
    product.laminations.find((l) => l.value === input.lamination)?.costPerSheet ?? 0;

  const setupCost = product.dtpHours * PRINT_ENGINE.SETUP_RATE;
  const sheets = Math.ceil(quantity / pcsPerSheet);
  const sheetsWithWaste = Math.ceil(sheets * (1 + PRINT_ENGINE.SPOILAGE));

  const paperCostPerSheet = paperPricePerSheet * (1 + PRINT_ENGINE.PAPER_TECH_LOSS);
  const productionCost =
    (paperCostPerSheet + colorCostPerSheet + laminationCostPerSheet) * sheetsWithWaste;

  const foldingCost = folds > 0 ? quantity * folds * PRINT_ENGINE.FOLD_COST_PER_FOLD : 0;
  const glueCost = glue ? quantity * PRINT_ENGINE.GLUE_COST_PER_PIECE : 0;

  const labor = productionCost * PRINT_ENGINE.LABOR_PCT;
  const maintenance = productionCost * PRINT_ENGINE.MAINTENANCE_PCT;
  const internalCost = productionCost + setupCost + foldingCost + glueCost + labor + maintenance;
  const totalPrice = internalCost * PRINT_ENGINE.PRODUCTION_MARKUP;
  const unitPrice = totalPrice / quantity;

  return { unitPrice, totalPrice, internalCost, sheetsWithWaste };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether comparative mode is available for a given product.
 */
export function isComparativeAvailable(productId: string): boolean {
  return !!VARIANT_RULES[productId];
}

/**
 * Generate 3 comparative variants for a product.
 *
 * @param extraction  – AI brief extraction result
 * @param paperPrices – { [gsm]: pricePerSheet } from DB
 * @returns null if product not supported or critical data missing
 */
export function generateComparativeVariants(
  extraction: BriefExtraction,
  paperPrices: Record<number, number>,
): ComparativeQuoteState | null {
  const productId = extraction.product_type;
  if (!productId) return null;

  const rules = VARIANT_RULES[productId];
  if (!rules) return null;

  const product = PRINT_PRODUCTS.find((p) => p.id === productId);
  if (!product) return null;

  const quantity = extraction.quantity || product.defaultQuantity;

  // Resolve format from brief or product default
  const briefFormat = extraction.is_custom_format ? undefined : extraction.format;
  const defaultFormat = product.commercialDefaults.format;
  const resolvedFormatValue = briefFormat ?? defaultFormat;
  const resolvedFormatObj =
    product.formats.find((f) => f.value === resolvedFormatValue) ?? product.formats[0];

  const tiers: VariantTier[] = ['economica', 'recomandata', 'premium'];

  const variants: ComparativeVariant[] = tiers.map((tier) => {
    const rule = rules[tier];

    // Resolve GSM
    let gsm = rule.gsm ?? extraction.gsm ?? product.defaultGsm;
    if (!product.allowedGsm.includes(gsm)) {
      gsm = product.allowedGsm.reduce((prev, curr) =>
        Math.abs(curr - gsm) < Math.abs(prev - gsm) ? curr : prev,
      );
    }

    // Resolve color mode
    let colorMode = rule.colorMode ?? extraction.color_mode ?? product.defaultColorMode;
    if (!product.colorModes.some((c) => c.value === colorMode)) {
      colorMode = product.defaultColorMode;
    }
    // Prisma forces 4+0
    if (resolvedFormatObj.glue && colorMode !== '4+0') {
      colorMode = '4+0';
    }

    // Resolve lamination
    let lamination = rule.lamination ?? extraction.lamination ?? product.defaultLamination;
    if (!product.laminations.some((l) => l.value === lamination)) {
      lamination = product.defaultLamination;
    }

    // Paper price
    const paperPrice = paperPrices[gsm] || 0;

    const calc = calculatePrice({
      product,
      formatObj: resolvedFormatObj,
      gsm,
      colorMode,
      lamination,
      quantity,
      paperPricePerSheet: paperPrice,
    });

    const colorModeObj = product.colorModes.find((c) => c.value === colorMode);
    const laminationObj = product.laminations.find((l) => l.value === lamination);

    const configSnapshot: PrintConfigSnapshot = {
      productType: product.id,
      productName: product.name,
      format: resolvedFormatObj.value,
      formatLabel: resolvedFormatObj.label,
      gsm,
      colorMode,
      colorModeLabel: colorModeObj?.label ?? colorMode,
      lamination,
      laminationLabel: laminationObj?.label ?? 'Fără plastifiere',
      sheetsUsed: calc.sheetsWithWaste,
      dtpHours: product.dtpHours,
      folds: resolvedFormatObj.folds ?? undefined,
      glue: resolvedFormatObj.glue ?? undefined,
    };

    // Track sources
    const sources: Record<string, 'brief' | 'default' | 'variant-rule'> = {};
    sources.format = briefFormat ? 'brief' : 'default';
    sources.gsm = rule.gsm ? 'variant-rule' : extraction.gsm ? 'brief' : 'default';
    sources.colorMode = rule.colorMode ? 'variant-rule' : extraction.color_mode ? 'brief' : 'default';
    sources.lamination = rule.lamination ? 'variant-rule' : extraction.lamination ? 'brief' : 'default';
    sources.quantity = extraction.quantity ? 'brief' : 'default';

    const meta = VARIANT_META[tier];

    return {
      tier,
      label: meta.label,
      description: meta.description,
      productId: product.id,
      productName: `${product.name} ${resolvedFormatObj.label}`,
      format: resolvedFormatObj.value,
      formatLabel: resolvedFormatObj.label,
      gsm,
      colorMode,
      colorModeLabel: colorModeObj?.label ?? colorMode,
      lamination,
      laminationLabel: laminationObj?.label ?? 'Fără plastifiere',
      quantity,
      folds: resolvedFormatObj.folds ?? 0,
      glue: resolvedFormatObj.glue ?? false,
      unitPrice: calc.unitPrice,
      totalPrice: calc.totalPrice,
      internalCost: calc.internalCost,
      configSnapshot,
      sources,
    };
  });

  return {
    brief: '',
    productId: product.id,
    productName: product.name,
    variants,
    quantity,
  };
}
