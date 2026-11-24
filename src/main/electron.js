const { app, BrowserWindow, ipcMain, shell, dialog, Menu, net } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const DataSync = require("./data-sync");
const JsonStore = require("./json-store");
const { localFileStamp } = require("./local-time");
const { closeLockingApps } = require("./file-unlocker");
const MetadataService = require("./metadata/metadata-service");
const metadataAdapters = require("./metadata/sources");
const { initAutoUpdate, checkForUpdates, getUpdateState } = require("./auto-update");

let mainWindow;
let isDev = process.argv.includes("--dev");
let dataSync = null; // 데이터 자동 백업 싱크
let isQuitting = false; // 종료 정리 진행 여부
const jsonStore = new JsonStore(); // 원자적 쓰기 + .bak 복구
let metadataService = null; // 영상 정보 수집 (처음 요청될 때 생성)

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
    dataSync = new DataSync({
      dataPath,
      repoUrl: settings.repoUrl,
      token: settings.token,
      syncDir: getSyncDir(),
      debounceMs: 30000,
    });
    // autoSync는 설정 파일에 저장, 기본값 false (새 설치 시 해제)
    dataSync.autoSync = settings.autoSync === true;

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
  try {
    await ensureDataFolder();
  } catch (error) {
    console.error("데이터 폴더 생성 실패:", error);
  }
  createWindow();
  // 자동 업데이트 (설치판에서만 동작)
  initAutoUpdate({ onState: (state) => sendToRenderer("update-state", state) });
  try {
    await initDataSync();
  } catch (error) {
    console.error("데이터 싱크 초기화 실패:", error);
  }
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
  // 기본 메뉴 제거
  Menu.setApplicationMenu(null);

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
  if (isDev) {
    return path.join(__dirname, "../../../data");
  } else {
    // 배포 모드: AppData에 저장 (설치/업데이트 시 삭제되지 않음)
    return path.join(app.getPath("userData"), "data");
  }
}

// 싱크 디렉토리 경로
function getSyncDir() {
  if (isDev) {
    return path.join(__dirname, "../../.data-sync");
  } else {
    return path.join(app.getPath("userData"), ".data-sync");
  }
}

// IPC 핸들러들

// =================== 영상 정보(메타데이터) ===================

// 렌더러로 이벤트 전달 (창이 없으면 무시)
function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function getMetadataService() {
  if (!metadataService) {
    metadataService = new MetadataService({
      dataPath: getDataPath(),
      cacheDir: path.join(app.getPath("userData"), "meta-cache"),
      jsonStore,
      adapters: metadataAdapters,
      // Electron의 네트워크 스택 사용 (일반 브라우저와 같은 방식으로 요청)
      fetchImpl: (url, options) => net.fetch(url, options),
    });
    metadataService.on("updated", (records) => sendToRenderer("meta-updated", records));
    metadataService.on("status", (status) => sendToRenderer("meta-status", status));
  }
  await metadataService.load();
  return metadataService;
}

// 저장된 영상 정보 전체 (품번 → 기록)
ipcMain.handle("meta-get-all", async () => (await getMetadataService()).getAll());

// 정보가 없는 품번을 조회 대기열에 추가
ipcMain.handle("meta-enqueue", async (event, codes) => (await getMetadataService()).enqueue(codes));

// 이미지 주소 → 로컬 캐시 파일 URL (없으면 내려받음)
ipcMain.handle("meta-get-image", async (event, url) => (await getMetadataService()).getImage(url));

