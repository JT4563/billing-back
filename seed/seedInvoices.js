import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Invoice } from '../src/models/Invoice.js';
import { Owner } from '../src/models/Owner.js';
import { nextInvoiceNumber } from '../src/utils/invoiceNumber.js';

dotenv.config();

async function createSampleInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the owner
    const owner = await Owner.findOne();
    if (!owner) {
      console.log('Owner not found. Please run the seed script first.');
      return;
    }

    console.log('Found owner with ID:', owner._id);

    // Check if invoices already exist
    const existingInvoices = await Invoice.countDocuments({ ownerId: owner._id });
    console.log(`Found ${existingInvoices} existing invoices.`);
    
    // Clear existing invoices for fresh data
    if (existingInvoices > 0) {
      await Invoice.deleteMany({ ownerId: owner._id });
      console.log('Cleared existing invoices for fresh sample data.');
    }

    // Create sample invoices with different dates (across multiple years)
    const sampleInvoicesData = [
      {
        companyName: "ABC Transport Ltd",
        companyPhone: "+91-9876543210",
        companyAddress: "123 Transport Street, Mumbai, Maharashtra 400001",
        companyGst: "27ABCDE1234F1Z5",
        ratePerTon: 850,
        trucks: 5,
        total: 4250,
        notes: "Regular delivery route",
        ownerId: owner._id,
        createdAt: new Date('2024-01-15')
      },
      {
        companyName: "XYZ Logistics Pvt Ltd",
        companyPhone: "+91-9876543211",
        companyAddress: "456 Logistics Hub, Delhi, Delhi 110001",
        companyGst: "07XYZAB5678G1H9",
        ratePerTon: 920,
        trucks: 8,
        total: 7360,
        notes: "Express delivery service",
        ownerId: owner._id,
        createdAt: new Date('2024-02-20')
      },
      {
        companyName: "Prime Movers Co",
        companyPhone: "+91-9876543212",
        companyAddress: "789 Industrial Area, Pune, Maharashtra 411001",
        companyGst: "27PRIME1234K1L8",
        ratePerTon: 750,
        trucks: 12,
        total: 9000,
        notes: "Bulk cargo transport",
        ownerId: owner._id,
        createdAt: new Date('2024-03-10')
      },
      {
        companyName: "Swift Cargo Services",
        companyPhone: "+91-9876543213",
        companyAddress: "321 Port Road, Chennai, Tamil Nadu 600001",
        companyGst: "33SWIFT1234M1N7",
        ratePerTon: 1000,
        trucks: 6,
        total: 6000,
        notes: "Port to warehouse delivery",
        ownerId: owner._id,
        createdAt: new Date('2024-06-15')
      },
      {
        companyName: "Reliable Transport",
        companyPhone: "+91-9876543214",
        companyAddress: "654 Highway Junction, Bangalore, Karnataka 560001",
        companyGst: "29RELBL1234P1Q6",
        ratePerTon: 880,
        trucks: 10,
        total: 8800,
        notes: "Interstate transportation",
        ownerId: owner._id,
        createdAt: new Date('2024-08-05')
      },
      {
        companyName: "Mega Freight Solutions",
        companyPhone: "+91-9876543215",
        companyAddress: "987 Freight Terminal, Kolkata, West Bengal 700001",
        companyGst: "19MEGA123456R1S5",
        ratePerTon: 950,
        trucks: 15,
        total: 14250,
        notes: "Heavy cargo specialist",
        ownerId: owner._id,
        createdAt: new Date('2025-01-10')
      },
      {
        companyName: "Express Movers Ltd",
        companyPhone: "+91-9876543216",
        companyAddress: "147 Express Way, Hyderabad, Telangana 500001",
        companyGst: "36EXPR123456T1U4",
        ratePerTon: 820,
        trucks: 7,
        total: 5740,
        notes: "Time-critical deliveries",
        ownerId: owner._id,
        createdAt: new Date('2025-08-18')
      }
    ];

    // Add invoice numbers to each invoice
    const sampleInvoices = [];
    for (const invoiceData of sampleInvoicesData) {
      const invoiceNumber = await nextInvoiceNumber();
      sampleInvoices.push({
        ...invoiceData,
        invoiceNumber
      });
    }

    // Insert sample invoices
    await Invoice.insertMany(sampleInvoices);
    console.log(`✅ Created ${sampleInvoicesData.length} sample invoices`);

    // Calculate and display dashboard summary
    const summary = await Invoice.aggregate([
      { $match: { ownerId: owner._id } },
      {
        $group: {
          _id: null,
          invoices: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          totalTrucks: { $sum: "$trucks" },
          avgRatePerTon: { $avg: "$ratePerTon" }
        }
      }
    ]);

    const stats = summary[0] || { invoices: 0, totalRevenue: 0, totalTrucks: 0, avgRatePerTon: 0 };
    
    console.log('\n📊 Dashboard Summary:');
    console.log(`Invoices: ${stats.invoices}`);
    console.log(`Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`);
    console.log(`Total Trucks: ${stats.totalTrucks}`);
    console.log(`Avg Rate/Ton: ₹${Math.round(stats.avgRatePerTon)}`);

  } catch (error) {
    console.error('Error creating sample invoices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSampleInvoices();
