import jsPDF from 'jspdf';
import { RecipeCalculation, categoryLabels, RecipeCategory } from '@/types/recipes';

interface OfferData {
  calculations: RecipeCalculation[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  total: number;
  offerNumber?: string;
  clientName?: string;
  validUntil?: string;
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
    validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO'),
  } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Colors
  const brandBlue = [0, 113, 188];
  const brandOrange = [255, 127, 80];
  const textGray = [100, 100, 100];
  const darkText = [30, 30, 30];

  // Header
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('4CULORI', margin, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Tipografie & Print', margin, 36);

  // Offer number and date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(`Ofertă: ${offerNumber}`, pageWidth - margin, 24, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('ro-RO')}`, pageWidth - margin, 32, { align: 'right' });
  doc.text(`Valabil până: ${validUntil}`, pageWidth - margin, 40, { align: 'right' });

  yPos = 60;

  // Client info (if provided)
  if (clientName) {
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.setFontSize(10);
    doc.text('Client:', margin, yPos);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, margin + 25, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 15;
  }

  // Title
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OFERTĂ DE PREȚ', margin, yPos);
  yPos += 15;

  // Table header
  const colWidths = [80, 25, 30, 35];
  const tableStart = margin;

  doc.setFillColor(245, 245, 245);
  doc.rect(tableStart, yPos - 5, pageWidth - 2 * margin, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Produs', tableStart + 2, yPos + 2);
  doc.text('Cantitate', tableStart + colWidths[0], yPos + 2);
  doc.text('Preț unit.', tableStart + colWidths[0] + colWidths[1], yPos + 2);
  doc.text('Total', tableStart + colWidths[0] + colWidths[1] + colWidths[2], yPos + 2);

  yPos += 12;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);

  // Group by category
  const grouped = calculations.reduce((acc, calc) => {
    if (!acc[calc.category]) acc[calc.category] = [];
    acc[calc.category].push(calc);
    return acc;
  }, {} as Record<RecipeCategory, RecipeCalculation[]>);

  Object.entries(grouped).forEach(([category, items]) => {
    // Category header
    doc.setFillColor(250, 250, 250);
    doc.rect(tableStart, yPos - 4, pageWidth - 2 * margin, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(brandOrange[0], brandOrange[1], brandOrange[2]);
    doc.text(categoryLabels[category as RecipeCategory] || category, tableStart + 2, yPos + 1);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);

    items.forEach((calc) => {
      const unitPrice = calc.quantity > 0 ? calc.totalPrice / calc.quantity : 0;

      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(9);
      
      // Truncate long names
      const maxNameLength = 45;
      const displayName = calc.recipeName.length > maxNameLength 
        ? calc.recipeName.substring(0, maxNameLength) + '...'
        : calc.recipeName;

      doc.text(displayName, tableStart + 2, yPos);
      doc.text(calc.quantity.toString(), tableStart + colWidths[0], yPos);
      doc.text(`${unitPrice.toFixed(2)} RON`, tableStart + colWidths[0] + colWidths[1], yPos);
      doc.text(`${calc.totalPrice.toFixed(2)} RON`, tableStart + colWidths[0] + colWidths[1] + colWidths[2], yPos);

      // Dimensions if available
      if (calc.dimensions && (calc.dimensions.width || calc.dimensions.height)) {
        yPos += 5;
        doc.setFontSize(7);
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        const dimText = calc.dimensions.depth 
          ? `${calc.dimensions.width} x ${calc.dimensions.height} x ${calc.dimensions.depth} cm`
          : `${calc.dimensions.width} x ${calc.dimensions.height} cm`;
        doc.text(`  Dimensiuni: ${dimText}`, tableStart + 2, yPos);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      }

      yPos += 8;
    });

    yPos += 5;
  });

  // Summary section
  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  const summaryX = pageWidth - margin - 80;

  doc.setFontSize(10);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Subtotal:', summaryX, yPos);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(`${subtotal.toFixed(2)} RON`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 8;

  if (discount > 0) {
    doc.setTextColor(brandOrange[0], brandOrange[1], brandOrange[2]);
    doc.text(`Discount (${discount}%):`, summaryX, yPos);
    doc.text(`-${discountAmount.toFixed(2)} RON`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 8;
  }

  // Total
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.rect(summaryX - 10, yPos - 5, pageWidth - margin - summaryX + 10, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', summaryX, yPos + 3);
  doc.text(`${total.toFixed(2)} RON`, pageWidth - margin, yPos + 3, { align: 'right' });

  yPos += 25;

  // Footer notes
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Note:', margin, yPos);
  yPos += 5;
  doc.text('• Prețurile includ TVA', margin, yPos);
  yPos += 4;
  doc.text('• Oferta este valabilă 30 de zile de la data emiterii', margin, yPos);
  yPos += 4;
  doc.text('• Pentru comenzi speciale, termenul de livrare va fi stabilit la confirmare', margin, yPos);

  // Bottom line
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.setLineWidth(2);
  doc.line(0, pageHeight - 15, pageWidth, pageHeight - 15);

  doc.setFontSize(8);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('4Culori • Tipografie & Personalizări • www.4culori.ro', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save the PDF
  doc.save(`Oferta_${offerNumber}.pdf`);

  return offerNumber;
}
