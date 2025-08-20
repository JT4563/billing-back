import { connectDB } from './config/db.js';
import { config } from './config/env.js';
import { createApp } from './app.js';

const start = async () => {
  await connectDB();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
  });
};

start();
