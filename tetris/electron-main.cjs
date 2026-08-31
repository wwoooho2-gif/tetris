const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const iconPath = path.join(__dirname, 'assets', 'fish-logo.ico');
const DISCORD_APP_ID = process.env.DISCORD_APP_ID || '1134586435962326108';
const DISCORD_LARGE_IMAGE = process.env.DISCORD_LARGE_IMAGE || 'fish_logo';
const DISCORD_LARGE_TEXT = process.env.DISCORD_LARGE_TEXT || 'FISH THAT STUFF';

let rpcClient = null;
let mainWindow = null;

function setDiscordActivity(activity) {
  if (!rpcClient || !DISCORD_APP_ID || !activity) return;

  try {
    rpcClient.setActivity({
      details: activity.details || 'Playing FISH THAT STUFF',
      state: activity.state || 'In the docks',
      largeImageKey: activity.largeImageKey || DISCORD_LARGE_IMAGE,
      largeImageText: activity.largeImageText || DISCORD_LARGE_TEXT,
      smallImageKey: activity.smallImageKey || 'fish_logo',
      smallImageText: activity.smallImageText || 'Custom build',
      instance: false,
      timestamps: { start: Date.now() }
    });
  } catch (error) {
    console.warn('Discord RPC activity update failed:', error.message);
  }
}

function initDiscordRpc() {
  if (!DISCORD_APP_ID || process.env.DISCORD_SKIP_RPC === '1') return;

  try {
    const { Client } = require('discord-rpc');
    rpcClient = new Client({ transport: 'ipc' });

    rpcClient.on('ready', () => {
      setDiscordActivity({
        details: 'Playing FISH THAT STUFF',
        state: 'In the docks',
        largeImageKey: DISCORD_LARGE_IMAGE,
        largeImageText: DISCORD_LARGE_TEXT
      });
    });

    rpcClient.login({ clientId: DISCORD_APP_ID }).catch((error) => {
      console.warn('Discord RPC unavailable:', error.message);
    });
  } catch (error) {
    console.warn('Discord RPC not available:', error.message);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 900,
    minHeight: 640,
    frame: true,
    fullscreen: false,
    kiosk: false,
    backgroundColor: '#04060b',
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      nativeWindowOpen: true,
      devTools: false
    }
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, 'index.html'));
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Disable DevTools and right-click context menu
  win.webContents.on('before-input-event', (event, input) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+C
    if (input.control && input.shift && input.key.toLowerCase() === 'i') event.preventDefault();
    if (input.control && input.shift && input.key.toLowerCase() === 'c') event.preventDefault();
    if (input.key === 'F12') event.preventDefault();
  });

  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  win.webContents.on('did-finish-load', () => {
    setDiscordActivity({
      details: 'Playing FISH THAT STUFF',
      state: 'In the docks',
      largeImageKey: DISCORD_LARGE_IMAGE,
      largeImageText: DISCORD_LARGE_TEXT
    });
  });
}

// IPC Handlers for renderer process communication
ipcMain.handle('toggle-fullscreen', (event, enabled) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(enabled);
  return mainWindow.isFullScreen();
});

ipcMain.handle('get-fullscreen', (event) => {
  if (!mainWindow) return false;
  return mainWindow.isFullScreen();
});

ipcMain.handle('set-discord-activity', (event, activity) => {
  setDiscordActivity(activity);
});

app.whenReady().then(() => {
  initDiscordRpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
