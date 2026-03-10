import { type PrintConfigSnapshot } from '@/types/recipes';

export interface QuoteItemSpec {
  label: string;
  value: string;
}

/**
 * Shared source of truth: builds the client-facing specification lines
 * from a PrintConfigSnapshot. Used by both PDF and email rendering.
 * Internal fields (sheetsUsed, dtpHours) are never exposed.
 */
export function buildClientSpecs(snap: PrintConfigSnapshot | undefined | null): QuoteItemSpec[] {
  if (!snap) return [];
  const specs: QuoteItemSpec[] = [];

  if (snap.formatLabel) {
    specs.push({ label: 'Format', value: snap.formatLabel });
  }
  if (snap.gsm) {
    specs.push({ label: 'Hârtie', value: `Color Copy ${snap.gsm} g/mp` });
  }
  if (snap.colorModeLabel || snap.colorMode) {
    specs.push({ label: 'Tipar', value: snap.colorModeLabel || snap.colorMode });
  }
  if (snap.laminationLabel || snap.lamination) {
    const lamVal =
      snap.laminationLabel ||
      (snap.lamination === 'none' ? 'Fără plastifiere' : snap.lamination);
    specs.push({ label: 'Plastifiere', value: lamVal });
  }
  if (snap.folds != null && snap.folds > 0) {
    specs.push({
      label: 'Fălțuire',
      value: `${snap.folds} ${snap.folds === 1 ? 'fălțuire' : 'fălțuiri'}`,
    });
  }
  if (snap.glue != null) {
    specs.push({ label: 'Lipitură prisma', value: snap.glue ? 'Da' : 'Nu' });
  }

  return specs;
}

/** Helper: format specs as plain text lines for AI prompt usage */
export function specsToTextLines(specs: QuoteItemSpec[]): string[] {
  return specs.map((s) => `  • ${s.label}: ${s.value}`);
}
