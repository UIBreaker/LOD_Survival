const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 520,
    backgroundColor: '#10191d', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.maximize();
});
app.on('window-all-closed', () => app.quit());
