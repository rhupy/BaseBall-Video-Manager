const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const HybridFileWatcher = require('./hybrid-file-watcher');

let mainWindow;
let isDev = process.argv.includes('--dev');
let hybridFileWatcher = null; // 하이브리드 파일 감시 시스템

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

// 데이터 폴더 경로 함수
function getDataPath() {
  // 개발 모드와 배포 모드에 따라 경로 설정
  if (isDev) {
    return path.join(__dirname, '../../../data');
  } else {
    // 배포 모드: exe 파일이 있는 경로의 data 폴더
    return path.join(process.resourcesPath, '../data');
  }
}

// IPC 핸들러들
ipcMain.handle('get-data-path', () => {
  return getDataPath();
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

// =================== 하이브리드 파일 시스템 IPC 핸들러 ===================

// 하이브리드 시스템 초기화
ipcMain.handle('hybrid-system-init', async (event, libraryPaths) => {
  try {
    console.log('하이브리드 시스템 초기화 시작:', libraryPaths);
    
    if (hybridFileWatcher) {
      // 기존 감시자 중지
      hybridFileWatcher.stopWatching();
    }

    // 새 하이브리드 감시자 생성
    hybridFileWatcher = new HybridFileWatcher({
      libraryPaths: libraryPaths,
      videoExtensions: ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp', '.webm'],
      archiveExtensions: ['.zip', '.7z', '.ezc', '.alzip', '.001', '.zpaq', '.rar']
    });

    // 이벤트 리스너 설정 (렌더러에 전달)
    hybridFileWatcher.on('file-added', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('hybrid-file-added', data);
      }
    });

    hybridFileWatcher.on('file-deleted', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('hybrid-file-deleted', data);
      }
    });

    hybridFileWatcher.on('file-changed', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('hybrid-file-changed', data);
      }
    });

    hybridFileWatcher.on('metadata-updated', (data) => {
      if (mainWindow) {
        mainWindow.webContents.send('hybrid-metadata-updated', data);
      }
    });

    // 초기화 실행
    const result = await hybridFileWatcher.initialize();
    const stats = hybridFileWatcher.getStats();

    return {
      success: true,
      data: result,
      stats: stats
    };

  } catch (error) {
    console.error('하이브리드 시스템 초기화 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 파일 실행 및 메타데이터 업데이트
ipcMain.handle('hybrid-execute-file', async (event, filePath) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error('하이브리드 시스템이 초기화되지 않았습니다.');
    }

    const result = await hybridFileWatcher.executeFile(filePath);
    return { success: result };
  } catch (error) {
    console.error('파일 실행 기록 실패:', error);
    return { success: false, error: error.message };
  }
});

// 평점 업데이트
ipcMain.handle('hybrid-update-rating', async (event, filePath, rating) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error('하이브리드 시스템이 초기화되지 않았습니다.');
    }

    const result = await hybridFileWatcher.updateFileMetadata(filePath, { rating });
    return { success: result };
  } catch (error) {
    console.error('평점 업데이트 실패:', error);
    return { success: false, error: error.message };
  }
});

// 설명 업데이트
ipcMain.handle('hybrid-update-description', async (event, filePath, description) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error('하이브리드 시스템이 초기화되지 않았습니다.');
    }

    const result = await hybridFileWatcher.updateFileMetadata(filePath, { description });
    return { success: result };
  } catch (error) {
    console.error('설명 업데이트 실패:', error);
    return { success: false, error: error.message };
  }
});

// 증분 스캔 (변경된 파일만 확인)
ipcMain.handle('hybrid-incremental-scan', async (event) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error('하이브리드 시스템이 초기화되지 않았습니다.');
    }

    // 하이브리드 시스템에서는 실시간 감시로 자동 업데이트되므로
    // 캐시 상태만 반환
    const stats = hybridFileWatcher.getStats();
    
    return {
      success: true,
      addedCount: 0,
      removedCount: 0,
      changedCount: 0,
      message: '실시간 감시 활성화됨',
      stats: stats
    };
  } catch (error) {
    console.error('증분 스캔 실패:', error);
    return { success: false, error: error.message };
  }
});

// 하이브리드 시스템 통계 조회
ipcMain.handle('hybrid-get-stats', async (event) => {
  try {
    if (!hybridFileWatcher) {
      return { success: false, error: '하이브리드 시스템이 초기화되지 않았습니다.' };
    }

    const stats = hybridFileWatcher.getStats();
    return { success: true, stats };
  } catch (error) {
    console.error('통계 조회 실패:', error);
    return { success: false, error: error.message };
  }
});

