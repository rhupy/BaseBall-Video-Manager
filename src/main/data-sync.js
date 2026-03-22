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
  }

  // 인증 URL 생성
  getAuthUrl() {
    return this.repoUrl.replace("https://", `https://${this.token}@`);
  }

  // git 명령 실행
  runGit(args, cwd) {
    return new Promise((resolve, reject) => {
      execFile("git", args, { cwd, timeout: 30000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args.join(" ")} 실패: ${stderr || error.message}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // git 사용 가능 여부 확인
  async isGitAvailable() {
    try {
      await this.runGit(["--version"], process.cwd());
      return true;
    } catch {
      console.error("[DataSync] git이 설치되어 있지 않거나 PATH에 없습니다.");
      return false;
    }
  }

  // 초기화
  async init() {
    try {
      if (!this.token || !this.repoUrl) {
        console.log("[DataSync] 토큰 또는 레포 URL이 없어 동기화 비활성화");
        return false;
      }

      if (!(await this.isGitAvailable())) {
        return false;
      }

      // 싱크 디렉토리가 이미 존재하고 git repo인지 확인
      const gitDir = path.join(this.syncDir, ".git");
      if (await fs.pathExists(gitDir)) {
        try {
          await this.runGit(["remote", "set-url", "origin", this.getAuthUrl()], this.syncDir);
          console.log("[DataSync] 기존 싱크 저장소 재사용");
        } catch (e) {
          await fs.remove(this.syncDir);
          await this.cloneRepo();
        }
      } else {
        await this.cloneRepo();
      }

      // git user 설정 (커밋에 필요)
      try {
        await this.runGit(["config", "user.email", "auto-sync@baseball-app.local"], this.syncDir);
        await this.runGit(["config", "user.name", "Baseball Auto Sync"], this.syncDir);
      } catch (e) {
        console.warn("[DataSync] git config 설정 실패:", e.message);
      }

      this.isInitialized = true;
      console.log("[DataSync] 초기화 완료");

      // 초기화 직후 첫 싱크
      await this.syncNow();

      return true;
    } catch (error) {
      console.error("[DataSync] 초기화 실패:", error.message);
      return false;
    }
  }

  // 저장소 클론
  async cloneRepo() {
    await fs.ensureDir(path.dirname(this.syncDir));
    try {
      await this.runGit(["clone", this.getAuthUrl(), this.syncDir], path.dirname(this.syncDir));
      console.log("[DataSync] 저장소 클론 완료");
    } catch (error) {
      // 빈 저장소일 수 있음 — 로컬에서 init
      await fs.ensureDir(this.syncDir);
      await this.runGit(["init"], this.syncDir);
      try {
        await this.runGit(["remote", "add", "origin", this.getAuthUrl()], this.syncDir);
      } catch (e) {
        // remote가 이미 있을 수 있음
        await this.runGit(["remote", "set-url", "origin", this.getAuthUrl()], this.syncDir);
      }
      await this.runGit(["checkout", "-b", "main"], this.syncDir);
      console.log("[DataSync] 빈 저장소 초기화 완료");
    }
  }

  // 원격에 데이터가 있는지 확인 (설정 연결 시 판단용)
  async checkRemoteHasData() {
    try {
      if (!(await this.isGitAvailable())) return false;

      // 임시로 ls-remote 확인
      const result = await this.runGit(
        ["ls-remote", "--heads", this.getAuthUrl()],
        process.cwd()
      );
      return result.length > 0; // 브랜치가 있으면 데이터 있음
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

      // 싱크 디렉토리 초기화 (기존 것 제거 후 클론)
      if (await fs.pathExists(this.syncDir)) {
        await fs.remove(this.syncDir);
      }
      await this.cloneRepo();

      // 클론한 데이터를 data 폴더로 복사
      const exclude = [".git", "sync-settings.json"];
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

  // 디바운스된 싱크 요청
  requestSync() {
    if (!this.isInitialized) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, this.debounceMs);
  }

  // data에 의미 있는 파일이 있는지 확인 (빈 데이터 덮어쓰기 방지)
  async isDataEmpty() {
    try {
      // lib.json에 라이브러리 경로가 있으면 의미있는 데이터
      const libPath = path.join(this.dataPath, "lib.json");
      if (await fs.pathExists(libPath)) {
        const lib = await fs.readJson(libPath).catch(() => []);
        if (Array.isArray(lib) && lib.length > 0) return false;
      }

      // files.json에 파일 목록이 있으면 의미있는 데이터
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

  // 즉시 싱크 실행
  async syncNow() {
    if (!this.isInitialized || this.isSyncing) return;

    this.isSyncing = true;
    try {
      // 원격에 이미 데이터가 있는 경우에만 빈 데이터 체크
      // (원격이 비어있으면 첫 데이터도 올려야 하므로)
      const hasRemoteData = await this.hasRemoteCommits();
      if (hasRemoteData && await this.isDataEmpty()) {
        console.log("[DataSync] 데이터가 비어있어 싱크 스킵 (백업 보호)");
        return;
      }

      // data 폴더 내용을 싱크 디렉토리로 복사
      await this.copyDataToSync();

      // 변경사항 확인
      const status = await this.runGit(["status", "--porcelain"], this.syncDir);
      if (!status) {
        console.log("[DataSync] 변경사항 없음, 스킵");
        return;
      }

      // 커밋 & 푸시
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      await this.runGit(["add", "-A"], this.syncDir);
      await this.runGit(["commit", "-m", `auto-sync: ${timestamp}`], this.syncDir);

      try {
        await this.runGit(["push", "origin", "HEAD"], this.syncDir);
        console.log(`[DataSync] 푸시 완료: ${timestamp}`);
      } catch (pushError) {
        // 첫 푸시 또는 브랜치 불일치
        try {
          await this.runGit(["push", "-u", "origin", "main"], this.syncDir);
          console.log(`[DataSync] 첫 푸시 완료: ${timestamp}`);
        } catch (e) {
          // master 브랜치일 수도 있음
          await this.runGit(["push", "-u", "origin", "master"], this.syncDir);
          console.log(`[DataSync] 첫 푸시 완료 (master): ${timestamp}`);
        }
      }
    } catch (error) {
      console.error("[DataSync] 싱크 실패:", error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  // 원격에 커밋이 있는지 확인
  async hasRemoteCommits() {
    try {
      await this.runGit(["log", "--oneline", "-1"], this.syncDir);
      return true;
    } catch {
      return false;
    }
  }

  // data 폴더 → 싱크 디렉토리로 복사 (설정 파일 제외)
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

  // 정리
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isInitialized = false;
  }
}

module.exports = DataSync;
