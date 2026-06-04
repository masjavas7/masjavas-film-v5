import { app, BrowserWindow, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { startEmbeddedServer } from './serverLauncher.js';
import { registerContextMenu } from './contextMenu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tentukan userData path secara konsisten di awal
app.name = 'MASJAVAS AI';
const userDataPath = path.join(app.getPath('appData'), 'MASJAVAS AI');
app.setPath('userData', userDataPath);

let mainWindow = null;
let splashWindow = null;
let backendServerInstance = null;

// Fungsi Logging Resmi ke AppData
function logToFile(msg) {
  try {
    const logDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'desktop-main.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
    console.log(`[DesktopMain] ${msg}`);
  } catch (err) {
    console.error('Gagal menulis start-up log:', err);
  }
}

// Global Crash Handlers
process.on('uncaughtException', (err) => {
  logToFile(`CRITICAL: Uncaught Exception: ${err.message}\nStack: ${err.stack}`);
  try {
    dialog.showErrorBox(
      'MASJAVAS AI Gagal Dibuka',
      `Terjadi kesalahan fatal saat memulai aplikasi.\n\nDetail error:\n${err.message}\n\nCatatan lengkap tersimpan di folder logs.`
    );
  } catch (dialogErr) {}
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  const reasonStr = reason instanceof Error ? `${reason.message}\nStack: ${reason.stack}` : String(reason);
  logToFile(`CRITICAL: Unhandled Rejection: ${reasonStr}`);
  try {
    dialog.showErrorBox(
      'MASJAVAS AI Gagal Dibuka',
      `Terjadi kesalahan fatal (unhandled promise rejection) saat memulai aplikasi.\n\nDetail error:\n${reasonStr}\n\nCatatan lengkap tersimpan di folder logs.`
    );
  } catch (dialogErr) {}
  app.quit();
});

// HTML template untuk Splash Screen mewah
const splashHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.05);
      -webkit-app-region: drag;
    }
    .logo-container {
      margin-bottom: 24px;
      animation: pulse 2.5s infinite ease-in-out;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
      letter-spacing: 0.5px;
      margin-bottom: 32px;
    }
    .loader-bar {
      width: 240px;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }
    .loader-progress {
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border-radius: 2px;
      position: absolute;
      animation: loading 1.5s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.85; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    @keyframes loading {
      0% { left: -50%; }
      100% { left: 100%; }
    }
  </style>
</head>
<body>
  <div class="logo-container">
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="24" fill="#0b0f19"/>
      <path d="M25 70V30L50 52L75 30V70" stroke="url(#paint0_linear)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 48L58 56L44 64V48Z" fill="#8b5cf6"/>
      <defs>
        <linearGradient id="paint0_linear" x1="25" y1="30" x2="75" y2="70" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3b82f6"/>
          <stop offset="0.5" stop-color="#8b5cf6"/>
          <stop offset="1" stop-color="#ec4899"/>
        </linearGradient>
      </defs>
    </svg>
  </div>
  <div class="title">MASJAVAS AI</div>
  <div class="subtitle">Ubah Ide Menjadi Video Sinematik Siap Tayang</div>
  <div class="loader-bar">
    <div class="loader-progress"></div>
  </div>
</body>
</html>
`;

// HTML template untuk Tampilan Error Gagal Inisialisasi
const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      background: #020617;
      color: #f8fafc;
      font-family: 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      border-radius: 16px;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .error-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #f43f5e;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 14px;
      color: #94a3b8;
      max-width: 320px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="error-icon">⚠️</div>
  <div class="title">Workspace Gagal Disiapkan</div>
  <div class="desc">Workspace gagal disiapkan karena kendala backend. Coba buka ulang aplikasi Anda.</div>
</body>
</html>
`;

async function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(__dirname, "../resources/icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "MASJAVAS AI",
    backgroundColor: "#020617",
    show: false, // Sembunyikan sampai UI ter-load sempurna
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "icon.ico")
      : path.join(__dirname, "../resources/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Hapus menu bar default Windows
  mainWindow.removeMenu();

  // Daftarkan context menu klik kanan
  registerContextMenu(mainWindow);

  mainWindow.webContents.on("did-finish-load", () => {
    // Siarkan URL API dinamis ke renderer process
    logToFile(`UI did-finish-load event. Sending base URL: ${app.masjavasApiBaseUrl}`);
    mainWindow.webContents.send("masjavas:api-base-url", app.masjavasApiBaseUrl);
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    logToFile(`CRITICAL: Main window failed to load URL: ${validatedURL}, ErrorCode: ${errorCode}, Description: ${errorDescription}`);
    try {
      dialog.showErrorBox(
        'Gagal Memuat Halaman Aplikasi',
        `Aplikasi gagal memuat tampilan antarmuka dari:\n${validatedURL}\n\nError: ${errorDescription} (${errorCode})`
      );
    } catch (e) {}
  });
}

async function startApplication() {
  logToFile("==================================================");
  logToFile("Application start sequence initiated.");

  // Set default application menu (Edit menu for standard shortcuts)
  const menuTemplate = [
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "Urungkan (Undo)" },
        { role: "redo", label: "Ulangi (Redo)" },
        { type: "separator" },
        { role: "cut", label: "Potong (Cut)" },
        { role: "copy", label: "Salin (Copy)" },
        { role: "paste", label: "Tempel (Paste)" },
        { role: "selectAll", label: "Pilih Semua (Select All)" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  logToFile(`app.isPackaged: ${app.isPackaged}`);
  logToFile(`App path: ${app.getAppPath()}`);
  logToFile(`process.resourcesPath: ${process.resourcesPath}`);
  logToFile(`userData path: ${app.getPath('userData')}`);

  const preloadPath = path.join(__dirname, "preload.js");
  logToFile(`Preload path: ${preloadPath}`);
  logToFile(`Preload path file exists: ${fs.existsSync(preloadPath)}`);

  // Tampilkan splash screen
  await createSplashWindow();
  logToFile("Splash screen window spawned.");

  try {
    // 1. Boot up backend Express di port dinamis
    logToFile("Launching embedded Express server...");
    const runtime = await startEmbeddedServer({
      userDataDir: app.getPath("userData"),
      isPackaged: app.isPackaged
    });

    app.masjavasApiBaseUrl = runtime.apiBaseUrl;
    backendServerInstance = runtime.server;
    logToFile(`Embedded server launched on port: ${runtime.port}, URL: ${runtime.apiBaseUrl}`);

    // 2. Tunggu health check merespons (maksimal 30 attempts * 500ms = 15 detik)
    logToFile("Initiating backend health check polling...");
    let attempts = 0;
    let healthy = false;
    while (attempts < 30) {
      try {
        const response = await fetch(`${runtime.apiBaseUrl}/api/health`);
        if (response.ok) {
          healthy = true;
          break;
        }
      } catch (e) {
        // Abaikan error koneksi saat booting
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logToFile(`Backend health check completed: healthy=${healthy} after ${attempts} attempts`);

    if (!healthy) {
      throw new Error(`Express backend gagal lolos health check dalam 15 detik di URL ${runtime.apiBaseUrl}`);
    }

    // 3. Inisialisasi BrowserWindow utama
    logToFile("Creating main BrowserWindow...");
    await createMainWindow();

    // 5. Daftarkan listener ready-to-show SEBELUM load agar tidak terlewat
    mainWindow.once('ready-to-show', () => {
      logToFile("Main window ready-to-show event fired. Displaying main window...");
      mainWindow.show();
      mainWindow.focus(); // Pindahkan fokus ke main window setelah ditampilkan
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        logToFile("Splash window closed.");
      }
    });

    // Safety timeout: jika ready-to-show tidak pernah terjadi dalam 10 detik, paksa tampilkan
    const safetyShowTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        logToFile("WARNING: ready-to-show timeout (10s). Force-showing main window.");
        mainWindow.show();
        mainWindow.focus(); // Pindahkan fokus ke main window setelah ditampilkan
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
      }
    }, 10000);

    // 4. Load berkas static UI atau local dev URL
    let indexPath;
    if (app.isPackaged) {
      indexPath = path.resolve(path.join(app.getAppPath(), "dist", "index.html"));
      logToFile(`Packaged mode: loading file: ${indexPath}`);
      logToFile(`File exists check: ${fs.existsSync(indexPath)}`);
      await mainWindow.loadFile(indexPath);
    } else {
      indexPath = "http://localhost:5174";
      logToFile(`Development mode: loading URL: ${indexPath}`);
      await mainWindow.loadURL(indexPath);
    }

    logToFile("loadFile/loadURL completed successfully.");

    // Jika ready-to-show sudah terjadi saat load, window sudah tampil.
    // Jika belum, safety timeout akan menampilkannya.
    // Bersihkan safety timeout jika window sudah tampil.
    if (mainWindow.isVisible()) {
      clearTimeout(safetyShowTimeout);
      logToFile("Main window is already visible after load.");
    }

  } catch (err) {
    logToFile(`CRITICAL: Gagal memulai aplikasi: ${err.message}\nStack: ${err.stack}`);
    try {
      dialog.showErrorBox(
        'Workspace Gagal Disiapkan',
        `MASJAVAS AI gagal dibuka karena kendala backend.\n\nDetail error:\n${err.message}\n\nCatatan lengkap tersimpan di folder logs.`
      );
    } catch (e) {}

    if (splashWindow && !splashWindow.isDestroyed()) {
      try {
        await splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
      } catch (e) {}
    }
  }
}

app.whenReady().then(startApplication);

app.on("window-all-closed", () => {
  logToFile("Event: window-all-closed fired.");
  if (process.platform !== "darwin") {
    logToFile("Quitting application.");
    app.quit();
  }
});

app.on("before-quit", () => {
  logToFile("Event: before-quit fired. Cleaning up Express backend processes...");
  if (backendServerInstance && backendServerInstance.close) {
    try {
      backendServerInstance.close();
      logToFile("Express backend closed successfully.");
    } catch (e) {
      logToFile(`Error closing backend: ${e.message}`);
    }
  }
});
