import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedVersion = null;

export function getAppVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    cachedVersion = pkg.version || '1.0.0';
  } catch {
    cachedVersion = process.env.APP_VERSION || '1.0.0';
  }
  return cachedVersion;
}