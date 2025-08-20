import { Counter } from '../models/Counter.js';

export const nextInvoiceNumber = async () => {
  const doc = await Counter.findOneAndUpdate(
    { key: 'invoiceNumber' },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return doc.value;
};
