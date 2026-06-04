/**
 * apiBase.ts
 * Helper untuk mendapatkan URL API gateway backend secara dinamis.
 */

export function getApiBaseUrl(): string {
  // Jika berjalan di dalam Electron desktop shell, ambil dari context bridge preload
  const desktopApi = (window as any)?.masjavas?.getApiBaseUrl?.();
  if (desktopApi) {
    return desktopApi;
  }

  // Fallback ke env variable Vite
  const envUrl = (import.meta as any).env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default fallback untuk local dev
  return "http://localhost:3000";
}

export default getApiBaseUrl;