// 출처 설정 조회/변경, 상태 확인
ipcMain.handle("meta-describe", async () => (await getMetadataService()).describe());
ipcMain.handle("meta-update-settings", async (event, settings) => {
  try {
    return { success: true, data: await (await getMetadataService()).updateSettings(settings) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("meta-check-sources", async () => (await getMetadataService()).checkSources());

// 배우의 전체 작품 목록 (저장본이 있으면 그것을, 없거나 오래됐으면 출처에서 조회)
ipcMain.handle("meta-actress-works", async (event, actress, refresh) => {
  try {
    return await (await getMetadataService()).getActressWorks(actress, { refresh: !!refresh });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 알림/확인 창: 렌더러의 기본 alert()/confirm()은 Windows에서 닫은 뒤 입력창에 글자가
// 입력되지 않는 문제가 있어, 메인 프로세스의 메시지 박스로 대신 띄운다 (동기 호출)
function showDialogSync(event, options) {
  const owner = BrowserWindow.fromWebContents(event.sender);
  return owner ? dialog.showMessageBoxSync(owner, options) : dialog.showMessageBoxSync(options);
}

ipcMain.on("dialog-alert", (event, message) => {
  try {
    showDialogSync(event, {
      type: "info",
      title: "Baseball Video Manager",
      message: String(message),
      buttons: ["확인"],
      noLink: true,
    });
  } catch (error) {
    console.error("알림 창 표시 실패:", error);
  }
  event.returnValue = true;
});

ipcMain.on("dialog-confirm", (event, message) => {
  let confirmed = false;
  try {
    const choice = showDialogSync(event, {
      type: "question",
      title: "Baseball Video Manager",
      message: String(message),
      buttons: ["확인", "취소"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    confirmed = choice === 0;
  } catch (error) {
    console.error("확인 창 표시 실패:", error);
  }
  event.returnValue = confirmed;
});
// 자동 업데이트 상태 조회 / 수동 확인
ipcMain.handle("update-get-state", () => getUpdateState());
ipcMain.handle("update-check", () => {
  checkForUpdates(true);
  return getUpdateState();
});

// 앱 버전 (package.json 기준)
ipcMain.handle("get-app-version", () => {
  try {
    return require("../../package.json").version;
  } catch (error) {
    return app.getVersion();
  }
});

ipcMain.handle("get-data-path", () => {
  return getDataPath();
});

ipcMain.handle("load-json-file", async (event, filePath) => {
  try {
    // 실패 시 { success:false, code: "ENOENT" | "CORRUPT" | ..., error }
    return await jsonStore.read(filePath);
  } catch (error) {
    return { success: false, code: error.code || "UNKNOWN", error: error.message };
  }
});

ipcMain.handle("save-json-file", async (event, filePath, data) => {
  try {
    const result = await jsonStore.write(filePath, data);
    // 실제로 내용이 바뀌었고 자동 싱크가 활성화된 경우에만 트리거
    if (!result.unchanged && dataSync && dataSync.autoSync) dataSync.requestSync();
    return result;
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

// 디렉토리 스캔 (한 번의 순회로 모든 확장자 수집, 파일별 stat 없음)
// 반환: { success, files: [{ filename, fullpath, ext }], skippedDirs: [읽지 못한 하위 폴더] }
// 루트를 읽지 못하면 실패, 하위 폴더를 읽지 못하면 skippedDirs에 기록 (호출 측에서 기존 항목 보존)
ipcMain.handle("scan-directory", async (event, dirPath, extensions) => {
  try {
    const extSet = new Set((extensions || []).map((ext) => String(ext).toLowerCase()));
    const files = [];
    const skippedDirs = [];
    const stack = [dirPath];
    let isRoot = true;

    while (stack.length > 0) {
      const dir = stack.pop();
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isRoot) throw error;
        skippedDirs.push(dir);
        continue;
      } finally {
        isRoot = false;
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          stack.push(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extSet.has(ext)) {
            files.push({
              filename: entry.name,
              fullpath: path.join(dir, entry.name),
              ext,
            });
          }
        }
      }
    }

    return { success: true, files, skippedDirs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 여러 파일의 크기를 한 번에 조회 (바이트, 조회 실패는 null)
ipcMain.handle("get-file-sizes", async (event, filePaths) => {
  const results = new Array(filePaths.length).fill(null);
  let next = 0;
  async function worker() {
    while (next < filePaths.length) {
      const i = next++;
      try {
        const stats = await fs.stat(filePaths[i]);
        results[i] = stats.size;
      } catch {
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, filePaths.length) }, worker));
  return results;
});

// 여러 경로의 존재 여부를 한 번에 확인 (정리 기능용)
ipcMain.handle("paths-exist", async (event, filePaths) => {
  const results = new Array(filePaths.length);
  let next = 0;
  async function worker() {
    while (next < filePaths.length) {
      const i = next++;
      try {
        results[i] = await fs.pathExists(filePaths[i]);
      } catch {
        results[i] = false;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, filePaths.length) }, worker));
  return results;
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

// 등록된 라이브러리 경로 목록
async function getLibraryRoots() {
  const result = await jsonStore.read(path.join(getDataPath(), "lib.json"));
  if (!result.success || !Array.isArray(result.data)) return [];
  return result.data.map((lib) => lib && lib.path).filter(Boolean);
}

// 파일을 지운 뒤, 그 파일이 있던 폴더가 비었으면 폴더도 삭제 (위로 올라가며 반복)
// - 완전히 빈 폴더만 지움 (다른 파일이나 하위 폴더가 남아 있으면 그대로 둠)
// - 라이브러리 폴더 자체는 지우지 않고, 라이브러리 밖의 폴더는 건드리지 않음
async function removeEmptyParentFolders(filePath, libraryRoots) {
  const removed = [];
  const root = libraryRoots
    .map((libraryPath) => path.resolve(libraryPath))
    .filter((libraryPath) => {
      const relative = path.relative(libraryPath, path.resolve(filePath));
      return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    })
    .sort((a, b) => b.length - a.length)[0];
  if (!root) return removed;

  let dir = path.dirname(path.resolve(filePath));
  while (true) {
    const relative = path.relative(root, dir);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) break;

    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) break;
      await fs.rmdir(dir);
      removed.push(dir);
    } catch (error) {
      break;
    }
    dir = path.dirname(dir);
  }
  return removed;
}

// 파일 하나 삭제 (useTrash면 휴지통으로)
// 다른 프로그램(재생 중인 플레이어 등)이 파일을 잡고 있어 실패하면,
// 그 프로그램에 창 닫기를 요청한 뒤 다시 시도한다. 반환: 닫은 프로그램 이름 목록
async function deleteFileWithUnlock(filePath, useTrash) {
  const remove = () => (useTrash ? shell.trashItem(filePath) : fs.unlink(filePath));

  try {
    await remove();
    return [];
  } catch (firstError) {
    if (process.platform !== "win32" || !(await fs.pathExists(filePath))) throw firstError;

    const lockers = await closeLockingApps(filePath);
    const closedApps = lockers.filter((app) => app.closed).map((app) => app.name);
    if (closedApps.length === 0) {
      const holders = lockers.map((app) => app.name).filter(Boolean);
      if (holders.length > 0) {
        throw new Error(`다른 프로그램이 사용 중입니다 (${holders.join(", ")}): ${firstError.message}`);
      }
      throw firstError;
    }

    // 프로그램이 닫힌 직후에는 잠금이 풀리는 데 잠깐 걸릴 수 있어 몇 번 재시도
    let lastError = firstError;
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await remove();
        return closedApps;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    throw lastError;
  }
}

// 파일 삭제 (완전 삭제). 폴더가 비면 폴더도 삭제
ipcMain.handle("delete-file", async (event, filePath) => {
  try {
    if (await fs.pathExists(filePath)) {
      const closedApps = await deleteFileWithUnlock(filePath, false);
      const removedFolders = await removeEmptyParentFolders(filePath, await getLibraryRoots());
      return { success: true, removedFolders, closedApps };
    } else {
      return { success: false, error: "파일이 존재하지 않습니다." };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 여러 파일 삭제 (중복 일괄정리용). useTrash면 휴지통으로, 아니면 완전 삭제
// 폴더가 비면 폴더도 삭제. 반환: [{ success, error?, removedFolders? }] (입력 순서대로)
ipcMain.handle("delete-files", async (event, filePaths, useTrash) => {
  const libraryRoots = await getLibraryRoots();
  const results = [];
  for (const filePath of filePaths) {
    try {
      const closedApps = await deleteFileWithUnlock(filePath, !!useTrash);
      const removedFolders = await removeEmptyParentFolders(filePath, libraryRoots);
      results.push({ success: true, removedFolders, closedApps });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
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
    const removedFolders = await removeEmptyFoldersRecursive(rootPath);
    return {
      success: true,
      removedFolders,
      count: removedFolders.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 빈 폴더 재귀 제거 함수 (접근 불가 폴더는 건너뜀)
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
    const timestamp = localFileStamp();
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

// 싱크 설정 저장 (설정만 저장, git 초기화 안 함)
ipcMain.handle("sync-save-settings", async (event, { repoUrl, token }) => {
  try {
    // 기존 설정 로드해서 autoSync 유지
    const existing = await loadSyncSettings();
    await saveSyncSettings({
      repoUrl,
      token,
      autoSync: existing ? existing.autoSync : false,
    });
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
  const settings = await loadSyncSettings();
  return {
    isActive: dataSync !== null && dataSync.isInitialized,
    isSyncing: dataSync ? dataSync.isSyncing : false,
    lastError: dataSync ? dataSync.lastError : null,
    autoSync: settings ? settings.autoSync === true : false,
  };
});

// 자동 싱크 토글
ipcMain.handle("sync-set-auto", async (event, enabled) => {
  try {
    const settings = await loadSyncSettings();
    if (!settings) return { success: false, error: "설정 없음" };

    settings.autoSync = enabled;
    await saveSyncSettings(settings);

    if (enabled) {
      // 자동 싱크 활성화 시 dataSync 초기화
      if (!dataSync || !dataSync.isInitialized) {
        await initDataSync();
      } else {
        dataSync.autoSync = true;
      }
    } else {
      if (dataSync) {
        dataSync.autoSync = false;
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 강제 업로드 (설정 로드 → init → push 전부 자체 처리)
ipcMain.handle("sync-force-upload", async () => {
  try {
    const settings = await loadSyncSettings();
    if (!settings || !settings.token || !settings.repoUrl) {
      return { success: false, error: "동기화 설정이 없습니다. 먼저 저장소 URL과 토큰을 저장하세요." };
    }

    const sync = new DataSync({
      dataPath: getDataPath(),
      repoUrl: settings.repoUrl,
      token: settings.token,
      syncDir: getSyncDir(),
    });

    const initOk = await sync.init();
    if (!initOk) {
      return { success: false, error: sync.lastError || "git 초기화 실패" };
    }

    const result = await sync.syncNow(true);
    if (result.error) {
      return { success: false, error: result.error };
    }

    // 성공 시 글로벌 dataSync 업데이트
    if (dataSync) dataSync.destroy();
    dataSync = sync;
    dataSync.autoSync = settings.autoSync === true;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 강제 다운로드 (설정 로드 → clone → 복사 전부 자체 처리)
ipcMain.handle("sync-force-download", async () => {
  try {
    const settings = await loadSyncSettings();
    if (!settings || !settings.token || !settings.repoUrl) {
      return { success: false, error: "동기화 설정이 없습니다. 먼저 저장소 URL과 토큰을 저장하세요." };
    }

    const sync = new DataSync({
      dataPath: getDataPath(),
      repoUrl: settings.repoUrl,
      token: settings.token,
      syncDir: getSyncDir(),
    });

    await jsonStore.flush();
    const result = await sync.restoreFromRemote();
    jsonStore.invalidate();

    if (result.success) {
      // 성공 시 글로벌 dataSync 업데이트
      if (dataSync) dataSync.destroy();
      dataSync = sync;
      dataSync.autoSync = settings.autoSync === true;

      // git config 설정
      await sync.runGit(["config", "user.email", "auto-sync@baseball-app.local"], sync.syncDir).catch(() => {});
      await sync.runGit(["config", "user.name", "Baseball Auto Sync"], sync.syncDir).catch(() => {});
      sync.isInitialized = true;
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 원격 저장소에 데이터 있는지 확인
ipcMain.handle("sync-check-remote", async (event, { repoUrl, token }) => {
  try {
    const tmpSync = new DataSync({
      dataPath: getDataPath(),
      repoUrl,
      token,
      syncDir: "",
    });
    const hasData = await tmpSync.checkRemoteHasData();
    return { success: true, hasData };
  } catch (error) {
    return { success: false, hasData: false };
  }
});

// 원격 데이터 복원
ipcMain.handle("sync-restore", async (event, { repoUrl, token }) => {
  try {
    const dataPath = getDataPath();
    const syncDir = getSyncDir();

    const sync = new DataSync({ dataPath, repoUrl, token, syncDir });
    await jsonStore.flush();
    const result = await sync.restoreFromRemote();
    jsonStore.invalidate();

    if (result.success) {
      // 설정 저장
      await saveSyncSettings({ repoUrl, token });

      // 기존 싱크 중지 후 재초기화
      if (dataSync) {
        dataSync.destroy();
        dataSync = null;
      }
      await initDataSync();
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 앱 종료 시 정리: 진행 중인 저장을 끝내고, 대기 중인 자동 싱크가 있으면 마무리한 뒤 종료
function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

async function shutdown() {
  if (metadataService) await withTimeout(metadataService.stop(), 5000);
  await withTimeout(jsonStore.flush(), 10000);

  if (dataSync) {
    if (dataSync.autoSync && dataSync.hasPendingSync()) {
      console.log("데이터 싱크 종료 전 마지막 싱크...");
      await withTimeout(dataSync.syncNow(), 20000);
    }
    dataSync.destroy();
    dataSync = null;
  }
}

app.on("before-quit", (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  shutdown()
    .catch((error) => console.error("종료 정리 실패:", error))
    .finally(() => app.quit());
});
