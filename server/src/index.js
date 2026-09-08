import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import productRoutes from './routes/products.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import { rateLimit } from './middleware/rateLimit.js';
import { storage, STORAGE_PROVIDER, IMMUTABLE_CACHE_CONTROL } from './storage/index.js';

dotenv.config();

const app = express();

// credentials:true so the browser sends/stores the refresh-token cookie
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'modern_monkey_sale API is running' });
});

// Local object storage (dev): serve optimised image variants with an
// immutable long cache. In production STORAGE_PROVIDER=s3 serves these via CDN.
if (STORAGE_PROVIDER === 'local') {
  app.use(
    '/media',
    express.static(storage.root, {
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL),
    })
  );
}
// Legacy pre-optimisation uploads, if any still exist on disk
const legacyUploads = path.resolve('uploads');
if (fs.existsSync(legacyUploads)) {
  app.use('/uploads', express.static(legacyUploads, { maxAge: '30d' }));
}

// Coarse ceiling for all auth traffic (refresh runs often); login / reset get a
// stricter per-route limit in routes/auth.js
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`modern_monkey_sale API listening on port ${PORT}`);
});
