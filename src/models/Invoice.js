import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: Number, unique: true, index: true },

  // Per-invoice company header
  companyName: { type: String, required: true },
  companyPhone: { type: String },
  companyAddress: { type: String, required: true },
  companyGst: { type: String, required: true },

  // Billing core
  ratePerTon: { type: Number, required: true, min: 0 },
  trucks: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },

  notes: { type: String },

  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true }
}, { timestamps: true });

InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ ownerId: 1, createdAt: -1 });

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
