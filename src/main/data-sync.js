// data 폴더를 별도 Git 저장소에 자동 백업하는 모듈
const path = require("path");
const fs = require("fs-extra");
const { execFile } = require("child_process");

class DataSync {
  constructor(options = {}) {
    this.dataPath = options.dataPath;
    this.repoUrl = options.repoUrl;
    this.token = options.token;
    this.syncDir = options.syncDir;
    this.debounceMs = options.debounceMs || 30000;
    this.debounceTimer = null;
    this.isSyncing = false;
    this.isInitialized = false;
    this.lastError = null;
  }

  getAuthUrl() {
    return this.repoUrl.replace("https://", `https://${this.token}@`);
  }

  // git 명령 실행 (에러 메시지에서 토큰 제거)
  runGit(args, cwd) {
    return new Promise((resolve, reject) => {
      execFile("git", args, { cwd, timeout: 30000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          const safeMsg = (stderr || error.message).replace(this.token, "***");
          reject(new Error(`git ${args[0]}: ${safeMsg}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  async isGitAvailable() {
    try {
      await this.runGit(["--version"], process.cwd());
      return true;
    } catch {
      return false;
    }
  }

  // 초기화
  async init() {
    this.lastError = null;

    if (!this.token || !this.repoUrl) {
      this.lastError = "토큰 또는 레포 URL 없음";
      return false;
    }

    if (!(await this.isGitAvailable())) {
      this.lastError = "git이 설치되어 있지 않거나 PATH에 없습니다";
      return false;
    }

    try {
      // 싱크 디렉토리 준비
      const gitDir = path.join(this.syncDir, ".git");
      if (await fs.pathExists(gitDir)) {
        try {
          await this.runGit(["remote", "set-url", "origin", this.getAuthUrl()], this.syncDir);
          console.log("[DataSync] 기존 싱크 저장소 재사용");
        } catch (e) {
          console.log("[DataSync] 기존 저장소 문제, 재생성:", e.message);
          await fs.remove(this.syncDir);
          await this.cloneRepo();
        }
      } else {
        await this.cloneRepo();
      }

      // git user 설정
      await this.runGit(["config", "user.email", "auto-sync@baseball-app.local"], this.syncDir).catch(() => {});
      await this.runGit(["config", "user.name", "Baseball Auto Sync"], this.syncDir).catch(() => {});

      this.isInitialized = true;
      console.log("[DataSync] 초기화 완료, dataPath:", this.dataPath);
      console.log("[DataSync] syncDir:", this.syncDir);

      // autoSync가 켜져있을 때만 첫 싱크 자동 실행
      if (this.autoSync) {
        const syncResult = await this.syncNow();
        if (syncResult && syncResult.error) {
          this.lastError = syncResult.error;
        }
      }

      return true;
    } catch (error) {
      this.lastError = error.message;
      console.error("[DataSync] 초기화 실패:", error.message);
      return false;
    }
  }

  async cloneRepo() {
    await fs.ensureDir(path.dirname(this.syncDir));

    // 이미 디렉토리가 있으면 제거
    if (await fs.pathExists(this.syncDir)) {
      await fs.remove(this.syncDir);
    }

    try {
      await this.runGit(["clone", this.getAuthUrl(), this.syncDir], path.dirname(this.syncDir));
      console.log("[DataSync] 저장소 클론 완료");
    } catch (error) {
      // 빈 저장소 — 로컬 init
      console.log("[DataSync] 빈 저장소, 로컬 init:", error.message);
      await fs.ensureDir(this.syncDir);
      await this.runGit(["init"], this.syncDir);
      await this.runGit(["remote", "add", "origin", this.getAuthUrl()], this.syncDir).catch(async () => {
        await this.runGit(["remote", "set-url", "origin", this.getAuthUrl()], this.syncDir);
      });
      // 빈 초기 커밋 생성 (push를 위해 필요)
      const readmePath = path.join(this.syncDir, ".gitkeep");
      await fs.writeFile(readmePath, "");
      await this.runGit(["add", ".gitkeep"], this.syncDir);
      await this.runGit(["commit", "-m", "init"], this.syncDir);
      console.log("[DataSync] 빈 저장소 초기화 완료");
    }
  }

  // 원격에 데이터가 있는지 확인
  async checkRemoteHasData() {
    try {
      if (!(await this.isGitAvailable())) return false;
      const result = await this.runGit(
        ["ls-remote", "--heads", this.getAuthUrl()],
        process.cwd()
      );
      return result.length > 0;
    } catch {
      return false;
    }
  }

  // 원격 데이터를 로컬 data 폴더로 복원
  async restoreFromRemote() {
    try {
      if (!(await this.isGitAvailable())) {
        return { success: false, error: "git이 설치되어 있지 않습니다." };
      }

      if (await fs.pathExists(this.syncDir)) {
        await fs.remove(this.syncDir);
      }
      await this.cloneRepo();

      const exclude = [".git", ".gitkeep", "sync-settings.json"];
      const entries = await fs.readdir(this.syncDir);
      let restoredCount = 0;

      for (const entry of entries) {
        if (exclude.includes(entry)) continue;
        const src = path.join(this.syncDir, entry);
        const dest = path.join(this.dataPath, entry);
        await fs.copy(src, dest, { overwrite: true });
        restoredCount++;
      }

      console.log(`[DataSync] 복원 완료: ${restoredCount}개 항목`);
      return { success: true, restoredCount };
    } catch (error) {
      console.error("[DataSync] 복원 실패:", error.message);
      return { success: false, error: error.message };
    }
  }

  requestSync() {
    if (!this.isInitialized) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, this.debounceMs);
  }

  // 빈 데이터 확인
  async isDataEmpty() {
    try {
      const libPath = path.join(this.dataPath, "lib.json");
      if (await fs.pathExists(libPath)) {
        const lib = await fs.readJson(libPath).catch(() => []);
        if (Array.isArray(lib) && lib.length > 0) return false;
      }

      const mediaPath = path.join(this.dataPath, "media", "files.json");
      if (await fs.pathExists(mediaPath)) {
        const media = await fs.readJson(mediaPath).catch(() => []);
        if (Array.isArray(media) && media.length > 0) return false;
      }

      const filePath = path.join(this.dataPath, "file", "files.json");
      if (await fs.pathExists(filePath)) {
        const files = await fs.readJson(filePath).catch(() => []);
        if (Array.isArray(files) && files.length > 0) return false;
      }

      return true;
    } catch {
      return true;
    }
  }

  // 싱크 실행 (force: 빈 데이터 체크 무시)
  async syncNow(force = false) {
    if (!this.isInitialized || this.isSyncing) return { error: "not ready" };

    this.isSyncing = true;
    try {
      // 강제가 아닌 경우에만 빈 데이터 보호
      if (!force) {
        const hasLocal = await this.hasLocalCommits();
        if (hasLocal && await this.isDataEmpty()) {
          console.log("[DataSync] 데이터가 비어있어 싱크 스킵 (백업 보호)");
          return { skipped: true };
        }
      }

      // data → syncDir 복사
      console.log("[DataSync] 데이터 복사 중...", this.dataPath, "→", this.syncDir);
      await this.copyDataToSync();

      // 변경사항 확인
      const status = await this.runGit(["status", "--porcelain"], this.syncDir);
      if (!status) {
        console.log("[DataSync] 변경사항 없음");
        return { noChanges: true };
      }

      console.log("[DataSync] 변경사항 감지, 커밋 중...");
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      await this.runGit(["add", "-A"], this.syncDir);
      await this.runGit(["commit", "-m", `auto-sync: ${timestamp}`], this.syncDir);

      // push 시도 (여러 방법)
      const pushMethods = [
        ["push", "origin", "HEAD"],
        ["push", "-u", "origin", "main"],
        ["push", "-u", "origin", "master"],
      ];

      let pushed = false;
      for (const args of pushMethods) {
        try {
          await this.runGit(args, this.syncDir);
          console.log(`[DataSync] 푸시 성공 (${args.join(" ")}): ${timestamp}`);
          pushed = true;
          break;
        } catch (e) {
          console.log(`[DataSync] ${args.join(" ")} 실패:`, e.message);
        }
      }

      if (!pushed) {
        const errMsg = "push 실패 - 저장소 권한 또는 브랜치를 확인하세요";
        console.error("[DataSync]", errMsg);
        return { error: errMsg };
      }

      this.lastError = null;
      return { success: true };
    } catch (error) {
      console.error("[DataSync] 싱크 실패:", error.message);
      this.lastError = error.message;
      return { error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async hasLocalCommits() {
    try {
      await this.runGit(["log", "--oneline", "-1"], this.syncDir);
      return true;
    } catch {
      return false;
    }
  }

  async copyDataToSync() {
    const exclude = ["sync-settings.json"];
    const entries = await fs.readdir(this.dataPath);

    for (const entry of entries) {
      if (exclude.includes(entry)) continue;
      const src = path.join(this.dataPath, entry);
      const dest = path.join(this.syncDir, entry);
      await fs.copy(src, dest, { overwrite: true });
    }
  }

  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isInitialized = false;
  }
}

module.exports = DataSync;
