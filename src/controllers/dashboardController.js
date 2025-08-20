import dayjs from 'dayjs';
import { Invoice } from '../models/Invoice.js';

const sumAgg = (match) => ([
  { $match: match },
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

export const summary = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const { from, to } = req.query;
    const match = { ownerId };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [base] = await Invoice.aggregate(sumAgg(match));
    const stats = base || { invoices: 0, totalRevenue: 0, totalTrucks: 0, avgRatePerTon: 0 };

    const now = dayjs();
    const tmStart = now.startOf('month').toDate();
    const tmEnd = now.endOf('month').toDate();
    const pmStart = now.subtract(1, 'month').startOf('month').toDate();
    const pmEnd = now.subtract(1, 'month').endOf('month').toDate();
    const tyStart = now.startOf('year').toDate();
    const tyEnd = now.endOf('year').toDate();

    const [tm] = await Invoice.aggregate(sumAgg({ ownerId, createdAt: { $gte: tmStart, $lte: tmEnd } }));
    const [pm] = await Invoice.aggregate(sumAgg({ ownerId, createdAt: { $gte: pmStart, $lte: pmEnd } }));
    const [ty] = await Invoice.aggregate(sumAgg({ ownerId, createdAt: { $gte: tyStart, $lte: tyEnd } }));

    return res.json({
      invoices: stats.invoices,
      totalRevenue: stats.totalRevenue,
      totalTrucks: stats.totalTrucks,
      avgRatePerTon: stats.avgRatePerTon || 0,
      thisMonth: tm || { invoices: 0, totalRevenue: 0, totalTrucks: 0 },
      prevMonth: pm || { invoices: 0, totalRevenue: 0, totalTrucks: 0 },
      thisYear: ty || { invoices: 0, totalRevenue: 0, totalTrucks: 0 }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const daily = async (req, res) => {
  try {
    const ownerId = req.user.ownerId;
    const date = req.query.date ? dayjs(req.query.date) : dayjs();
    if (!date.isValid()) return res.status(400).json({ message: 'Invalid date' });
    const start = date.startOf('day').toDate();
    const end = date.endOf('day').toDate();

    const invoices = await Invoice.find({ ownerId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).lean();
    const totals = invoices.reduce((acc, i) => {
      acc.invoices += 1;
      acc.totalRevenue += i.total;
      acc.totalTrucks += i.trucks;
      return acc;
    }, { invoices: 0, totalRevenue: 0, totalTrucks: 0 });

    return res.json({ date: date.format('YYYY-MM-DD'), totals, invoices });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
