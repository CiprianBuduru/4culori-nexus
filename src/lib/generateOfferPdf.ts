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
  blueMid: [30, 136, 200] as [number, number, number],
  blueLight: [238, 246, 252] as [number, number, number],
  bluePale: [245, 250, 255] as [number, number, number],
  dark: [35, 35, 40] as [number, number, number],
  text: [55, 55, 65] as [number, number, number],
  gray: [130, 130, 140] as [number, number, number],
  grayLight: [200, 200, 205] as [number, number, number],
  grayBg: [248, 248, 250] as [number, number, number],
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
  const ml = 22;
  const mr = 22;
  const cw = pw - ml - mr;
  const rx = pw - mr;
  let y = 0;

  await loadFont(doc, 'Roboto-Regular.ttf', 'normal');
  await loadFont(doc, 'Roboto-Bold.ttf', 'bold');
  doc.setFont(FONT, 'normal');

  // ── Helpers ───────────────────────────────────────────────
  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const draw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const font = (s: 'normal' | 'bold', sz: number) => { doc.setFont(FONT, s); doc.setFontSize(sz); };

  const pageFooter = () => {
    font('normal', 7);
    color(BRAND.grayLight);
    doc.text('4Culori  •  Tipografie & Print  •  www.4culori.ro', pw / 2, ph - 8, { align: 'center' });
  };

  const ensureSpace = (need: number) => {
    if (y + need > ph - 22) {
      pageFooter();
      doc.addPage();
      y = 22;
    }
  };

  // ─── TOP ACCENT ───────────────────────────────────────────
  fill(BRAND.blue);
  doc.rect(0, 0, pw, 2, 'F');

  // ─── HEADER ───────────────────────────────────────────────
  y = 20;

  // Brand
  font('bold', 22);
  color(BRAND.blue);
  doc.text('4CULORI', ml, y);
  font('normal', 9);
  color(BRAND.gray);
  doc.text('Tipografie & Print', ml, y + 6);

  // Meta – right aligned
  font('normal', 8.5);
  color(BRAND.gray);
  doc.text(`Ofertă: ${offerNumber}`, rx, y - 3, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, rx, y + 2.5, { align: 'right' });
  doc.text(`Valabil până: ${validUntil}`, rx, y + 8, { align: 'right' });

  // Header separator
  y += 16;
  draw(BRAND.blue);
  doc.setLineWidth(0.5);
  doc.line(ml, y, rx, y);
  draw(BRAND.blueLight);
  doc.setLineWidth(0.2);
  doc.line(ml, y + 1, rx, y + 1);

  // ─── TITLE ────────────────────────────────────────────────
  y += 14;
  font('bold', 15);
  color(BRAND.dark);
  doc.text('OFERTĂ DE PREȚ', ml, y);
  y += 6;
  font('normal', 8.5);
  color(BRAND.gray);
  doc.text('Specificațiile produselor ofertate și prețurile finale', ml, y);
  y += 10;

  // ─── CLIENT ───────────────────────────────────────────────
  if (clientName) {
    // Light background card for client
    fill(BRAND.bluePale);
    doc.roundedRect(ml, y - 4, cw, clientEmail ? 16 : 12, 2, 2, 'F');

    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Către:', ml + 5, y + 1);
    font('bold', 9);
    color(BRAND.dark);
    doc.text(clientName, ml + 20, y + 1);

    if (clientEmail) {
      font('normal', 8);
      color(BRAND.gray);
      doc.text('Email:', ml + 5, y + 7);
      color(BRAND.text);
      doc.text(clientEmail, ml + 20, y + 7);
    }
    y += clientEmail ? 20 : 16;
  }

  y += 4;

  // ─── PRODUCTS ─────────────────────────────────────────────
  const specLabelX = ml + 8;
  const specValueX = ml + 50;

  calculations.forEach((calc, idx) => {
    const unitPrice = calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0;
    const specs = buildClientSpecs(calc.configSnapshot);

    // Estimate block height
    const specRows = specs.length + 1; // +1 for Tiraj
    const blockH = 12 + 6 + specRows * 5.5 + 4 + 12 + 16;
    ensureSpace(blockH);

    // ── Product card background
    fill(BRAND.grayBg);
    const cardH = 10 + 6 + specRows * 5.5 + 4 + 12 + 4;
    doc.roundedRect(ml, y - 3, cw, cardH, 2.5, 2.5, 'F');

    // Left accent bar
    fill(BRAND.blue);
    doc.roundedRect(ml, y - 3, 1.2, cardH, 0.6, 0.6, 'F');

    // Product title
    font('bold', 11);
    color(BRAND.blue);
    doc.text(`${idx + 1}.  ${calc.recipeName}`, ml + 6, y + 2);
    y += 8;

    // Section label
    font('normal', 7.5);
    color(BRAND.gray);
    doc.text('Specificațiile produsului ofertat', specLabelX, y);
    y += 6;

    // Specs – two-column
    // Tiraj first
    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Tiraj:', specLabelX, y);
    font('bold', 8.5);
    color(BRAND.text);
    doc.text(`${calc.quantity} bucăți`, specValueX, y);
    y += 5.5;

    specs.forEach((spec) => {
      font('normal', 8.5);
      color(BRAND.gray);
      doc.text(`${spec.label}:`, specLabelX, y);
      font('normal', 8.5);
      color(BRAND.text);
      doc.text(spec.value, specValueX, y);
      y += 5.5;
    });

    y += 2;

    // Price row – light blue bar inside card
    fill(BRAND.blueLight);
    doc.roundedRect(ml + 4, y - 4, cw - 8, 10, 1.5, 1.5, 'F');

    font('normal', 8.5);
    color(BRAND.gray);
    doc.text('Preț / bucată:', ml + 8, y + 2);
    font('bold', 9);
    color(BRAND.dark);
    doc.text(`${unitPrice.toFixed(2)} € + TVA`, ml + 42, y + 2);

    const midX = ml + cw / 2 + 2;
    font('normal', 8.5);
    color(BRAND.gray);
    doc.text(`Total produs (${calc.quantity} buc):`, midX, y + 2);
    font('bold', 9);
    color(BRAND.blue);
    doc.text(`${calc.totalPrice.toFixed(2)} € + TVA`, rx - 4, y + 2, { align: 'right' });

    y += 14;

    // Spacing between product cards
    y += 6;
  });

  // ─── TOTALS ───────────────────────────────────────────────
  ensureSpace(50);
  y += 2;

  // Totals separator
  draw(BRAND.blue);
  doc.setLineWidth(0.4);
  doc.line(ml, y, rx, y);
  y += 10;

  const totLabelX = rx - 80;

  // Subtotal
  font('normal', 9.5);
  color(BRAND.gray);
  doc.text('Subtotal:', totLabelX, y);
  font('normal', 9.5);
  color(BRAND.dark);
  doc.text(`${subtotal.toFixed(2)} € + TVA`, rx, y, { align: 'right' });
  y += 7;

  // Discount
  if (discount > 0) {
    font('normal', 9.5);
    color(BRAND.blueMid);
    doc.text(`Discount (${discount}%):`, totLabelX, y);
    doc.text(`-${discountAmount.toFixed(2)} €`, rx, y, { align: 'right' });
    y += 7;
  }

  // Total highlight bar
  y += 2;
  const totalBarW = rx - totLabelX + 12;
  fill(BRAND.blue);
  doc.roundedRect(totLabelX - 6, y - 5, totalBarW, 14, 2.5, 2.5, 'F');
  font('bold', 12);
  color(BRAND.white);
  doc.text('TOTAL OFERTĂ:', totLabelX, y + 4);
  doc.text(`${total.toFixed(2)} € + TVA`, rx, y + 4, { align: 'right' });

  y += 26;

  // ─── NOTES ────────────────────────────────────────────────
  ensureSpace(36);

  // Notes background
  fill(BRAND.grayBg);
  doc.roundedRect(ml, y - 4, cw, 32, 2, 2, 'F');

  font('bold', 8.5);
  color(BRAND.dark);
  doc.text('Note', ml + 5, y + 1);
  y += 6;

  font('normal', 7.5);
  color(BRAND.gray);
  const notes = [
    'Prețurile sunt exprimate în EUR + TVA.',
    'Oferta este valabilă 30 de zile de la data emiterii.',
    'Termenul de livrare va fi confirmat la plasarea comenzii.',
  ];
  notes.forEach((n) => {
    doc.text(`•   ${n}`, ml + 5, y + 1);
    y += 5;
  });

  y += 4;
  font('normal', 7.5);
  color(BRAND.blueMid);
  doc.text('Vă mulțumim pentru interesul acordat serviciilor 4Culori.', ml + 5, y);

  // Page footer
  pageFooter();

  doc.save(`Oferta_${offerNumber}.pdf`);
  return offerNumber;
}
