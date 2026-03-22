// data 폴더를 별도 Git 저장소에 자동 백업하는 모듈
const path = require("path");
const fs = require("fs-extra");
const { execFile } = require("child_process");

class DataSync {
  constructor(options = {}) {
    this.dataPath = options.dataPath;
    this.repoUrl = options.repoUrl;
    this.token = options.token;
    this.syncDir = options.syncDir; // 싱크용 로컬 클론 경로
    this.debounceMs = options.debounceMs || 30000; // 기본 30초 디바운스
    this.debounceTimer = null;
    this.isSyncing = false;
    this.isInitialized = false;
  }

  // 인증 URL 생성
  getAuthUrl() {
    // https://github.com/user/repo.git → https://TOKEN@github.com/user/repo.git
    return this.repoUrl.replace("https://", `https://${this.token}@`);
  }

  // git 명령 실행
  runGit(args, cwd) {
    return new Promise((resolve, reject) => {
      execFile("git", args, { cwd, timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args.join(" ")} 실패: ${stderr || error.message}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  // 초기화: 싱크 디렉토리 준비
  async init() {
    try {
      if (!this.token || !this.repoUrl) {
        console.log("[DataSync] 토큰 또는 레포 URL이 없어 동기화 비활성화");
        return false;
      }

      // 싱크 디렉토리가 이미 존재하고 git repo인지 확인
      const gitDir = path.join(this.syncDir, ".git");
      if (await fs.pathExists(gitDir)) {
        // 이미 클론됨 — remote URL 업데이트
        try {
          await this.runGit(["remote", "set-url", "origin", this.getAuthUrl()], this.syncDir);
          console.log("[DataSync] 기존 싱크 저장소 재사용");
        } catch (e) {
          // remote 설정 실패 시 다시 클론
          await fs.remove(this.syncDir);
          await this.cloneRepo();
        }
      } else {
        await this.cloneRepo();
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
      await this.runGit(["remote", "add", "origin", this.getAuthUrl()], this.syncDir);
      await this.runGit(["checkout", "-b", "main"], this.syncDir);
      console.log("[DataSync] 빈 저장소 초기화 완료");
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

  // data가 비어있는지 확인 (빈 데이터로 백업 덮어쓰기 방지)
  async isDataEmpty() {
    try {
      const mediaPath = path.join(this.dataPath, "media", "files.json");
      const filePath = path.join(this.dataPath, "file", "files.json");

      const mediaExists = await fs.pathExists(mediaPath);
      const fileExists = await fs.pathExists(filePath);

      // JSON 파일 자체가 없으면 빈 상태
      if (!mediaExists && !fileExists) return true;

      // 둘 다 빈 배열이면 빈 상태
      let totalFiles = 0;
      if (mediaExists) {
        const media = await fs.readJson(mediaPath).catch(() => []);
        totalFiles += Array.isArray(media) ? media.length : 0;
      }
      if (fileExists) {
        const files = await fs.readJson(filePath).catch(() => []);
        totalFiles += Array.isArray(files) ? files.length : 0;
      }

      return totalFiles === 0;
    } catch {
      return true;
    }
  }

  // 즉시 싱크 실행
  async syncNow() {
    if (!this.isInitialized || this.isSyncing) return;

    this.isSyncing = true;
    try {
      // 빈 데이터 푸시 방지
      if (await this.isDataEmpty()) {
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
        // 첫 푸시 시 upstream 설정
        await this.runGit(["push", "-u", "origin", "main"], this.syncDir);
        console.log(`[DataSync] 첫 푸시 완료: ${timestamp}`);
      }
    } catch (error) {
      console.error("[DataSync] 싱크 실패:", error.message);
    } finally {
      this.isSyncing = false;
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
