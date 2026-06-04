import getPort from 'get-port';
import { createApp } from '../server/app.js';

/**
 * Memulai Express server di dalam thread desktop Electron pada port dinamis.
 * @param {object} params - { userDataDir: string, isPackaged: boolean }
 * @returns {Promise<object>} { port, apiBaseUrl, server }
 */
export async function startEmbeddedServer({ userDataDir, isPackaged }) {
  // Cari port dinamis pada localhost, prioritaskan 3000, 3001, 3002, 3010, atau random (0)
  const port = await getPort({ port: [3000, 3001, 3002, 3010, 0], host: '127.0.0.1' });

  // Set desktop runtime flags
  process.env.MASJAVAS_DESKTOP = 'true';
  process.env.MASJAVAS_DESKTOP_PORT = String(port);
  if (isPackaged) {
    process.env.MASJAVAS_DESKTOP_PACKAGED = 'true';
  }

  const app = createApp({
    userDataDir,
    port
  });

  // Jalankan server listen secara asinkron
  const server = await new Promise((resolve) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });

  console.log(`[ServerLauncher] Embedded Express server started on http://127.0.0.1:${port}`);

  return {
    port,
    apiBaseUrl: `http://127.0.0.1:${port}`,
    server
  };
}

export default { startEmbeddedServer };
