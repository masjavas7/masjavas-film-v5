import express from 'express';
import cors from 'cors';
import { initRuntimePaths } from './utils/runtimePaths.js';
import projectRoutes from './routes/projectRoutes.js';
import referenceRoutes from './routes/referenceRoutes.js';
import sceneRoutes from './routes/sceneRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import ttsRoutes from './routes/ttsRoutes.js';
import errorHandler from './middleware/errorHandler.js';

/**
 * Membuat dan mengonfigurasi instansi Express.
 * @param {object} runtimeConfig - Konfigurasi runtime { userDataDir?: string, port?: number }
 * @returns {express.Application} Express app instance
 */
export function createApp(runtimeConfig = {}) {
  // Inisialisasi paths dinamis di disk
  const runtimePaths = initRuntimePaths(runtimeConfig.userDataDir);

  const app = express();

  // CORS dinamis: mengizinkan Electron (yang mungkin mengirim origin kosong atau file://)
  app.use(cors({
    origin: (origin, callback) => {
      // Izinkan semua origin pada desktop app lokal
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // static resources pointing to dynamically resolved runtime directories
  app.use('/uploads', express.static(runtimePaths.uploadsDir));
  app.use('/exports', express.static(runtimePaths.exportsDir));

  // Health checks
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'MASJAVAS AI API Gateway' }));
  app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'MASJAVAS AI API Gateway' }));
  app.get('/api/health', (req, res) => res.json({
    "status": "ok",
    "service": "masjavas-backend-proxy",
    "mode": runtimeConfig.userDataDir ? "desktop" : "dev",
    "port": runtimeConfig.port || 3000
  }));

  // Mount modular routes
  app.use('/api', settingsRoutes);
  app.use('/api', debugRoutes);
  app.use('/api', exportRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api', referenceRoutes);
  app.use('/api', sceneRoutes);
  app.use('/api', ttsRoutes);

  // Global safe error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
