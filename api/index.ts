/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import 'dotenv/config';
import { apiRouter } from '../server/routes.js';

const app = express();

// Request JSON parsing
app.use(express.json());

// Mount API endpoints
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WardLedger Backend (Vercel Serverless Function)',
    timestamp: new Date().toISOString(),
  });
});

export default app;
