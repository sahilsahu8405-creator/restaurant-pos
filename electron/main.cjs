const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startPrinterServer, server: printerServer } = require('../scripts/restohub-printer-agent.cjs');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function startPrinterAgent() {
  try {
    startPrinterServer(9100);
    console.log('[RestoHub Electron] Embedded hardware printer agent active on port 9100.');
  } catch (err) {
    console.error('[RestoHub Electron] Could not start printer agent:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'RestoHub — Modern Restaurant Operating System',
    autoHideMenuBar: true,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Keyboard shortcuts: F11 for Fullscreen, F12 for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/#/app';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/app' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Hardware Printing
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Failed to get system printers:', err);
    return [];
  }
});

ipcMain.handle('print-silent', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: options.deviceName || '',
        copies: options.copies || 1,
        pageSize: options.pageSize || { width: 80000, height: 297000 }, // Standard 80mm roll default
      },
      (success, failureReason) => {
        if (!success) {
          console.error('Silent print failed:', failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  }
  return false;
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  startPrinterAgent();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try {
    printerServer?.close();
  } catch (_) {}
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    printerServer?.close();
  } catch (_) {}
});

