const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const HybridFileWatcher = require("./hybrid-file-watcher");
const DataSync = require("./data-sync");

let mainWindow;
let isDev = process.argv.includes("--dev");
let hybridFileWatcher = null; // 하이브리드 파일 감시 시스템
let dataSync = null; // 데이터 자동 백업 싱크

// Windows GPU 렌더링 깜빡임 방지
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu-compositing");

// 싱크 설정 파일 경로
function getSyncSettingsPath() {
  return path.join(getDataPath(), "sync-settings.json");
}

// 싱크 설정 로드
async function loadSyncSettings() {
  try {
    const settingsPath = getSyncSettingsPath();
    if (await fs.pathExists(settingsPath)) {
      return await fs.readJson(settingsPath);
    }
  } catch (e) {
    console.warn("[DataSync] 설정 로드 실패:", e.message);
  }
  return null;
}

// 싱크 설정 저장
async function saveSyncSettings(settings) {
  const settingsPath = getSyncSettingsPath();
  await fs.outputJson(settingsPath, settings, { spaces: 2 });
}

// 데이터 자동 싱크 초기화
async function initDataSync() {
  try {
    const settings = await loadSyncSettings();
    if (!settings || !settings.token || !settings.repoUrl) {
      console.log("[DataSync] 싱크 설정 없음, 자동 싱크 비활성화");
      return;
    }

    const dataPath = getDataPath();
    const syncDir = isDev
      ? path.join(__dirname, "../../.data-sync")
      : path.join(path.dirname(process.execPath), ".data-sync");

    dataSync = new DataSync({
      dataPath,
      repoUrl: settings.repoUrl,
      token: settings.token,
      syncDir,
      debounceMs: 30000,
    });

    await dataSync.init();
  } catch (error) {
    console.error("[DataSync] 초기화 실패:", error.message);
  }
}

// data 폴더 초기 구조 생성 (없을 때만)
async function ensureDataFolder() {
  const dataPath = getDataPath();
  const defaults = {
    "lib.json": [],
    "extensions.json": null,
    "media/files.json": [],
    "file/files.json": [],
  };

  for (const [file, defaultData] of Object.entries(defaults)) {
    const filePath = path.join(dataPath, file);
    if (!(await fs.pathExists(filePath))) {
      if (defaultData !== null) {
        await fs.outputJson(filePath, defaultData, { spaces: 2 });
      }
    }
  }
}

// 앱이 준비되면 실행
app.whenReady().then(async () => {
  await ensureDataFolder();
  createWindow();
  await initDataSync();
});

// 모든 윈도우가 닫혔을 때
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
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
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "../../assets/icons/icon.png"),
    backgroundColor: "#f5f5f5", // 깜빡임 방지 (CSS body 배경색과 동일)
    show: false, // 준비될 때까지 숨김
  });

  // HTML 파일 로드
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // 개발 모드에서는 DevTools 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 윈도우가 준비되면 표시
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

// 데이터 폴더 경로 함수
function getDataPath() {
  // 개발 모드와 배포 모드에 따라 경로 설정
  if (isDev) {
    return path.join(__dirname, "../../../data");
  } else {
    // 배포 모드: exe 파일이 있는 경로의 data 폴더
    return path.join(path.dirname(process.execPath), "data");
  }
}

// IPC 핸들러들
ipcMain.handle("get-data-path", () => {
  return getDataPath();
});

