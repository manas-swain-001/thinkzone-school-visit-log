import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Required to read req.body. Without it, POST /api/visits would see no body.
  app.use(express.json({ limit: '1mb' }));

  // The React Native app is not a browser, so CORS is not strictly needed.
  // It is left on so the API can also be poked from a browser or curl during
  // the session without surprises.
  app.use(cors());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  /**
   * Liveness probe. Not one of the five briefed endpoints, but the app needs a
   * cheap way to tell "server is up" from "no network" when it retries the
   * queue, and GET /api/visits would be a poor thing to hammer.
   */
  app.get('/api/health', (_req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
      status: 'ok',
      database: states[mongoose.connection.readyState] ?? 'unknown',
      time: new Date().toISOString(),
    });
  });

  app.use('/api', apiRoutes);

  // Order matters: anything that matched no route, then the single error shape.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
