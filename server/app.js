import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initRuntimePaths } from './utils/runtimePaths.js';
import { buildHealthPayload } from './utils/healthCheck.js';
import projectRoutes from './routes/projectRoutes.js';
import referenceRoutes from './routes/referenceRoutes.js';
import sceneRoutes from './routes/sceneRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import ttsRoutes from './routes/ttsRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/**
 * Membuat dan mengonfigurasi instansi Express.
 * @param {object} runtimeConfig - Konfigurasi runtime { userDataDir?: string, port?: number }
 * @returns {express.Application} Express app instance
 */
export function createApp(runtimeConfig = {}) {
  // Inisialisasi paths dinamis di disk
  const runtimePaths = initRuntimePaths(runtimeConfig.userDataDir);

  const app = express();
  app.set('trust proxy', 1);
  app.use(requestLogger);

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

  const staticCache = { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 };

  // static resources pointing to dynamically resolved runtime directories
  app.use('/uploads', express.static(runtimePaths.uploadsDir, staticCache));
  app.use('/exports', express.static(runtimePaths.exportsDir, staticCache));

  const healthHandler = (req, res) => {
    res.json(buildHealthPayload({
      mode: runtimeConfig.userDataDir ? 'desktop' : (process.env.NODE_ENV || 'dev'),
      port: runtimeConfig.port || Number(process.env.PORT) || 3000,
      uptimeSec: Math.floor(process.uptime())
    }));
  };

  // Health checks (monitoring / uptime)
  app.get('/health', healthHandler);
  app.get('/healthz', healthHandler);
  app.get('/api/health', healthHandler);

  // Production / Docker: serve built frontend
  if (process.env.SERVE_STATIC === 'true') {
    const distDir = path.join(projectRoot, 'dist');
    app.use(express.static(distDir, { maxAge: '1d', index: false }));
    app.get(/^(?!\/api|\/uploads|\/exports|\/health).*/, (req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

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
