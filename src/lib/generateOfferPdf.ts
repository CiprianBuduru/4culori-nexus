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
  grayLight: [200, 200, 200] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const FONT_NAME = 'Roboto';

/** Load a TTF from public/fonts/ and register it with jsPDF */
async function loadFont(doc: jsPDF, fileName: string, style: string) {
  const resp = await fetch(`/fonts/${fileName}`);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const fontFileKey = fileName;
  doc.addFileToVFS(fontFileKey, base64);
  doc.addFont(fontFileKey, FONT_NAME, style);
}

export async function generateOfferPdf(data: OfferData) {
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
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 18;
  const mr = 18;
  const contentW = pw - ml - mr;
  let y = 0;

  // ── Load fonts ────────────────────────────────────────────────
  await loadFont(doc, 'Roboto-Regular.ttf', 'normal');
  await loadFont(doc, 'Roboto-Bold.ttf', 'bold');
  doc.setFont(FONT_NAME, 'normal');

  // ── Helpers ───────────────────────────────────────────────────
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const font = (style: 'normal' | 'bold', size: number) => {
    doc.setFont(FONT_NAME, style);
    doc.setFontSize(size);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 25) {
      renderFooter();
      doc.addPage();
      y = 18;
    }
  };

  const renderFooter = () => {
    doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
    doc.setLineWidth(0.3);
    doc.line(ml, ph - 14, pw - mr, ph - 14);
    font('normal', 7);
    setColor(BRAND.grayLight);
    doc.text('4Culori \u2022 Tipografie & Personalizări \u2022 www.4culori.ro', pw / 2, ph - 9, { align: 'center' });
  };

  // ══════════════════════════════════════════════════════════════
  // A. HEADER
  // ══════════════════════════════════════════════════════════════
  setFill(BRAND.blue);
  doc.rect(0, 0, pw, 2.5, 'F');

  y = 16;
  font('bold', 20);
  setColor(BRAND.blue);
  doc.text('4CULORI', ml, y);

  font('normal', 9);
  setColor(BRAND.gray);
  doc.text('Tipografie & Print', ml, y + 5.5);

  // Right — offer metadata
  const rightX = pw - mr;
  font('normal', 9);
  setColor(BRAND.gray);
  doc.text(`Ofertă: ${offerNumber}`, rightX, y - 3, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, rightX, y + 2, { align: 'right' });
  doc.text(`Valabil până: ${validUntil}`, rightX, y + 7, { align: 'right' });

  y += 14;
  doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
  doc.setLineWidth(0.3);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  // ══════════════════════════════════════════════════════════════
  // B. CLIENT
  // ══════════════════════════════════════════════════════════════
  font('bold', 12);
  setColor(BRAND.dark);
  doc.text('OFERTĂ DE PREȚ', ml, y);
  y += 7;

  if (clientName) {
    font('normal', 9);
    setColor(BRAND.gray);
    doc.text('Către:', ml, y);
    font('bold', 9);
    setColor(BRAND.dark);
    doc.text(clientName, ml + 16, y);
    y += 5;

    if (clientEmail) {
      font('normal', 9);
      setColor(BRAND.gray);
      doc.text(clientEmail, ml + 16, y);
      y += 5;
    }
    y += 4;
  } else {
    y += 5;
  }

  // ══════════════════════════════════════════════════════════════
  // C. PRODUCTS
  // ══════════════════════════════════════════════════════════════
  calculations.forEach((calc, idx) => {
    const unitPrice = calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0;
    const specs = buildClientSpecs(calc.configSnapshot);
    const blockH = 32 + specs.length * 5.5;
    ensureSpace(blockH);

    // Product heading
    font('bold', 11);
    setColor(BRAND.blue);
    doc.text(`${idx + 1}. ${calc.recipeName}`, ml, y + 3);
    y += 9;

    // Specs
    font('normal', 9);

    // Quantity
    setColor(BRAND.gray);
    doc.text('Tiraj:', ml + 4, y);
    setColor(BRAND.dark);
    doc.text(`${calc.quantity} buc`, ml + 30, y);
    y += 5.5;

    specs.forEach((spec) => {
      setColor(BRAND.gray);
      doc.text(`${spec.label}:`, ml + 4, y);
      setColor(BRAND.dark);
      doc.text(spec.value, ml + 30, y);
      y += 5.5;
    });

    // Price row
    y += 1;
    setFill(BRAND.blueLight);
    doc.roundedRect(ml, y - 4, contentW, 8, 1.5, 1.5, 'F');

    font('normal', 9);
    setColor(BRAND.gray);
    doc.text('Preț unitar:', ml + 4, y + 1);
    font('bold', 9);
    setColor(BRAND.dark);
    doc.text(`${unitPrice.toFixed(2)} € + TVA`, ml + 30, y + 1);

    font('normal', 9);
    setColor(BRAND.gray);
    doc.text('Total:', ml + contentW / 2 + 8, y + 1);
    font('bold', 9);
    setColor(BRAND.dark);
    doc.text(`${calc.totalPrice.toFixed(2)} € + TVA`, ml + contentW / 2 + 24, y + 1);

    y += 12;

    // Separator between products
    if (idx < calculations.length - 1) {
      doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
      doc.setLineWidth(0.15);
      doc.line(ml + 2, y - 4, pw - mr - 2, y - 4);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // D. TOTALS
  // ══════════════════════════════════════════════════════════════
  ensureSpace(38);
  y += 4;

  doc.setDrawColor(BRAND.blue[0], BRAND.blue[1], BRAND.blue[2]);
  doc.setLineWidth(0.4);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  const totalsX = pw - mr - 70;

  font('normal', 9);
  setColor(BRAND.gray);
  doc.text('Subtotal:', totalsX, y);
  setColor(BRAND.dark);
  doc.text(`${subtotal.toFixed(2)} € + TVA`, pw - mr, y, { align: 'right' });
  y += 6;

  if (discount > 0) {
    setColor(BRAND.orange);
    doc.text(`Discount (${discount}%):`, totalsX, y);
    doc.text(`-${discountAmount.toFixed(2)} €`, pw - mr, y, { align: 'right' });
    y += 6;
  }

  // Total highlight
  setFill(BRAND.blue);
  doc.roundedRect(totalsX - 4, y - 4, pw - mr - totalsX + 8, 10, 2, 2, 'F');
  font('bold', 11);
  setColor(BRAND.white);
  doc.text('TOTAL:', totalsX, y + 3);
  doc.text(`${total.toFixed(2)} € + TVA`, pw - mr, y + 3, { align: 'right' });

  y += 20;

  // ══════════════════════════════════════════════════════════════
  // E. NOTES
  // ══════════════════════════════════════════════════════════════
  ensureSpace(28);

  font('bold', 8);
  setColor(BRAND.dark);
  doc.text('Note:', ml, y);
  y += 5;

  font('normal', 7.5);
  setColor(BRAND.gray);
  const notes = [
    'Prețurile sunt exprimate în EUR + TVA.',
    'Oferta este valabilă 30 de zile de la data emiterii.',
    'Termenul de livrare va fi confirmat la plasarea comenzii.',
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
