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

const BRAND = {
  blue: [0, 113, 188] as [number, number, number],
  blueLight: [235, 245, 252] as [number, number, number],
  dark: [40, 40, 40] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  grayLight: [210, 210, 210] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const FONT = 'Roboto';

async function loadFont(doc: jsPDF, fileName: string, style: string) {
  const resp = await fetch(`/fonts/${fileName}`);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  doc.addFileToVFS(fileName, btoa(binary));
  doc.addFont(fileName, FONT, style);
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
    validUntil = new Date(Date.now() + 30 * 86400000).toLocaleDateString('ro-RO'),
  } = data;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20;
  const mr = 20;
  const cw = pw - ml - mr;
  const specLabelX = ml + 6;
  const specValueX = ml + 48;
  let y = 0;

  await loadFont(doc, 'Roboto-Regular.ttf', 'normal');
  await loadFont(doc, 'Roboto-Bold.ttf', 'bold');
  doc.setFont(FONT, 'normal');

  // Helpers
  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const font = (s: 'normal' | 'bold', sz: number) => { doc.setFont(FONT, s); doc.setFontSize(sz); };

  const footer = () => {
    font('normal', 7);
    color(BRAND.grayLight);
    doc.text('4Culori • Tipografie & Personalizări • www.4culori.ro', pw / 2, ph - 8, { align: 'center' });
  };

  const ensureSpace = (need: number) => {
    if (y + need > ph - 20) {
      footer();
      doc.addPage();
      y = 20;
    }
  };

  // ─── HEADER ───────────────────────────────────────────────
  // Thin brand accent
  fill(BRAND.blue);
  doc.rect(0, 0, pw, 1.5, 'F');

  y = 18;

  // Left: brand
  font('bold', 18);
  color(BRAND.blue);
  doc.text('4CULORI', ml, y);
  font('normal', 8.5);
  color(BRAND.gray);
  doc.text('Tipografie & Print', ml, y + 5);

  // Right: meta
  const rx = pw - mr;
  font('normal', 8.5);
  color(BRAND.gray);
  doc.text(`Ofertă: ${offerNumber}`, rx, y - 4, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, rx, y + 1, { align: 'right' });
  doc.text(`Valabil până: ${validUntil}`, rx, y + 6, { align: 'right' });

  // Separator
  y += 12;
  doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
  doc.setLineWidth(0.3);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  // ─── TITLE + CLIENT ──────────────────────────────────────
  font('bold', 13);
  color(BRAND.dark);
  doc.text('OFERTĂ DE PREȚ', ml, y);
  y += 8;

  if (clientName) {
    font('normal', 9);
    color(BRAND.gray);
    doc.text('Către:', ml, y);
    font('bold', 9);
    color(BRAND.dark);
    doc.text(clientName, ml + 14, y);
    y += 5;
    if (clientEmail) {
      font('normal', 8.5);
      color(BRAND.gray);
      doc.text(clientEmail, ml + 14, y);
      y += 5;
    }
    y += 4;
  } else {
    y += 3;
  }

  // ─── PRODUCTS ─────────────────────────────────────────────
  calculations.forEach((calc, idx) => {
    const unitPrice = calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0;
    const specs = buildClientSpecs(calc.configSnapshot);

    // Estimate block height: title + quantity row + specs + price bar + spacing
    const blockH = 14 + (specs.length + 1) * 5.5 + 14;
    ensureSpace(blockH);

    // Product title
    font('bold', 10.5);
    color(BRAND.blue);
    doc.text(`${idx + 1}.  ${calc.recipeName}`, ml, y);
    y += 7;

    // Quantity row
    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Tiraj:', specLabelX, y);
    color(BRAND.dark);
    doc.text(`${calc.quantity} buc`, specValueX, y);
    y += 5.5;

    // Specs — two-column aligned
    specs.forEach((spec) => {
      font('normal', 8.5);
      color(BRAND.gray);
      doc.text(`${spec.label}:`, specLabelX, y);
      color(BRAND.dark);
      doc.text(spec.value, specValueX, y);
      y += 5.5;
    });

    y += 1;

    // Price bar
    fill(BRAND.blueLight);
    doc.roundedRect(ml, y - 4, cw, 9, 1.5, 1.5, 'F');

    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Preț / buc:', ml + 4, y + 1.5);
    font('bold', 8.5);
    color(BRAND.dark);
    doc.text(`${unitPrice.toFixed(2)} € + TVA`, ml + 28, y + 1.5);

    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Total produs:', ml + cw / 2 + 4, y + 1.5);
    font('bold', 8.5);
    color(BRAND.dark);
    doc.text(`${calc.totalPrice.toFixed(2)} € + TVA`, ml + cw / 2 + 32, y + 1.5);

    y += 14;

    // Separator between products
    if (idx < calculations.length - 1) {
      doc.setDrawColor(BRAND.grayLight[0], BRAND.grayLight[1], BRAND.grayLight[2]);
      doc.setLineWidth(0.15);
      doc.line(ml + 4, y - 4, pw - mr - 4, y - 4);
    }
  });

  // ─── TOTALS ───────────────────────────────────────────────
  ensureSpace(40);
  y += 2;

  doc.setDrawColor(BRAND.blue[0], BRAND.blue[1], BRAND.blue[2]);
  doc.setLineWidth(0.4);
  doc.line(ml, y, pw - mr, y);
  y += 8;

  const totX = pw - mr - 72;

  // Subtotal
  font('normal', 9);
  color(BRAND.gray);
  doc.text('Subtotal:', totX, y);
  color(BRAND.dark);
  doc.text(`${subtotal.toFixed(2)} € + TVA`, pw - mr, y, { align: 'right' });
  y += 6;

  // Discount
  if (discount > 0) {
    font('normal', 9);
    color(BRAND.blue);
    doc.text(`Discount (${discount}%):`, totX, y);
    doc.text(`-${discountAmount.toFixed(2)} €`, pw - mr, y, { align: 'right' });
    y += 6;
  }

  // Total highlight
  fill(BRAND.blue);
  const totalBarW = pw - mr - totX + 8;
  doc.roundedRect(totX - 4, y - 4, totalBarW, 11, 2, 2, 'F');
  font('bold', 11);
  color(BRAND.white);
  doc.text('TOTAL OFERTĂ:', totX, y + 3.5);
  doc.text(`${total.toFixed(2)} € + TVA`, pw - mr, y + 3.5, { align: 'right' });

  y += 22;

  // ─── NOTES ────────────────────────────────────────────────
  ensureSpace(26);

  font('bold', 8);
  color(BRAND.dark);
  doc.text('Note:', ml, y);
  y += 5;

  font('normal', 7.5);
  color(BRAND.gray);
  const notes = [
    'Prețurile sunt exprimate în EUR + TVA.',
    'Oferta este valabilă 30 de zile de la data emiterii.',
    'Termenul de livrare va fi confirmat la plasarea comenzii.',
  ];
  notes.forEach((n) => {
    doc.text(`•  ${n}`, ml + 2, y);
    y += 4.5;
  });

  // Footer
  footer();

  doc.save(`Oferta_${offerNumber}.pdf`);
  return offerNumber;
}
