/**
 * Invoice PDF Generation Service
 * Generates branded PDF invoices for download
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  
  // Company info (seller)
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyTaxId?: string;
  
  // Customer info
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  
  // Line items
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  
  // Totals
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  currency: string;
  
  // Payment info
  paymentMethod?: string;
  paymentDate?: Date;
  transactionId?: string;
  
  // Notes
  notes?: string;
  terms?: string;
}

// Format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Generate PDF invoice
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: data.companyName,
          Subject: `Invoice for ${data.customerName}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // Account for margins
      const primaryColor = '#1a1a2e';
      const accentColor = '#4f46e5';
      const textColor = '#374151';
      const mutedColor = '#6b7280';

      // Header with company branding
      doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
      
      // Company name
      doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.companyName, 50, 40);
      
      // Invoice label
      doc.fontSize(12)
        .font('Helvetica')
        .text('INVOICE', 50, 75);

      // Invoice number and status on right side
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text(data.invoiceNumber, doc.page.width - 200, 40, { width: 150, align: 'right' });
      
      // Status badge
      const statusColors: Record<string, string> = {
        paid: '#10b981',
        open: '#f59e0b',
        void: '#6b7280',
        uncollectible: '#ef4444',
      };
      const statusColor = statusColors[data.status] || '#6b7280';
      const statusText = data.status.toUpperCase();
      const statusWidth = 60;
      const statusX = doc.page.width - 50 - statusWidth;
      
      doc.roundedRect(statusX, 65, statusWidth, 20, 3)
        .fill(statusColor);
      doc.fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(statusText, statusX, 70, { width: statusWidth, align: 'center' });

      // Reset position after header
      doc.y = 150;

      // Company and customer info section
      const infoY = 150;
      
      // From section (Company)
      doc.fillColor(mutedColor)
        .fontSize(10)
        .font('Helvetica')
        .text('FROM', 50, infoY);
      
      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.companyName, 50, infoY + 15);
      
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(mutedColor);
      
      let companyY = infoY + 30;
      if (data.companyAddress) {
        const addressLines = data.companyAddress.split('\n');
        addressLines.forEach(line => {
          doc.text(line, 50, companyY);
          companyY += 12;
        });
      }
      if (data.companyEmail) {
        doc.text(data.companyEmail, 50, companyY);
        companyY += 12;
      }
      if (data.companyPhone) {
        doc.text(data.companyPhone, 50, companyY);
        companyY += 12;
      }
      if (data.companyTaxId) {
        doc.text(`Tax ID: ${data.companyTaxId}`, 50, companyY);
      }

      // Bill To section (Customer)
      const billToX = 300;
      doc.fillColor(mutedColor)
        .fontSize(10)
        .font('Helvetica')
        .text('BILL TO', billToX, infoY);
      
      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.customerName, billToX, infoY + 15);
      
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(mutedColor);
      
      let customerY = infoY + 30;
      if (data.customerAddress) {
        const addressLines = data.customerAddress.split('\n');
        addressLines.forEach(line => {
          doc.text(line, billToX, customerY);
          customerY += 12;
        });
      }
      doc.text(data.customerEmail, billToX, customerY);

      // Invoice details (dates)
      const detailsY = Math.max(companyY, customerY) + 30;
      
      doc.fillColor(mutedColor)
        .fontSize(10)
        .text('Invoice Date:', 50, detailsY)
        .text('Due Date:', 50, detailsY + 15);
      
      doc.fillColor(textColor)
        .text(formatDate(data.invoiceDate), 130, detailsY)
        .text(formatDate(data.dueDate), 130, detailsY + 15);

      if (data.paymentDate && data.status === 'paid') {
        doc.fillColor(mutedColor)
          .text('Paid Date:', 50, detailsY + 30);
        doc.fillColor(textColor)
          .text(formatDate(data.paymentDate), 130, detailsY + 30);
      }

      // Line items table
      const tableY = detailsY + 60;
      const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount'];
      const colWidths = [pageWidth * 0.5, pageWidth * 0.1, pageWidth * 0.2, pageWidth * 0.2];
      const colX = [50, 50 + colWidths[0], 50 + colWidths[0] + colWidths[1], 50 + colWidths[0] + colWidths[1] + colWidths[2]];

      // Table header
      doc.rect(50, tableY, pageWidth, 25).fill('#f3f4f6');
      doc.fillColor(textColor)
        .fontSize(10)
        .font('Helvetica-Bold');
      
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        doc.text(header, colX[i] + 5, tableY + 8, { 
          width: colWidths[i] - 10, 
          align 
        });
      });

      // Table rows
      let rowY = tableY + 25;
      doc.font('Helvetica').fontSize(10);

      data.lineItems.forEach((item, index) => {
        const rowHeight = 30;
        
        // Alternate row background
        if (index % 2 === 1) {
          doc.rect(50, rowY, pageWidth, rowHeight).fill('#fafafa');
        }
        
        doc.fillColor(textColor);
        doc.text(item.description, colX[0] + 5, rowY + 10, { width: colWidths[0] - 10 });
        doc.text(item.quantity.toString(), colX[1] + 5, rowY + 10, { width: colWidths[1] - 10, align: 'right' });
        doc.text(formatCurrency(item.unitPrice, data.currency), colX[2] + 5, rowY + 10, { width: colWidths[2] - 10, align: 'right' });
        doc.text(formatCurrency(item.amount, data.currency), colX[3] + 5, rowY + 10, { width: colWidths[3] - 10, align: 'right' });
        
        rowY += rowHeight;
      });

      // Totals section
      const totalsY = rowY + 20;
      const totalsX = colX[2];
      const totalsWidth = colWidths[2] + colWidths[3];

      // Subtotal
      doc.fillColor(mutedColor)
        .text('Subtotal:', totalsX, totalsY, { width: colWidths[2] - 10, align: 'right' });
      doc.fillColor(textColor)
        .text(formatCurrency(data.subtotal, data.currency), colX[3] + 5, totalsY, { width: colWidths[3] - 10, align: 'right' });

      let currentTotalY = totalsY + 18;

      // Tax
      if (data.tax && data.tax > 0) {
        const taxLabel = data.taxRate ? `Tax (${data.taxRate}%):` : 'Tax:';
        doc.fillColor(mutedColor)
          .text(taxLabel, totalsX, currentTotalY, { width: colWidths[2] - 10, align: 'right' });
        doc.fillColor(textColor)
          .text(formatCurrency(data.tax, data.currency), colX[3] + 5, currentTotalY, { width: colWidths[3] - 10, align: 'right' });
        currentTotalY += 18;
      }

      // Discount
      if (data.discount && data.discount > 0) {
        doc.fillColor(mutedColor)
          .text('Discount:', totalsX, currentTotalY, { width: colWidths[2] - 10, align: 'right' });
        doc.fillColor('#10b981')
          .text(`-${formatCurrency(data.discount, data.currency)}`, colX[3] + 5, currentTotalY, { width: colWidths[3] - 10, align: 'right' });
        currentTotalY += 18;
      }

      // Total line
      doc.moveTo(totalsX, currentTotalY).lineTo(50 + pageWidth, currentTotalY).stroke('#e5e7eb');
      currentTotalY += 10;

      // Total
      doc.fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', totalsX, currentTotalY, { width: colWidths[2] - 10, align: 'right' });
      doc.text(formatCurrency(data.total, data.currency), colX[3] + 5, currentTotalY, { width: colWidths[3] - 10, align: 'right' });
      currentTotalY += 22;

      // Amount paid and due
      if (data.amountPaid !== undefined && data.amountPaid > 0) {
        doc.font('Helvetica')
          .fontSize(10)
          .fillColor(mutedColor)
          .text('Amount Paid:', totalsX, currentTotalY, { width: colWidths[2] - 10, align: 'right' });
        doc.fillColor('#10b981')
          .text(formatCurrency(data.amountPaid, data.currency), colX[3] + 5, currentTotalY, { width: colWidths[3] - 10, align: 'right' });
        currentTotalY += 18;
      }

      if (data.amountDue !== undefined && data.amountDue > 0) {
        doc.rect(totalsX - 5, currentTotalY - 5, totalsWidth + 10, 25).fill(accentColor);
        doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('Amount Due:', totalsX, currentTotalY, { width: colWidths[2] - 10, align: 'right' });
        doc.text(formatCurrency(data.amountDue, data.currency), colX[3] + 5, currentTotalY, { width: colWidths[3] - 10, align: 'right' });
        currentTotalY += 30;
      }

      // Payment information
      if (data.paymentMethod || data.transactionId) {
        const paymentY = currentTotalY + 20;
        doc.fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(10)
          .text('PAYMENT INFORMATION', 50, paymentY);
        
        let paymentInfoY = paymentY + 15;
        doc.fillColor(textColor);
        
        if (data.paymentMethod) {
          doc.text(`Payment Method: ${data.paymentMethod}`, 50, paymentInfoY);
          paymentInfoY += 15;
        }
        if (data.transactionId) {
          doc.text(`Transaction ID: ${data.transactionId}`, 50, paymentInfoY);
        }
      }

      // Notes section
      if (data.notes) {
        const notesY = doc.y + 40;
        doc.fillColor(mutedColor)
          .fontSize(10)
          .text('NOTES', 50, notesY);
        doc.fillColor(textColor)
          .text(data.notes, 50, notesY + 15, { width: pageWidth });
      }

      // Terms section
      if (data.terms) {
        const termsY = doc.y + 20;
        doc.fillColor(mutedColor)
          .fontSize(10)
          .text('TERMS & CONDITIONS', 50, termsY);
        doc.fillColor(textColor)
          .fontSize(9)
          .text(data.terms, 50, termsY + 15, { width: pageWidth });
      }

      // Footer
      const footerY = doc.page.height - 60;
      doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).stroke('#e5e7eb');
      
      doc.fillColor(mutedColor)
        .fontSize(9)
        .text(
          `Thank you for your business! | ${data.companyWebsite || data.companyEmail}`,
          50,
          footerY + 15,
          { width: pageWidth, align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate invoice data from Stripe invoice
export function stripeInvoiceToInvoiceData(
  stripeInvoice: any,
  companyInfo: {
    name: string;
    address: string;
    email: string;
    phone?: string;
    website?: string;
    taxId?: string;
  }
): InvoiceData {
  const lineItems = (stripeInvoice.lines?.data || []).map((line: any) => ({
    description: line.description || 'Subscription',
    quantity: line.quantity || 1,
    unitPrice: line.unit_amount || line.amount,
    amount: line.amount,
  }));

  return {
    invoiceNumber: stripeInvoice.number || `INV-${stripeInvoice.id}`,
    invoiceDate: new Date((stripeInvoice.created || Date.now() / 1000) * 1000),
    dueDate: new Date((stripeInvoice.due_date || stripeInvoice.created || Date.now() / 1000) * 1000),
    status: stripeInvoice.status as 'paid' | 'open' | 'void' | 'uncollectible',
    
    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
    companyEmail: companyInfo.email,
    companyPhone: companyInfo.phone,
    companyWebsite: companyInfo.website,
    companyTaxId: companyInfo.taxId,
    
    customerName: stripeInvoice.customer_name || stripeInvoice.customer_email || 'Customer',
    customerEmail: stripeInvoice.customer_email || '',
    customerAddress: stripeInvoice.customer_address 
      ? `${stripeInvoice.customer_address.line1 || ''}\n${stripeInvoice.customer_address.city || ''}, ${stripeInvoice.customer_address.state || ''} ${stripeInvoice.customer_address.postal_code || ''}\n${stripeInvoice.customer_address.country || ''}`
      : undefined,
    
    lineItems,
    
    subtotal: stripeInvoice.subtotal || 0,
    tax: stripeInvoice.tax || 0,
    discount: stripeInvoice.total_discount_amounts?.[0]?.amount || 0,
    total: stripeInvoice.total || 0,
    amountPaid: stripeInvoice.amount_paid || 0,
    amountDue: stripeInvoice.amount_due || 0,
    currency: stripeInvoice.currency?.toUpperCase() || 'USD',
    
    paymentMethod: stripeInvoice.default_payment_method?.card 
      ? `${stripeInvoice.default_payment_method.card.brand} •••• ${stripeInvoice.default_payment_method.card.last4}`
      : undefined,
    paymentDate: stripeInvoice.status_transitions?.paid_at 
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
      : undefined,
    transactionId: stripeInvoice.charge || stripeInvoice.payment_intent,
    
    notes: stripeInvoice.description || undefined,
    terms: 'Payment is due within 30 days of invoice date. Late payments may be subject to additional fees.',
  };
}