// 하이브리드 시스템 고급 정리
ipcMain.handle('hybrid-advanced-cleanup', async (event) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error('하이브리드 시스템이 초기화되지 않았습니다.');
    }

    console.log('하이브리드 고급 정리 시작...');
    const startTime = Date.now();
    
    let totalDuplicatesRemoved = 0;
    let totalInvalidFilesRemoved = 0;
    let totalEmptyFoldersRemoved = 0;

    // 1. 캐시에서 무효한 파일 제거
    const cache = hybridFileWatcher.cache;
    const invalidFiles = [];
    
    for (const [cacheKey, fileInfo] of cache.entries()) {
      try {
        const exists = await fs.pathExists(fileInfo.Fullpath);
        if (!exists) {
          invalidFiles.push({ key: cacheKey, info: fileInfo });
        }
      } catch (error) {
        // 접근 불가능한 파일도 무효 파일로 처리
        invalidFiles.push({ key: cacheKey, info: fileInfo });
      }
    }

    // 무효 파일 제거
    for (const invalid of invalidFiles) {
      cache.delete(invalid.key);
      totalInvalidFilesRemoved++;
      console.log(`무효 파일 제거: ${invalid.info.Filename}`);
    }

    // 2. 중복 파일 제거 (Fullpath 기준)
    const seenPaths = new Set();
    const duplicateKeys = [];

    for (const [cacheKey, fileInfo] of cache.entries()) {
      if (seenPaths.has(fileInfo.Fullpath)) {
        duplicateKeys.push(cacheKey);
        totalDuplicatesRemoved++;
        console.log(`중복 파일 제거: ${fileInfo.Filename}`);
      } else {
        seenPaths.add(fileInfo.Fullpath);
      }
    }

    // 중복 파일 제거
    for (const key of duplicateKeys) {
      cache.delete(key);
    }

    // 3. 빈 폴더 제거
    const libraries = hybridFileWatcher.libraryPaths;
    
    for (const libraryPath of libraries) {
      try {
        const exists = await fs.pathExists(libraryPath);
        if (exists) {
          const result = await removeEmptyFoldersRecursive(libraryPath);
          totalEmptyFoldersRemoved += result.length;
          console.log(`${libraryPath}에서 ${result.length}개 빈 폴더 제거`);
        }
      } catch (error) {
        console.warn(`빈 폴더 제거 실패 (${libraryPath}):`, error.message);
      }
    }

    // 4. 결과 데이터 정리
    const result = hybridFileWatcher.getFilesFromCache();
    const duration = Date.now() - startTime;

    // 통계 업데이트
    hybridFileWatcher.stats.totalFiles = cache.size;
    hybridFileWatcher.stats.lastScanTime = new Date();

    console.log(`하이브리드 고급 정리 완료: ${duration}ms`);
    console.log(`- 무효 파일 ${totalInvalidFilesRemoved}개 제거`);
    console.log(`- 중복 파일 ${totalDuplicatesRemoved}개 제거`);
    console.log(`- 빈 폴더 ${totalEmptyFoldersRemoved}개 제거`);

    return {
      success: true,
      data: result,
      stats: {
        duration,
        duplicatesRemoved: totalDuplicatesRemoved,
        invalidFilesRemoved: totalInvalidFilesRemoved,
        emptyFoldersRemoved: totalEmptyFoldersRemoved,
        totalFiles: cache.size
      }
    };

  } catch (error) {
    console.error('하이브리드 고급 정리 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 빈 폴더 재귀 제거 함수 (향상된 버전)
async function removeEmptyFoldersRecursive(rootPath) {
  const removedFolders = [];
  
  async function removeEmptyFoldersInDir(dirPath) {
    try {
      if (!await fs.pathExists(dirPath)) {
        return;
      }
      
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter(entry => entry.isDirectory());
      
      // 하위 디렉토리들 먼저 처리
      for (const subdir of subdirs) {
        const subdirPath = path.join(dirPath, subdir.name);
        await removeEmptyFoldersInDir(subdirPath);
      }
      
      // 현재 디렉토리가 비어있는지 다시 확인
      const currentEntries = await fs.readdir(dirPath);
      if (currentEntries.length === 0) {
        try {
          await fs.rmdir(dirPath);
          removedFolders.push(dirPath);
          console.log(`빈 폴더 제거: ${dirPath}`);
        } catch (error) {
          console.warn(`폴더 삭제 실패: ${dirPath}`, error.message);
        }
      }
    } catch (error) {
      // 접근 불가능한 폴더는 건너뛰기
      console.warn(`폴더 접근 실패: ${dirPath}`, error.message);
    }
  }
  
  await removeEmptyFoldersInDir(rootPath);
  return removedFolders;
}

// 데이터 폴더 백업
ipcMain.handle('backup-data', async (event) => {
  try {
    const dataPath = getDataPath();
    
    // data 폴더 존재 확인
    if (!await fs.pathExists(dataPath)) {
      throw new Error('Data 폴더를 찾을 수 없습니다.');
    }

    // 현재 시간으로 백업 파일명 생성
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19);
    const backupFileName = `data_${timestamp}.zip`;
    
    // 백업 저장 위치 선택 다이얼로그
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '데이터 백업 저장 위치 선택',
      defaultPath: backupFileName,
      filters: [
        { name: 'ZIP 파일', extensions: ['zip'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, message: '사용자가 취소했습니다.' };
    }

    // archiver 모듈을 사용하여 ZIP 압축
    const archiver = require('archiver');
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const size = (archive.pointer() / 1024 / 1024).toFixed(2);
        resolve({
          success: true,
          message: `백업이 완료되었습니다.\n파일: ${path.basename(filePath)}\n크기: ${size}MB`,
          filePath: filePath,
          size: size
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(dataPath, 'data');
      archive.finalize();
    });

  } catch (error) {
    console.error('백업 실패:', error);
    return {
      success: false,
      message: '백업에 실패했습니다: ' + error.message
    };
  }
});

// 앱 종료 시 하이브리드 시스템 정리
app.on('before-quit', () => {
  if (hybridFileWatcher) {
    console.log('하이브리드 시스템 종료 중...');
    hybridFileWatcher.stopWatching();
    hybridFileWatcher = null;
  }
});