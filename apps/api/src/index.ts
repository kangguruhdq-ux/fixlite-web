import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { initDatabase } from './db';
import { seedDatabase } from './db/seed';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import projectsRoutes from './routes/projects';
import backgroundRoutes from './routes/background';
import presetsRoutes from './routes/presets';
import membershipsRoutes from './routes/memberships';
import supportRoutes from './routes/support';
import reportsRoutes from './routes/reports';
import adminRoutes from './routes/admin';
import couponsRoutes from './routes/coupons';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Pixelift Lite API', time: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/background', backgroundRoutes);
app.use('/api/presets', presetsRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponsRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.message && (err.message.includes('Format file') || err.message.includes('File too large'))) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled API error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function start() {
  try {
    await initDatabase();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`Pixelift Lite API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };
