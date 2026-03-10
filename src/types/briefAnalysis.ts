export interface BriefExtraction {
  product_type?: string;
  quantity?: number;
  format?: string;
  is_custom_format?: boolean;
  custom_pcs_per_sheet?: number;
  gsm?: number;
  color_mode?: string;
  lamination?: string;
  folding_type?: string;
  notes?: string;
  confidence: number;
  missing_fields: string[];
  alternative_products?: { product_type: string; reason: string }[];
}

export interface BriefValidation {
  missingFields: string[];
  warnings: string[];
}

export type BriefStatus = 'complete' | 'partial' | 'ambiguous';

export interface BriefAnalysisResult {
  extraction: BriefExtraction;
  validation: BriefValidation;
  status: BriefStatus;
}

export interface PrintCalculatorPrefill {
  productId: string;
  format?: string;
  customPcsPerSheet?: number;
  paperWeight?: number;
  colorMode?: string;
  lamination?: string;
  quantity?: number;
}

export const FIELD_LABELS: Record<string, string> = {
  product_type: 'Tip produs',
  quantity: 'Cantitate',
  format: 'Format',
  gsm: 'Gramaj',
  color_mode: 'Mod tipar',
  lamination: 'Plastifiere',
  folding_type: 'Tip fălțuire',
};

export const PRODUCT_NAMES: Record<string, string> = {
  flyer: 'Flyer',
  'business-card': 'Cărți de vizită',
  pliant: 'Pliant',
  brosura: 'Broșură',
  afis: 'Afiș',
};
