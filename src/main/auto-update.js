// 자동 업데이트 (GitHub 릴리스 기준, electron-updater)
// - 설치판(Setup으로 설치한 경우)에서만 동작. 포터블/개발 실행에서는 아무것도 하지 않음
// - 시작할 때 새 버전을 확인해 백그라운드로 내려받고, 다 받으면 다시 시작할지 물어봄
// - "나중에"를 고르면 앱을 종료할 때 설치됨
// - 데이터(%APPDATA%의 data 폴더)는 업데이트로 바뀌지 않음
const path = require("path");
const fs = require("fs");
const { app, dialog, BrowserWindow } = require("electron");

let autoUpdater = null;
let notify = () => {};
let state = { status: "idle", version: "", message: "" };
let manualCheck = false;

function setState(next) {
  state = { ...state, ...next };
  notify(state);
}

// 업데이트를 쓸 수 있는 실행 형태인지
function unavailableReason() {
  if (!app.isPackaged) return "개발 실행에서는 업데이트를 확인하지 않습니다.";
  if (process.env.PORTABLE_EXECUTABLE_DIR) return "포터블 버전은 자동 업데이트를 지원하지 않습니다.";
  if (!fs.existsSync(path.join(process.resourcesPath, "app-update.yml"))) {
    return "이 빌드에는 업데이트 설정이 들어 있지 않습니다.";
  }
  return "";
}

// options: { onState(state) }  — 상태가 바뀔 때마다 호출 (렌더러에 전달용)
function initAutoUpdate(options = {}) {
  notify = options.onState || notify;

  const reason = unavailableReason();
  if (reason) {
    setState({ status: "unavailable", message: reason });
    return;
  }

  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    setState({ status: "unavailable", message: "업데이트 모듈을 불러오지 못했습니다." });
    return;
  }

  // 확인만 하고 내려받거나 설치하지 않는 모드 (동작 검증용)
  const dryRun = process.env.BVM_UPDATE_DRYRUN === "1";
  autoUpdater.autoDownload = !dryRun;
  autoUpdater.autoInstallOnAppQuit = !dryRun;
  autoUpdater.logger = console;

  autoUpdater.on("checking-for-update", () => setState({ status: "checking", message: "" }));
  autoUpdater.on("update-not-available", () => {
    setState({ status: "latest", message: "최신 버전입니다." });
    if (manualCheck) showMessage("최신 버전을 사용 중입니다.");
    manualCheck = false;
  });
  autoUpdater.on("update-available", (info) => {
    console.log(`[update] 새 버전 발견: ${info.version}`);
    setState({ status: "available", version: info.version, message: `새 버전 ${info.version} 내려받는 중...` });
    manualCheck = false;
  });
  autoUpdater.on("download-progress", (progress) => {
    setState({
      status: "downloading",
      message: `새 버전 ${state.version} 내려받는 중... ${Math.round(progress.percent)}%`,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setState({ status: "ready", version: info.version, message: `새 버전 ${info.version} 준비됨 (종료 시 설치)` });
    promptRestart(info.version);
  });
  autoUpdater.on("error", (error) => {
    console.warn("[update] 실패:", error == null ? "unknown" : error.message);
    setState({ status: "error", message: "업데이트 확인 실패" });
    if (manualCheck) showMessage("업데이트를 확인하지 못했습니다.\n\n" + (error ? error.message : ""));
    manualCheck = false;
  });

  // 시작 직후의 부하를 피해 조금 뒤에 확인
  setTimeout(() => checkForUpdates(false), 8000);
}

function ownerWindow() {
  return BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) || null;
}

function showMessage(message) {
  const options = { type: "info", title: "Baseball Video Manager", message, buttons: ["확인"], noLink: true };
  const owner = ownerWindow();
  if (owner) dialog.showMessageBox(owner, options);
  else dialog.showMessageBox(options);
}

async function promptRestart(version) {
  const options = {
    type: "question",
    title: "Baseball Video Manager",
    message: `새 버전 ${version}이(가) 준비되었습니다.\n지금 다시 시작해서 설치할까요?`,
    detail: "나중에를 선택하면 앱을 종료할 때 자동으로 설치됩니다. 평점·메모 등 데이터는 그대로 유지됩니다.",
    buttons: ["지금 다시 시작", "나중에"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
  const owner = ownerWindow();
  const result = owner ? await dialog.showMessageBox(owner, options) : await dialog.showMessageBox(options);
  if (result.response === 0) autoUpdater.quitAndInstall(false, true);
}

// 수동 확인 (버전 표시를 눌렀을 때). 결과를 알림창으로 보여 줌
function checkForUpdates(manual = true) {
  if (!autoUpdater) {
    if (manual) showMessage(state.message || "자동 업데이트를 사용할 수 없습니다.");
    return;
  }
  if (state.status === "ready") {
    if (manual) promptRestart(state.version);
    return;
  }
  if (state.status === "checking" || state.status === "downloading" || state.status === "available") return;

  manualCheck = manual;
  autoUpdater.checkForUpdates().catch((error) => {
    console.warn("[update] 확인 실패:", error.message);
  });
}

function getUpdateState() {
  return state;
}

module.exports = { initAutoUpdate, checkForUpdates, getUpdateState };