ipcMain.handle("load-json-file", async (event, filePath) => {
  try {
    const data = await fs.readJson(filePath);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-json-file", async (event, filePath, data) => {
  try {
    await fs.outputJson(filePath, data, { spaces: 2 });
    // 데이터 저장 시 자동 싱크 트리거
    if (dataSync) dataSync.requestSync();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-file", async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-folder", async (event, folderPath) => {
  try {
    await shell.showItemInFolder(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("scan-directory", async (event, dirPath, extensions) => {
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
              modified: stats.mtime.toISOString(),
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

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  return {
    success: !result.canceled,
    path: result.canceled ? null : result.filePaths[0],
  };
});

// 파일 삭제
ipcMain.handle("delete-file", async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      return { success: true };
    } else {
      return { success: false, error: "파일이 존재하지 않습니다." };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Lada GUI로 파일 보내기
ipcMain.handle("send-to-lada", async (event, filePath) => {
  try {
    const { exec } = require("child_process");
    // Lada GUI 설치 경로 (기본 경로)
    const ladaExePaths = [
      path.join(process.env.LOCALAPPDATA || "", "Lada GUI", "lada-gui.exe"),
      path.join(process.env.PROGRAMFILES || "", "Lada GUI", "Lada GUI.exe"),
    ];
    let ladaExe = null;
    for (const p of ladaExePaths) {
      if (await fs.pathExists(p)) {
        ladaExe = p;
        break;
      }
    }
    if (!ladaExe) {
      return { success: false, error: "Lada GUI를 찾을 수 없습니다. 설치되어 있는지 확인하세요." };
    }
    exec(`"${ladaExe}" "${filePath}"`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 경로 존재 확인
ipcMain.handle("path-exists", async (event, filePath) => {
  try {
    return await fs.pathExists(filePath);
  } catch (error) {
    return false;
  }
});

// 홈 디렉토리 가져오기
ipcMain.handle("get-home-directory", () => {
  return require("os").homedir();
});

// 파일 통계 정보
ipcMain.handle("get-file-stats", async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      return {
        success: true,
        stats: {
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString(),
        },
      };
    } else {
      return { success: false, error: "파일이 존재하지 않습니다." };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 빈 폴더 제거
ipcMain.handle("remove-empty-folders", async (event, rootPath) => {
  try {
    const removedFolders = [];

    async function removeEmptyFoldersRecursive(dirPath) {
      if (!(await fs.pathExists(dirPath))) {
        return;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter((entry) => entry.isDirectory());

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
      count: removedFolders.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =================== 하이브리드 파일 시스템 IPC 핸들러 ===================

// 하이브리드 시스템 초기화
ipcMain.handle("hybrid-system-init", async (event, libraryPaths) => {
  try {
    console.log("하이브리드 시스템 초기화 시작:", libraryPaths);

    if (hybridFileWatcher) {
      // 기존 감시자 중지
      hybridFileWatcher.stopWatching();
    }

    // 새 하이브리드 감시자 생성
    hybridFileWatcher = new HybridFileWatcher({
      libraryPaths: libraryPaths,
      videoExtensions: [
        ".avi",
        ".mp4",
        ".mov",
        ".wmv",
        ".avchd",
        ".flv",
        ".f4v",
        ".swf",
        ".mkv",
        ".mpeg2",
        ".ts",
        ".tp",
        ".webm",
      ],
      archiveExtensions: [
        ".zip",
        ".7z",
        ".ezc",
        ".alzip",
        ".001",
        ".zpaq",
        ".rar",
      ],
    });

    // 이벤트 리스너 설정 (렌더러에 전달)
    hybridFileWatcher.on("file-added", (data) => {
      if (mainWindow) {
        mainWindow.webContents.send("hybrid-file-added", data);
      }
    });

    hybridFileWatcher.on("file-deleted", (data) => {
      if (mainWindow) {
        mainWindow.webContents.send("hybrid-file-deleted", data);
      }
    });

    hybridFileWatcher.on("file-changed", (data) => {
      if (mainWindow) {
        mainWindow.webContents.send("hybrid-file-changed", data);
      }
    });

    hybridFileWatcher.on("metadata-updated", (data) => {
      if (mainWindow) {
        mainWindow.webContents.send("hybrid-metadata-updated", data);
      }
    });

    // 초기화 실행
    const result = await hybridFileWatcher.initialize();
    const stats = hybridFileWatcher.getStats();

    return {
      success: true,
      data: result,
      stats: stats,
    };
  } catch (error) {
    console.error("하이브리드 시스템 초기화 실패:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// 파일 실행 및 메타데이터 업데이트
ipcMain.handle("hybrid-execute-file", async (event, filePath) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error("하이브리드 시스템이 초기화되지 않았습니다.");
    }

    const result = await hybridFileWatcher.executeFile(filePath);
    return { success: result };
  } catch (error) {
    console.error("파일 실행 기록 실패:", error);
    return { success: false, error: error.message };
  }
});

// 평점 업데이트
ipcMain.handle("hybrid-update-rating", async (event, filePath, rating) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error("하이브리드 시스템이 초기화되지 않았습니다.");
    }

    const result = await hybridFileWatcher.updateFileMetadata(filePath, {
      rating,
    });
    return { success: result };
  } catch (error) {
    console.error("평점 업데이트 실패:", error);
    return { success: false, error: error.message };
  }
});

// 설명 업데이트
ipcMain.handle(
  "hybrid-update-description",
  async (event, filePath, description) => {
    try {
      if (!hybridFileWatcher) {
        throw new Error("하이브리드 시스템이 초기화되지 않았습니다.");
      }

      const result = await hybridFileWatcher.updateFileMetadata(filePath, {
        description,
      });
      return { success: result };
    } catch (error) {
      console.error("설명 업데이트 실패:", error);
      return { success: false, error: error.message };
    }
  }
);

// 증분 스캔 (변경된 파일만 확인)
ipcMain.handle("hybrid-incremental-scan", async (event) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error("하이브리드 시스템이 초기화되지 않았습니다.");
    }

    // 하이브리드 시스템에서는 실시간 감시로 자동 업데이트되므로
    // 캐시 상태만 반환
    const stats = hybridFileWatcher.getStats();

    return {
      success: true,
      addedCount: 0,
      removedCount: 0,
      changedCount: 0,
      message: "실시간 감시 활성화됨",
      stats: stats,
    };
  } catch (error) {
    console.error("증분 스캔 실패:", error);
    return { success: false, error: error.message };
  }
});

// 하이브리드 시스템 통계 조회
ipcMain.handle("hybrid-get-stats", async (event) => {
  try {
    if (!hybridFileWatcher) {
      return {
        success: false,
        error: "하이브리드 시스템이 초기화되지 않았습니다.",
      };
    }

    const stats = hybridFileWatcher.getStats();
    return { success: true, stats };
  } catch (error) {
    console.error("통계 조회 실패:", error);
    return { success: false, error: error.message };
  }
});

// 하이브리드 시스템 고급 정리
ipcMain.handle("hybrid-advanced-cleanup", async (event) => {
  try {
    if (!hybridFileWatcher) {
      throw new Error("하이브리드 시스템이 초기화되지 않았습니다.");
    }

    console.log("하이브리드 고급 정리 시작...");
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
        totalFiles: cache.size,
      },
    };
  } catch (error) {
    console.error("하이브리드 고급 정리 실패:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// 빈 폴더 재귀 제거 함수 (향상된 버전)
async function removeEmptyFoldersRecursive(rootPath) {
  const removedFolders = [];

  async function removeEmptyFoldersInDir(dirPath) {
    try {
      if (!(await fs.pathExists(dirPath))) {
        return;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const subdirs = entries.filter((entry) => entry.isDirectory());

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
ipcMain.handle("backup-data", async (event) => {
  try {
    const dataPath = getDataPath();

    // data 폴더 존재 확인
    if (!(await fs.pathExists(dataPath))) {
      throw new Error("Data 폴더를 찾을 수 없습니다.");
    }

    // 현재 시간으로 백업 파일명 생성
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\./g, "-")
      .substring(0, 19);
    const backupFileName = `data_${timestamp}.zip`;

    // 백업 저장 위치 선택 다이얼로그
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "데이터 백업 저장 위치 선택",
      defaultPath: backupFileName,
      filters: [{ name: "ZIP 파일", extensions: ["zip"] }],
    });

    if (canceled || !filePath) {
      return { success: false, message: "사용자가 취소했습니다." };
    }

    // archiver 모듈을 사용하여 ZIP 압축
    const archiver = require("archiver");
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        const size = (archive.pointer() / 1024 / 1024).toFixed(2);
        resolve({
          success: true,
          message: `백업이 완료되었습니다.\n파일: ${path.basename(
            filePath
          )}\n크기: ${size}MB`,
          filePath: filePath,
          size: size,
        });
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(dataPath, "data");
      archive.finalize();
    });
  } catch (error) {
    console.error("백업 실패:", error);
    return {
      success: false,
      message: "백업에 실패했습니다: " + error.message,
    };
  }
});

// =================== 동기화 설정 IPC 핸들러 ===================

// 싱크 설정 로드
ipcMain.handle("sync-load-settings", async () => {
  const settings = await loadSyncSettings();
  // 토큰은 마스킹해서 반환
  if (settings && settings.token) {
    return {
      ...settings,
      tokenMasked: settings.token.substring(0, 7) + "..." + settings.token.slice(-4),
      hasToken: true,
    };
  }
  return settings || { repoUrl: "", hasToken: false };
});

// 싱크 설정 저장 & 재초기화
ipcMain.handle("sync-save-settings", async (event, { repoUrl, token }) => {
  try {
    await saveSyncSettings({ repoUrl, token });

    // 기존 싱크 중지
    if (dataSync) {
      dataSync.destroy();
      dataSync = null;
    }

    // 새 설정으로 재초기화
    await initDataSync();

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 싱크 연결 해제
ipcMain.handle("sync-disconnect", async () => {
  try {
    if (dataSync) {
      dataSync.destroy();
      dataSync = null;
    }
    // 설정 파일 삭제
    const settingsPath = getSyncSettingsPath();
    if (await fs.pathExists(settingsPath)) {
      await fs.remove(settingsPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 싱크 연결 테스트
ipcMain.handle("sync-test", async (event, { repoUrl, token }) => {
  try {
    const { execFile } = require("child_process");
    const authUrl = repoUrl.replace("https://", `https://${token}@`);

    return new Promise((resolve) => {
      execFile("git", ["ls-remote", authUrl], { timeout: 15000 }, (error) => {
        if (error) {
          resolve({ success: false, error: "인증 실패 또는 저장소를 찾을 수 없습니다." });
        } else {
          resolve({ success: true });
        }
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 싱크 상태 확인
ipcMain.handle("sync-get-status", async () => {
  return {
    isActive: dataSync !== null && dataSync.isInitialized,
    isSyncing: dataSync ? dataSync.isSyncing : false,
  };
});

// 앱 종료 시 정리
app.on("before-quit", async () => {
  if (hybridFileWatcher) {
    console.log("하이브리드 시스템 종료 중...");
    hybridFileWatcher.stopWatching();
    hybridFileWatcher = null;
  }
  if (dataSync) {
    console.log("데이터 싱크 종료 중...");
    // 종료 전 마지막 싱크
    await dataSync.syncNow();
    dataSync.destroy();
    dataSync = null;
  }
});
