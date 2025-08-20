import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: { type: Number, default: 1000 }
}, { timestamps: true });

CounterSchema.index({ key: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', CounterSchema);
