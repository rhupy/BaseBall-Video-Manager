const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');

let mainWindow;
let isDev = process.argv.includes('--dev');

// 앱이 준비되면 실행
app.whenReady().then(createWindow);

// 모든 윈도우가 닫혔을 때
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    show: false // 준비될 때까지 숨김
  });

  // HTML 파일 로드
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 개발 모드에서는 DevTools 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// IPC 핸들러들
ipcMain.handle('get-data-path', () => {
  return path.join(__dirname, '../../../data');
});

ipcMain.handle('load-json-file', async (event, filePath) => {
  try {
    const data = await fs.readJson(filePath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-json-file', async (event, filePath, data) => {
  try {
    await fs.outputJson(filePath, data, { spaces: 2 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    await shell.showItemInFolder(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-directory', async (event, dirPath, extensions) => {
  try {
    const files = [];
    
    async function scanRecursively(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanRecursively(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            const stats = await fs.stat(fullPath);
            files.push({
              filename: entry.name,
              fullpath: fullPath,
              size: stats.size,
              modified: stats.mtime.toISOString()
            });
          }
        }
      }
    }
    
    if (await fs.pathExists(dirPath)) {
      await scanRecursively(dirPath);
    }
    
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  return {
    success: !result.canceled,
    path: result.canceled ? null : result.filePaths[0]
  };
});

// 파일 삭제
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      return { success: true };
    } else {
      return { success: false, error: '파일이 존재하지 않습니다.' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 경로 존재 확인
ipcMain.handle('path-exists', async (event, filePath) => {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    return false;
  }
});

// 홈 디렉토리 가져오기
ipcMain.handle('get-home-directory', () => {
  return require('os').homedir();
});

// 파일 통계 정보
ipcMain.handle('get-file-stats', async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      return {
        success: true,
        stats: {
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString()
        }
      };
    } else {
      return { success: false, error: '파일이 존재하지 않습니다.' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 빈 폴더 제거
ipcMain.handle('remove-empty-folders', async (event, rootPath) => {
  try {
    const removedFolders = [];
    
    async function removeEmptyFoldersRecursive(dirPath) {
      if (!await fs.pathExists(dirPath)) {
        return;
      }
      
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter(entry => entry.isDirectory());
      
      // 하위 디렉토리들 먼저 처리
      for (const subdir of subdirs) {
        const subdirPath = path.join(dirPath, subdir.name);
        await removeEmptyFoldersRecursive(subdirPath);
      }
      
      // 현재 디렉토리가 비어있는지 확인
      const currentEntries = await fs.readdir(dirPath);
      if (currentEntries.length === 0) {
        try {
          await fs.rmdir(dirPath);
          removedFolders.push(dirPath);
        } catch (error) {
          console.warn(`폴더 삭제 실패: ${dirPath}`, error.message);
        }
      }
    }
    
    await removeEmptyFoldersRecursive(rootPath);
    
    return {
      success: true,
      removedFolders,
      count: removedFolders.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});