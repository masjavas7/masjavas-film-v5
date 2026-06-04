import path from 'path';
import fs from 'fs';

let currentPaths = null;

/**
 * Inisialisasi jalur penyimpanan data runtime secara dinamis.
 * @param {string|null} userDataDir - Jalur data pengguna (dari Electron appData)
 * @returns {object} objek berisi paths yang sudah di-resolve
 */
export function initRuntimePaths(userDataDir = null) {
  const isDesktop = !!userDataDir;
  
  // Jika desktop mode, simpan di AppData/Roaming/MASJAVAS AI
  // Jika dev server, simpan di folder server proyek
  const baseDir = userDataDir || path.join(process.cwd(), 'server');
  
  const resolved = {
    isDesktop,
    userDataDir: baseDir,
    projectsDir: isDesktop 
      ? path.join(baseDir, 'data', 'projects') 
      : path.join(baseDir, 'data', 'projects'),
    uploadsDir: isDesktop
      ? path.join(baseDir, 'uploads')
      : path.join(baseDir, 'uploads'),
    exportsDir: isDesktop
      ? path.join(baseDir, 'exports')
      : path.join(baseDir, 'exports'),
    tempDir: isDesktop
      ? path.join(baseDir, 'temp')
      : path.join(baseDir, 'temp'),
    logsDir: isDesktop
      ? path.join(baseDir, 'logs')
      : path.join(baseDir, 'logs'),
  };

  // Pastikan semua direktori tujuan dibuat secara fisik
  fs.mkdirSync(resolved.projectsDir, { recursive: true });
  fs.mkdirSync(resolved.uploadsDir, { recursive: true });
  fs.mkdirSync(resolved.exportsDir, { recursive: true });
  fs.mkdirSync(resolved.tempDir, { recursive: true });
  fs.mkdirSync(resolved.logsDir, { recursive: true });

  currentPaths = resolved;
  return resolved;
}

/**
 * Mengambil jalur penyimpanan data runtime yang sedang aktif.
 * @returns {object}
 */
export function getRuntimePaths() {
  if (!currentPaths) {
    // Jalankan inisialisasi default jika belum pernah dipanggil
    initRuntimePaths();
  }
  return currentPaths;
}
