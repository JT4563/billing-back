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
    const outPath = path.join(outDir, `invoice_${inv.invoiceNumber}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(16).text(inv.companyName, { align: 'left' });
    if (inv.companyPhone) doc.fontSize(10).text(`Phone: ${inv.companyPhone}`);
    doc.fontSize(10).text(`Address: ${inv.companyAddress}`);
    doc.fontSize(10).text(`GST: ${inv.companyGst}`);
    doc.moveDown();

    // Invoice meta
    doc.fontSize(12).text(`Invoice #${inv.invoiceNumber}`);
    doc.fontSize(10).text(`Date: ${new Date(inv.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // Table
    doc.fontSize(12).text('Item: Per-Ton Truck');
    doc.text(`Rate per Ton: ₹${inv.ratePerTon}`);
    doc.text(`Trucks (Quantity): ${inv.trucks}`);
    doc.moveDown();
    doc.fontSize(14).text(`Total: ₹${inv.total}`, { align: 'right' });
    if (inv.notes) { doc.moveDown(); doc.fontSize(10).text(`Notes: ${inv.notes}`); }

    doc.end();

    stream.on('finish', () => {
      res.download(outPath, (err) => {
        try { fs.unlinkSync(outPath); } catch (_) {}
        if (err) console.error('PDF download error:', err);
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
