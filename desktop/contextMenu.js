import { Menu } from 'electron';

/**
 * Mendaftarkan event listener context-menu pada BrowserWindow utama.
 * Menyediakan opsi klik kanan seperti Salin, Tempel, Potong, dll.
 * @param {BrowserWindow} mainWindow - Jendela browser utama
 */
export function registerContextMenu(mainWindow) {
  mainWindow.webContents.on("context-menu", (event, params) => {
    const isEditable = params.isEditable;
    const hasText = params.selectionText.length > 0;
    
    // Cek jika berjalan dalam mode development (tidak dipaketkan)
    const isDev = process.env.MASJAVAS_DESKTOP && !process.env.MASJAVAS_DESKTOP_PACKAGED;

    const menuTemplate = isEditable
      ? [
          { role: "undo", label: "Urungkan (Undo)" },
          { role: "redo", label: "Ulangi (Redo)" },
          { type: "separator" },
          { role: "cut", label: "Potong (Cut)" },
          { role: "copy", label: "Salin (Copy)" },
          { role: "paste", label: "Tempel (Paste)" },
          { type: "separator" },
          { role: "selectAll", label: "Pilih Semua (Select All)" }
        ]
      : [
          { role: "copy", label: "Salin (Copy)", enabled: hasText },
          { role: "selectAll", label: "Pilih Semua (Select All)" }
        ];

    if (isDev) {
      menuTemplate.push({ type: "separator" });
      menuTemplate.push({
        label: "Periksa Elemen (Inspect Element)",
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
        }
      });
    }

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup({ window: mainWindow });
  });
}

export default { registerContextMenu };
