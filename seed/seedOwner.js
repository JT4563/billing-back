import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../src/config/db.js';
import { Owner } from '../src/models/Owner.js';

const run = async () => {
  const accessCode = process.env.ACCESS_CODE_SEED;
  if (!accessCode) {
    console.error('ACCESS_CODE_SEED is required in .env');
    process.exit(1);
  }

  await connectDB();
  let owner = await Owner.findOne();
  const hash = await bcrypt.hash(accessCode, 10);

  if (!owner) {
    await Owner.create({ accessCodeHash: hash });
    console.log('Owner created with access code from .env');
  } else {
    owner.accessCodeHash = hash;
    await owner.save();
    console.log('Owner updated with new access code from .env');
  }
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
