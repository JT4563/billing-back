import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Owner } from '../models/Owner.js';
import { config } from '../config/env.js';

export const signIn = async (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!accessCode) return res.status(400).json({ message: 'Access code is required' });

    const owner = await Owner.findOne().lean();
    if (!owner) return res.status(500).json({ message: 'Owner not initialized' });

    const ok = await bcrypt.compare(accessCode, owner.accessCodeHash);
    if (!ok) return res.status(401).json({ message: 'Invalid access code' });

    const token = jwt.sign({ ownerId: owner._id }, config.jwtSecret, { expiresIn: '12h' });
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
