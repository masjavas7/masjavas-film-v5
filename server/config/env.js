import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
const envPath = path.join(process.cwd(), 'server', '.env');
dotenv.config({ path: envPath });

const PORT = process.env.PORT || 3000;
const GROKPI_BASE_URL = process.env.GROKPI_BASE_URL || 'https://www.grokpi.masjavas.my.id/v1';
const GROKPI_API_KEY = process.env.GROKPI_API_KEY;

const isDesktop = !!(process.versions && process.versions.electron) || process.env.MASJAVAS_DESKTOP === 'true';

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

if (!GROKPI_API_KEY) {
  if (isDesktop || isTest) {
    console.warn('[env] Warning: GROKPI_API_KEY is not defined. User must configure it in Settings.');
  } else {
    console.error('Missing GROKPI_API_KEY in server environment.');
    process.exit(1);
  }
}

export const config = {
  PORT,
  GROKPI_BASE_URL,
  GROKPI_API_KEY
};
