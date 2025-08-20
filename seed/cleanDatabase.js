import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Invoice } from '../src/models/Invoice.js';
import { Counter } from '../src/models/Counter.js';

dotenv.config();

const cleanDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Remove all invoices
    const invoiceResult = await Invoice.deleteMany({});
    console.log(`Deleted ${invoiceResult.deletedCount} invoices`);

    // Reset the counter for invoice numbers
    await Counter.deleteMany({ key: 'invoiceNumber' });
    console.log('Reset invoice number counter');

    console.log('✅ Database cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();
