const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;

// Check if backend server is already reachable
function checkServer(port, callback) {
  const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
    callback(res.statusCode === 200);
  });
  req.on('error', () => callback(false));
  req.setTimeout(1500, () => {
    req.destroy();
    callback(false);
  });
}

function startBackend() {
  const rootDir = path.resolve(__dirname, '..');
  const backendDir = path.join(rootDir, 'backend');
  const venvPython = process.platform === 'win32'
    ? path.join(backendDir, '.venv', 'Scripts', 'python.exe')
    : path.join(backendDir, '.venv', 'bin', 'python');

  console.log('[LinguaDoc Desktop] Starting local Python backend...');
  backendProcess = spawn(
    venvPython,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'],
    {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: 'ignore',
      detached: false
    }
  );

  backendProcess.on('error', (err) => {
    console.error('[LinguaDoc Desktop] Failed to spawn Python backend:', err.message);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'LinguaDoc — Universal Document Translator',
    backgroundColor: '#151518',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load frontend: try dev port first, then local built dist or backend static
  const devUrl = `http://localhost:${FRONTEND_PORT}`;
  const prodUrl = `http://127.0.0.1:${BACKEND_PORT}`;

  checkServer(FRONTEND_PORT, (isFrontendLive) => {
    if (isFrontendLive) {
      mainWindow.loadURL(devUrl);
    } else {
      mainWindow.loadURL(prodUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  checkServer(BACKEND_PORT, (isLive) => {
    if (!isLive) {
      startBackend();
    }
    // Give backend half a second if started
    setTimeout(createWindow, 800);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {
      // ignore
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
