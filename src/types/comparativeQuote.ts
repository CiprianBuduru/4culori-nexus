import { type PrintConfigSnapshot } from './recipes';

export type VariantTier = 'economica' | 'recomandata' | 'premium';

export interface ComparativeVariant {
  tier: VariantTier;
  label: string;
  description: string;
  productId: string;
  productName: string;
  format: string;
  formatLabel: string;
  gsm: number;
  colorMode: string;
  colorModeLabel: string;
  lamination: string;
  laminationLabel: string;
  quantity: number;
  folds: number;
  glue: boolean;
  /** Selling price per unit */
  unitPrice: number;
  /** Total selling price */
  totalPrice: number;
  /** Internal cost (admin only) */
  internalCost: number;
  /** Config snapshot for PDF / email */
  configSnapshot: PrintConfigSnapshot;
  /** Which values came from brief vs defaults */
  sources: Record<string, 'brief' | 'default' | 'variant-rule'>;
}

export interface ComparativeQuoteState {
  /** The original brief text */
  brief: string;
  /** The detected product type */
  productId: string;
  productName: string;
  /** The 3 calculated variants */
  variants: ComparativeVariant[];
  /** Quantity from brief or default */
  quantity: number;
}

export const VARIANT_META: Record<VariantTier, { label: string; description: string; color: string }> = {
  economica: {
    label: 'Varianta economică',
    description: 'Variantă optimizată pentru buget',
    color: 'emerald',
  },
  recomandata: {
    label: 'Varianta recomandată',
    description: 'Cea mai echilibrată variantă',
    color: 'blue',
  },
  premium: {
    label: 'Varianta premium',
    description: 'Variantă cu impact și finisare superioară',
    color: 'amber',
  },
};
