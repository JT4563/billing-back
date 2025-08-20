import mongoose from 'mongoose';

const OwnerSchema = new mongoose.Schema({
  accessCodeHash: { type: String, required: true }
}, { timestamps: true });

export const Owner = mongoose.model('Owner', OwnerSchema);
