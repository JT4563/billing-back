import { Invoice } from '../models/Invoice.js';
import { nextInvoiceNumber } from '../utils/invoiceNumber.js';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); };

export const createInvoice = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const {
      companyName, companyPhone, companyAddress, companyGst,
      ratePerTon, trucks, notes
    } = req.body;

    if (!companyName || !companyAddress || !companyGst || ratePerTon == null || trucks == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const total = Number(ratePerTon) * Number(trucks);
    const invoiceNumber = await nextInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber, companyName, companyPhone, companyAddress, companyGst,
      ratePerTon, trucks, total, notes, ownerId
    });

    return res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listInvoices = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const { from, to, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));

    const filter = { ownerId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * lim).limit(lim).lean(),
      Invoice.countDocuments(filter)
    ]);

    return res.json({ data, page: pageNum, limit: lim, total });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const inv = await Invoice.findOne({ _id: req.params.id, ownerId }).lean();
    if (!inv) return res.status(404).json({ message: 'Not found' });
    return res.json(inv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const exportInvoicesCsv = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'from and to date are required for export' });
    }
    const filter = {
      ownerId,
      createdAt: { $gte: new Date(from), $lte: new Date(to) }
    };

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    const outDir = path.join(process.cwd(), 'tmp-exports');
    ensureDir(outDir);
    const outPath = path.join(outDir, `invoices_${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: outPath,
      header: [
        { id: 'createdAt', title: 'DATE_ISO' },
        { id: 'invoiceNumber', title: 'INVOICE_NUMBER' },
        { id: 'companyName', title: 'COMPANY_NAME' },
        { id: 'companyPhone', title: 'COMPANY_PHONE' },
        { id: 'companyAddress', title: 'COMPANY_ADDRESS' },
        { id: 'companyGst', title: 'COMPANY_GST' },
        { id: 'ratePerTon', title: 'RATE_PER_TON' },
        { id: 'trucks', title: 'TRUCKS' },
        { id: 'total', title: 'TOTAL' },
        { id: 'notes', title: 'NOTES' }
      ]
    });

    await csvWriter.writeRecords(invoices.map(i => ({
      createdAt: new Date(i.createdAt).toISOString(),
      invoiceNumber: i.invoiceNumber,
      companyName: i.companyName,
      companyPhone: i.companyPhone || '',
      companyAddress: i.companyAddress,
      companyGst: i.companyGst,
      ratePerTon: i.ratePerTon,
      trucks: i.trucks,
      total: i.total,
      notes: i.notes || ''
    })));

    res.download(outPath, err => {
      try { fs.unlinkSync(outPath); } catch (_) {}
      if (err) console.error('Download error:', err);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const invoicePdf = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const inv = await Invoice.findOne({ _id: req.params.id, ownerId }).lean();
    if (!inv) return res.status(404).json({ message: 'Not found' });

    const outDir = path.join(process.cwd(), 'tmp-pdfs');
    ensureDir(outDir);
    const outPath = path.join(outDir, `Invoice_${inv.invoiceNumber}.pdf`);

    // A4 page setup: 595 x 842 points (210 × 297 mm)
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 57, bottom: 57, left: 57, right: 57 } // 20mm margins
    });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // Helper functions for formatting
    const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
    const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Header Section
    doc.fontSize(18).font('Helvetica-Bold')
       .text('SAND COMPANY INVOICE', 0, 57, { align: 'center' });
    
    doc.moveDown(1);
    
    // Company Info (Left) and Invoice Details (Right)
    const leftX = 57;
    const rightX = 350;
    const currentY = doc.y;
    
    // Left side - Company info
    doc.fontSize(12).font('Helvetica-Bold')
       .text('Sand Delivery Services', leftX, currentY);
    doc.fontSize(10).font('Helvetica')
       .text('Professional Sand Supply Solutions', leftX, doc.y + 5)
       .text('Phone: +91 98765 43210', leftX, doc.y + 5)
       .text('GST: 22AAAAA0000A1Z5', leftX, doc.y + 5);
    
    // Right side - Invoice details
    doc.fontSize(11).font('Helvetica-Bold')
       .text(`Invoice #: ${inv.invoiceNumber}`, rightX, currentY)
       .text(`Date: ${formatDate(inv.createdAt)}`, rightX, doc.y + 5)
       .text(`Time: ${formatTime(inv.createdAt)}`, rightX, doc.y + 5);

    // Horizontal line separator
    doc.moveTo(57, doc.y + 20)
       .lineTo(538, doc.y + 20)
       .stroke();

    doc.y += 30;

    // Customer Information Section
    doc.fontSize(12).font('Helvetica-Bold')
       .text('BILL TO:', 57, doc.y);
    
    const lineY = doc.y + 5;
    doc.moveTo(57, lineY)
       .lineTo(300, lineY)
       .stroke();

    doc.y += 15;
    doc.fontSize(10).font('Helvetica')
       .text(`Customer Name: ${inv.companyName}`, 57, doc.y)
       .text(`Phone: ${inv.companyPhone || 'N/A'}`, 57, doc.y + 15)
       .text(`GST Number: ${inv.companyGst}`, 57, doc.y + 15)
       .text(`Address: ${inv.companyAddress}`, 57, doc.y + 15);

    doc.y += 30;

    // Invoice Details Table
    const tableTop = doc.y;
    const tableLeft = 57;
    const tableWidth = 481; // 538 - 57
    const rowHeight = 25;
    const headerHeight = 35;

    // Table header
    const drawTableBorder = (x, y, width, height) => {
      doc.rect(x, y, width, height).stroke();
    };

    // Header row
    drawTableBorder(tableLeft, tableTop, tableWidth, headerHeight);
    
    // Column positions and widths
    const cols = [
      { x: tableLeft, width: 40, title: 'S.\nNo.' },
      { x: tableLeft + 40, width: 120, title: 'Description' },
      { x: tableLeft + 160, width: 70, title: 'Trucks\n(Qty)' },
      { x: tableLeft + 230, width: 80, title: 'Rate/\nTon (₹)' },
      { x: tableLeft + 310, width: 90, title: 'Amount\n(₹)' },
      { x: tableLeft + 400, width: 81, title: 'Total\n(₹)' }
    ];

    // Draw column separators and headers
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.moveTo(col.x, tableTop)
           .lineTo(col.x, tableTop + headerHeight)
           .stroke();
      }
      
      doc.fontSize(9).font('Helvetica-Bold')
         .text(col.title, col.x + 3, tableTop + 8, {
           width: col.width - 6,
           align: 'center'
         });
    });

    // Data row
    const dataTop = tableTop + headerHeight;
    drawTableBorder(tableLeft, dataTop, tableWidth, rowHeight);
    
    // Draw column separators for data row
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.moveTo(col.x, dataTop)
           .lineTo(col.x, dataTop + rowHeight)
           .stroke();
      }
    });

    // Fill data
    const rowData = ['1', 'Sand\nDelivery', inv.trucks.toString(), formatCurrency(inv.ratePerTon), formatCurrency(inv.total), formatCurrency(inv.total)];
    
    cols.forEach((col, i) => {
      doc.fontSize(9).font('Helvetica')
         .text(rowData[i], col.x + 3, dataTop + 8, {
           width: col.width - 6,
           align: i === 0 ? 'center' : (i >= 3 ? 'right' : 'left')
         });
    });

    // Totals section (right-aligned)
    const totalsTop = dataTop + rowHeight + 10;
    const totalsLeft = tableLeft + 310;
    const totalsWidth = 171;

    // Calculate GST
    const subTotal = inv.total;
    const gstRate = 0.18; // 18% GST
    const gstAmount = Math.round(subTotal * gstRate);
    const finalTotal = subTotal + gstAmount;

    // Sub Total
    doc.fontSize(10).font('Helvetica')
       .text('Sub Total:', totalsLeft, totalsTop, { width: 90, align: 'left' })
       .text(formatCurrency(subTotal), totalsLeft + 90, totalsTop, { width: 81, align: 'right' });

    // GST
    doc.text('GST (18%):', totalsLeft, totalsTop + 15, { width: 90, align: 'left' })
       .text(formatCurrency(gstAmount), totalsLeft + 90, totalsTop + 15, { width: 81, align: 'right' });

    // Final Total (Bold)
    doc.font('Helvetica-Bold')
       .text('TOTAL:', totalsLeft, totalsTop + 30, { width: 90, align: 'left' })
       .text(formatCurrency(finalTotal), totalsLeft + 90, totalsTop + 30, { width: 81, align: 'right' });

    // Notes section
    if (inv.notes) {
      doc.y = totalsTop + 60;
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Notes/Instructions:', 57, doc.y);
      doc.font('Helvetica')
         .text(inv.notes, 57, doc.y + 15, { width: 481 });
    }

    // Footer section
    const footerTop = doc.page.height - 150; // 150 points from bottom
    doc.y = Math.max(doc.y + 40, footerTop);

    doc.fontSize(10).font('Helvetica')
       .text('Payment Terms: As per agreement', 57, doc.y)
       .text('Due Date: Immediate', 57, doc.y + 15);

    // Signature line
    doc.moveTo(57, doc.y + 40)
       .lineTo(200, doc.y + 40)
       .stroke();
    
    doc.text('Authorized Signature', 57, doc.y + 45);

    // System info
    const now = new Date();
    doc.fontSize(8).font('Helvetica')
       .text(`Generated on: ${formatDate(now)} ${formatTime(now)}`, 350, doc.y + 30)
       .text('System: Sand Company Billing System', 350, doc.y + 10);

    doc.end();

    stream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${inv.invoiceNumber}.pdf"`);
      
      res.download(outPath, `Invoice_${inv.invoiceNumber}.pdf`, (err) => {
        try { fs.unlinkSync(outPath); } catch (_) {}
        if (err) console.error('PDF download error:', err);
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
