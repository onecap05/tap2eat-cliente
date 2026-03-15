const { app, BrowserWindow } = require('electron');
const path = require('path');

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Security best practices
            preload: path.join(__dirname, '../preload/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // In development mode, we point Electron to the Angular local server
    // so we can have Live Reloading when we change UI code.
    mainWindow.loadURL('http://localhost:4200');
    
    // Uncomment this line if you want the DevTools console to open automatically
    mainWindow.webContents.openDevTools();
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
    // Keep application running on macOS even if all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});