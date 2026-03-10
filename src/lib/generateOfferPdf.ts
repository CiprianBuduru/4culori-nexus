import jsPDF from 'jspdf';
import { RecipeCalculation, type PrintConfigSnapshot } from '@/types/recipes';
import { buildClientSpecs } from '@/lib/quoteItemSpecs';

interface OfferData {
  calculations: RecipeCalculation[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  offerNumber?: string;
  clientName?: string;
  clientEmail?: string;
  validUntil?: string;
}

// Brand palette
const BRAND = {
  blue: [0, 113, 188] as [number, number, number],
  blueLight: [235, 245, 252] as [number, number, number],
  orange: [255, 127, 80] as [number, number, number],
  dark: [33, 33, 33] as [number, number, number],
  gray: [110, 110, 110] as [number, number, number],
  grayLight: [180, 180, 180] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bg: [250, 251, 252] as [number, number, number],
};

/**
 * Romanian-diacritics-safe text helper.
 * jsPDF's default Helvetica subset handles most Latin-Extended chars.
 * We keep Helvetica for maximum compatibility but use careful encoding.
 */
function safeText(text: string): string {
  // Map problematic diacritics to widely-supported Unicode equivalents
  return text
    .replace(/ș/g, '\u0219')
    .replace(/Ș/g, '\u0218')
    .replace(/ț/g, '\u021B')
    .replace(/Ț/g, '\u021A')
    .replace(/ă/g, '\u0103')
    .replace(/Ă/g, '\u0102')
    .replace(/â/g, '\u00E2')
    .replace(/Â/g, '\u00C2')
    .replace(/î/g, '\u00EE')
    .replace(/Î/g, '\u00CE');
}

export function generateOfferPdf(data: OfferData) {
  const {
    calculations,
    subtotal,
    discount,
    discountAmount,
    total,
    offerNumber = `OF-${Date.now()}`,
    clientName = '',
    clientEmail = '',
    validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO'),
  } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(); // ~210
  const ph = doc.internal.pageSize.getHeight(); // ~297
  const ml = 18; // left margin
  const mr = 18; // right margin
  const contentW = pw - ml - mr;
  let y = 0;

  const t = (s: string) => safeText(s);

  // ── Utility helpers ────────────────────────────────────────────
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 30) {
      renderFooter();
      doc.addPage();
      y = 18;
    }
  };

  const renderFooter = () => {
    // thin blue line
    doc.setDrawColor(BRAND.blue[0], BRAND.blue[1], BRAND.blue[2]);
    doc.setLineWidth(0.5);
    doc.line(ml, ph - 14, pw - mr, ph - 14);
    setColor(BRAND.grayLight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(t('4Culori \u2022 Tipografie & Personaliz\u0103ri \u2022 www.4culori.ro'), pw / 2, ph - 9, { align: 'center' });
  };

  // ── A. HEADER ──────────────────────────────────────────────────
  // Subtle top accent bar
  setFill(BRAND.blue);
  doc.rect(0, 0, pw, 3, 'F');

  y = 16;
  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setColor(BRAND.blue);
  doc.text('4CULORI', ml, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(BRAND.gray);
  doc.text(t('Tipografie & Print'), ml, y + 5);

  // Right side: offer metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(BRAND.gray);
  const rightX = pw - mr;
  doc.text(t(`Ofert\u0103: ${offerNumber}`), rightX, y - 4, { align: 'right' });
  doc.text(t(`Data: ${new Date().toLocaleDateString('ro-RO')}`), rightX, y + 1, { align: 'right' });
  doc.text(t(`Valabil p\u00E2n\u0103: ${validUntil}`), rightX, y + 6, { align: 'right' });

  y += 14;
  // Separator
  doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
  doc.setLineWidth(0.3);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  // ── B. CLIENT ──────────────────────────────────────────────────
  if (clientName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(BRAND.dark);
    doc.text(t('OFERT\u0102 DE PRE\u021A'), ml, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(BRAND.gray);
    doc.text(t('C\u0103tre:'), ml, y);
    doc.setFont('helvetica', 'bold');
    setColor(BRAND.dark);
    doc.text(t(clientName), ml + 16, y);
    y += 5;

    if (clientEmail) {
      doc.setFont('helvetica', 'normal');
      setColor(BRAND.gray);
      doc.text(clientEmail, ml + 16, y);
      y += 5;
    }
    y += 4;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(BRAND.dark);
    doc.text(t('OFERT\u0102 DE PRE\u021A'), ml, y);
    y += 12;
  }

  // ── C. PRODUCTS ────────────────────────────────────────────────
  calculations.forEach((calc, idx) => {
    const unitPrice = calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0;
    const specs = buildClientSpecs(calc.configSnapshot);

    // Estimate block height: name(6) + quantity(5) + specs(5 each) + prices(10) + spacing(8)
    const blockH = 30 + specs.length * 5;
    ensureSpace(blockH);

    // Light background card
    const cardTop = y - 2;
    
    // Product name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(BRAND.blue);
    doc.text(t(calc.recipeName), ml + 1, y + 3);

    // Index badge
    setFill(BRAND.blue);
    const badgeW = 5;
    doc.roundedRect(pw - mr - badgeW - 1, y - 2, badgeW + 2, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setColor(BRAND.white);
    doc.text(`${idx + 1}`, pw - mr - badgeW / 2, y + 2.5, { align: 'center' });

    y += 8;

    // Specs as structured rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    // Quantity
    setColor(BRAND.gray);
    doc.text(t('Tiraj:'), ml + 3, y);
    setColor(BRAND.dark);
    doc.text(t(`${calc.quantity} buc`), ml + 28, y);
    y += 5;

    specs.forEach((spec) => {
      setColor(BRAND.gray);
      doc.text(t(`${spec.label}:`), ml + 3, y);
      setColor(BRAND.dark);
      doc.text(t(spec.value), ml + 28, y);
      y += 5;
    });

    // Prices row
    y += 1;
    setFill(BRAND.blueLight);
    doc.roundedRect(ml, y - 3.5, contentW, 7, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(BRAND.gray);
    doc.text(t('Pre\u021B unitar:'), ml + 3, y + 1);
    setColor(BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(t(`${unitPrice.toFixed(2)} \u20AC + TVA`), ml + 28, y + 1);

    setColor(BRAND.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(t('Total:'), ml + contentW / 2 + 5, y + 1);
    setColor(BRAND.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(t(`${calc.totalPrice.toFixed(2)} \u20AC + TVA`), ml + contentW / 2 + 22, y + 1);

    y += 10;

    // Card bottom border
    doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
    doc.setLineWidth(0.2);
    if (idx < calculations.length - 1) {
      doc.line(ml + 2, y - 3, pw - mr - 2, y - 3);
    }
  });

  // ── D. TOTALS ──────────────────────────────────────────────────
  ensureSpace(40);
  y += 4;

  // Separator
  doc.setDrawColor(BRAND.blue[0], BRAND.blue[1], BRAND.blue[2]);
  doc.setLineWidth(0.5);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  const totalsX = pw - mr - 65;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(BRAND.gray);
  doc.text('Subtotal:', totalsX, y);
  setColor(BRAND.dark);
  doc.text(t(`${subtotal.toFixed(2)} \u20AC + TVA`), pw - mr, y, { align: 'right' });
  y += 6;

  if (discount > 0) {
    setColor(BRAND.orange);
    doc.text(t(`Discount (${discount}%):`), totalsX, y);
    doc.text(t(`-${discountAmount.toFixed(2)} \u20AC`), pw - mr, y, { align: 'right' });
    y += 6;
  }

  // Total highlight
  setFill(BRAND.blue);
  doc.roundedRect(totalsX - 4, y - 4, pw - mr - totalsX + 8, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(BRAND.white);
  doc.text('TOTAL:', totalsX, y + 3);
  doc.text(t(`${total.toFixed(2)} \u20AC + TVA`), pw - mr, y + 3, { align: 'right' });

  y += 20;

  // ── E. NOTES ───────────────────────────────────────────────────
  ensureSpace(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setColor(BRAND.dark);
  doc.text('Note:', ml, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(BRAND.gray);
  const notes = [
    t('Pre\u021Burile sunt exprimate \u00EEn EUR + TVA.'),
    t('Oferta este valabil\u0103 30 de zile de la data emiterii.'),
    t('Termenul de livrare va fi confirmat la plasarea comenzii.'),
  ];
  notes.forEach((n) => {
    doc.text(`\u2022  ${n}`, ml + 2, y);
    y += 4.5;
  });

  // ── FOOTER ─────────────────────────────────────────────────────
  renderFooter();

  // Save
  doc.save(`Oferta_${offerNumber}.pdf`);
  return offerNumber;
}
