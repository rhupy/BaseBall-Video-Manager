// JSON 파일 안전 저장소
// - 원자적 쓰기: 임시 파일에 쓴 뒤 rename (쓰는 도중 종료돼도 원본이 깨지지 않음)
// - 파일별 직렬화: 같은 파일에 대한 저장이 겹치지 않도록 순서대로 처리
// - .bak 보관: 직전 버전을 남겨두고, 원본이 깨졌으면 .bak에서 자동 복구
// - 변경 없는 저장은 디스크에 쓰지 않음
const path = require("path");
const fs = require("fs-extra");
const { localFileStamp } = require("./local-time");

const BAK_SUFFIX = ".bak";
const TMP_SUFFIX = ".tmp";

class JsonStore {
  constructor() {
    this.queues = new Map(); // 파일 경로 → 마지막 작업 Promise
    this.lastText = new Map(); // 파일 경로 → 디스크에 있는 내용(직렬화 문자열)
  }

  key(filePath) {
    return path.resolve(filePath);
  }

  serialize(data) {
    return JSON.stringify(data, null, 2) + "\n";
  }

  // 같은 파일에 대한 작업을 순서대로 실행
  enqueue(filePath, task) {
    const key = this.key(filePath);
    const prev = this.queues.get(key) || Promise.resolve();
    const next = prev.then(task, task);
    const tracked = next.catch(() => {});
    this.queues.set(key, tracked);
    tracked.then(() => {
      if (this.queues.get(key) === tracked) this.queues.delete(key);
    });
    return next;
  }

  // 진행 중인 모든 저장이 끝날 때까지 대기 (앱 종료 시 사용)
  async flush() {
    await Promise.all([...this.queues.values()]);
  }

  // 외부에서 data 폴더를 바꾼 경우(원격 복원 등) 내용 캐시 무효화
  invalidate() {
    this.lastText.clear();
  }

  async tryParse(filePath) {
    const text = await fs.readFile(filePath, "utf8");
    // BOM 제거 후 파싱
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  }

  // 읽기. 결과: { success, data, recovered? } 또는 { success:false, code, error }
  //   code: "ENOENT"(파일 없음) | "CORRUPT"(내용 손상) | 그 외 fs 에러 코드
  read(filePath) {
    return this.enqueue(filePath, async () => {
      const key = this.key(filePath);
      const bakPath = filePath + BAK_SUFFIX;
      let primaryError;

      try {
        const data = await this.tryParse(filePath);
        this.lastText.set(key, this.serialize(data));
        return { success: true, data };
      } catch (error) {
        primaryError = error;
      }

      const missing = primaryError.code === "ENOENT";
      const corrupt = primaryError instanceof SyntaxError;

      // 파일이 없거나 깨진 경우에만 .bak에서 복구 시도 (권한/장치 오류는 건드리지 않음)
      if (missing || corrupt) {
        try {
          const data = await this.tryParse(bakPath);
          if (corrupt) {
            // 깨진 원본은 확인용으로 보존
            const stamp = localFileStamp();
            await fs.move(filePath, `${filePath}.corrupt-${stamp}`, { overwrite: true }).catch(() => {});
          }
          await fs.copy(bakPath, filePath, { overwrite: true });
          this.lastText.set(key, this.serialize(data));
          console.warn(`[JsonStore] ${filePath} 손상/누락 → .bak에서 복구`);
          return { success: true, data, recovered: true };
        } catch {
          // .bak도 없거나 깨짐 → 아래에서 원래 에러 반환
        }
      }

      return {
        success: false,
        code: corrupt ? "CORRUPT" : primaryError.code || "UNKNOWN",
        error: primaryError.message,
      };
    });
  }

  // 쓰기. 결과: { success:true, unchanged? } — 실패 시 예외
  write(filePath, data) {
    const text = this.serialize(data);
    return this.enqueue(filePath, async () => {
      const key = this.key(filePath);

      if (this.lastText.get(key) === text && (await fs.pathExists(filePath))) {
        return { success: true, unchanged: true };
      }

      await fs.ensureDir(path.dirname(filePath));
      const tmpPath = filePath + TMP_SUFFIX;

      // 임시 파일에 쓰고 디스크까지 내려보냄
      const handle = await fs.promises.open(tmpPath, "w");
      try {
        await handle.writeFile(text, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }

      // 직전 버전을 .bak으로 보관 (실패해도 저장은 계속)
      if (await fs.pathExists(filePath)) {
        await fs.copyFile(filePath, filePath + BAK_SUFFIX).catch((e) => {
          console.warn(`[JsonStore] .bak 생성 실패: ${e.message}`);
        });
      }

      await this.renameWithRetry(tmpPath, filePath);
      this.lastText.set(key, text);
      return { success: true };
    });
  }

  // Windows에서 백신/인덱서가 파일을 잠깐 잡고 있으면 rename이 실패할 수 있어 재시도
  async renameWithRetry(from, to) {
    const delays = [50, 150, 400, 1000];
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(from, to);
        return;
      } catch (error) {
        const retryable = ["EPERM", "EBUSY", "EACCES"].includes(error.code);
        if (!retryable || attempt >= delays.length) throw error;
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }
}

// 저장소가 만드는 보조 파일인지 (백업/동기화에서 제외용)
JsonStore.isAuxFile = (name) =>
  name.endsWith(BAK_SUFFIX) || name.endsWith(TMP_SUFFIX) || /\.corrupt-[\dTZ-]+$/.test(name);

module.exports = JsonStore;
