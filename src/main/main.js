const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDevelopment = !app.isPackaged;

const DEVELOPMENT_URL = 'http://localhost:4200';
const PRODUCTION_URL = 'https://tap2eat.me';

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (isDevelopment) {
        mainWindow.loadURL(DEVELOPMENT_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL(PRODUCTION_URL);
    }

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(PRODUCTION_URL) || url.startsWith(DEVELOPMENT_URL)) {
            return { action: 'allow' };
        }

        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});