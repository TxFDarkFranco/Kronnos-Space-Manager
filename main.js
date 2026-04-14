const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f13',
      symbolColor: '#ffffff'
    },
    backgroundColor: '#0f0f13'
  });

  win.loadFile('index.html');
  win.removeMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC commands for System Verification
ipcMain.handle('get-installed-apps', async () => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'get_apps.ps1');
    exec(`powershell -ExecutionPolicy Bypass -NoProfile -File "${scriptPath}"`, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout) => {
      if (err) {
        console.error(err);
        return resolve([]);
      }
      try {
        const apps = JSON.parse(stdout);
        const unique = [];
        const map = new Map();
        
        let appArray = Array.isArray(apps) ? apps : [apps];
        for (const item of appArray) {
          if(item && item.DisplayName && !map.has(item.DisplayName)) {
            map.set(item.DisplayName, true);
            unique.push(item);
          }
        }
        resolve(unique);
      } catch (e) {
        console.error("Parse Error", e);
        resolve([]);
      }
    });
  });
});

ipcMain.handle('get-drives', async () => {
  return new Promise((resolve) => {
    const psCommand = `Get-Volume | Where-Object DriveType -eq 'Fixed' | Select-Object DriveLetter, Size, SizeRemaining | ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -Command "${psCommand}"`, (err, stdout) => {
      if (err) return resolve([]);
      try {
        let drives = JSON.parse(stdout);
        if (!Array.isArray(drives)) drives = [drives];
        
        // Ensure only valid mounted disks pass
        drives = drives.filter(d => d.DriveLetter);
        resolve(drives);
      } catch (e) {
        resolve([]);
      }
    });
  });
});

ipcMain.handle('open-folder', (event, folderPath) => {
   shell.openPath(folderPath);
});

ipcMain.handle('get-file-icon', async (event, iconString) => {
   if (!iconString) return null;
   let targetPath = iconString.split(',')[0].replace(/"/g, '').trim();
   targetPath = targetPath.replace(/\//g, '\\');

   if (!fs.existsSync(targetPath)) return null;
   
   const ext = path.extname(targetPath).toLowerCase();
   if (ext === '.ico' || ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
       try {
           const buffer = fs.readFileSync(targetPath);
           const mime = ext === '.ico' ? 'image/x-icon' : (ext === '.png' ? 'image/png' : 'image/jpeg');
           return `data:${mime};base64,${buffer.toString('base64')}`;
       } catch (err) {}
   }
   
   try {
      const nativeIcon = await app.getFileIcon(targetPath, { size: 'normal' });
      return nativeIcon.toDataURL();
   } catch (e) {
      return null;
   }
});

ipcMain.handle('uninstall-app', async (event, uninstallString) => {
  if (!uninstallString) return { success: false, msg: "Ningún comando de desinstalación disponible." };
  return new Promise((resolve) => {
    exec(uninstallString, (err) => {
       if (err) return resolve({success: false, msg: err.message});
       resolve({success: true});
    });
  });
});
