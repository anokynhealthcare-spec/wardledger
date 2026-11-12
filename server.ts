/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes.js';
import { hasValidGeminiKey } from './server/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Request JSON parsing
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'WardLedger Backend',
      geminiConfigured: hasValidGeminiKey(),
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

  if (!isProduction) {
    // In dev mode, attach Vite middleware for HMR-less fast reload
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production, serve the built frontend assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(port, '0.0.0.0', () => {
      console.log(`WardLedger server running on http://0.0.0.0:${port} [${isProduction ? 'production' : 'development'}]`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start WardLedger server:', err);
    process.exit(1);
  });
}

export default app;
