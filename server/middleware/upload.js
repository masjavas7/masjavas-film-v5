import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getRuntimePaths } from '../utils/runtimePaths.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getRuntimePaths().uploadsDir;
    // Pastikan folder upload ada sebelum file disimpan
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
]);

function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_IMAGE_EXT.has(ext) || !ALLOWED_IMAGE_MIME.has(mime)) {
    return cb(new Error('Hanya file gambar (PNG, JPG, WEBP, GIF) yang diizinkan.'));
  }
  cb(null, true);
}

// Konfigurasi upload middleware
const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Batasi ukuran file maksimal 10MB
  }
});

export default upload;
