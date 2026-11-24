// 영상 정보(제목/출시일/배우/커버) 수집 서비스
// - 품번을 출처 어댑터들에 순서대로 조회해 data/meta/videos.json에 저장 (품번당 한 번)
// - 출처를 여러 개 켜면: 앞 출처가 찾은 정보를 기본으로 하고, 비어 있는 항목만 뒤 출처가 채운다
// - 조회는 백그라운드에서 천천히 진행. 실패하면 간격을 늘려 재시도하고,
//   계속 실패하는 출처는 일정 시간 건너뛴다
// - 이미지는 필요할 때 내려받아 캐시 폴더에 보관 (data 폴더 밖이라 Git 동기화 대상 아님)
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { EventEmitter } = require("events");
const fs = require("fs-extra");

const NOT_FOUND_RETRY_MS = 30 * 24 * 60 * 60 * 1000; // 못 찾은 품번은 30일 뒤 다시 시도
const SAVE_EVERY = 20; // 이만큼 모이면 저장
const MAX_BACKOFF_MS = 30 * 60 * 1000;
const SOURCE_FAIL_LIMIT = 5; // 연속 실패가 이만큼이면 해당 출처를 잠시 건너뜀
const SOURCE_COOLDOWN_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;
const WORKS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 배우 작품 목록은 7일마다 갱신

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isEmpty = (value) =>
  value === undefined || value === null || value === "" || value === 0 ||
  (Array.isArray(value) && value.length === 0);

class MetadataService extends EventEmitter {
  // options: { dataPath, cacheDir, jsonStore, fetchImpl, adapters, intervalScale }
  constructor(options) {
    super();
    this.filePath = path.join(options.dataPath, "meta", "videos.json");
    // local 폴더는 이 PC 전용 (Git 동기화 제외): API 키가 들어갈 수 있는 출처 설정을 둔다
    this.settingsPath = path.join(options.dataPath, "local", "meta-settings.json");
    this.cacheDir = options.cacheDir;
    this.jsonStore = options.jsonStore;
    this.fetch = options.fetchImpl;
    this.adapters = options.adapters || [];
    this.intervalScale = options.intervalScale ?? 1; // 테스트에서 대기 시간을 줄이는 용도

    this.videos = {}; // 품번 → 기록
    this.settings = this.normalizeSettings(null);
    this.health = {}; // 출처 id → { failures, downUntil, lastError, lastOkAt }
    this.loaded = false;
    this.queue = [];
    this.queued = new Set();
    this.running = false;
    this.stopped = false;
    this.unsaved = 0;
    this.doneInRun = 0;
    this.totalInRun = 0;
    this.priorityJobs = 0; // 진행 중인 사용자 요청 조회 수
    this.worksJobs = new Map(); // 배우 번호 → 진행 중인 작품 목록 조회
    this.imageJobs = new Map(); // url → Promise<fileUrl|null>
    this.imageSlots = 0;
    this.imageWaiters = [];
  }

  // ---------- 설정 ----------

  // 저장된 설정을 현재 등록된 어댑터에 맞게 정리 (없는 출처 제거, 새 출처 추가)
  normalizeSettings(saved) {
    const savedSources = (saved && Array.isArray(saved.sources) ? saved.sources : []).filter(
      (entry) => entry && this.adapters.some((adapter) => adapter.id === entry.id)
    );
    const sources = savedSources.map((entry) => ({
      id: entry.id,
      enabled: entry.enabled !== false,
      config: entry.config && typeof entry.config === "object" ? entry.config : {},
    }));
    for (const adapter of this.adapters) {
      if (!sources.some((entry) => entry.id === adapter.id)) {
        sources.push({ id: adapter.id, enabled: adapter.defaultEnabled !== false, config: {} });
      }
    }
    return { autoFetch: !saved || saved.autoFetch !== false, sources };
  }

  // 설정 화면용: 출처 목록(우선순위 순)과 각 출처의 상태
  describe() {
    return {
      autoFetch: this.settings.autoFetch,
      sources: this.settings.sources.map((entry) => {
        const adapter = this.adapters.find((item) => item.id === entry.id);
        const health = this.health[entry.id] || {};
        return {
          id: entry.id,
          enabled: entry.enabled,
          config: entry.config,
          name: adapter.name,
          description: adapter.description || "",
          configFields: adapter.configFields || [],
          down: !!health.downUntil && health.downUntil > Date.now(),
          lastError: health.lastError || "",
          lastOkAt: health.lastOkAt || "",
        };
      }),
      status: this.getStatus(),
    };
  }

  async updateSettings(next) {
    this.settings = this.normalizeSettings(next);
    this.health = {}; // 설정을 바꾸면 건너뛰기 상태 초기화
    await this.jsonStore.write(this.settingsPath, this.settings);
    if (this.settings.autoFetch && this.queue.length > 0) this.run();
    return this.describe();
  }

  // 켜져 있는 출처 (우선순위 순)
  activeSources() {
    return this.settings.sources
      .filter((entry) => entry.enabled)
      .map((entry) => ({ entry, adapter: this.adapters.find((item) => item.id === entry.id) }));
  }

  // ---------- 로드 / 상태 ----------

  async load() {
    if (this.loaded) return this.videos;

    const settings = await this.jsonStore.read(this.settingsPath);
    this.settings = this.normalizeSettings(settings.success ? settings.data : null);

    const result = await this.jsonStore.read(this.filePath);
    if (result.success && result.data && typeof result.data === "object" && !Array.isArray(result.data)) {
      this.videos = result.data;
    } else if (!result.success && result.code !== "ENOENT") {
      // 읽기 실패: 기존 파일을 덮어쓰지 않도록 이번 실행에서는 저장하지 않음
      console.warn("[Metadata] 저장된 정보 로드 실패:", result.error);
      this.readOnly = true;
    }
    this.loaded = true;
    return this.videos;
  }

  getAll() {
    return this.videos;
  }

  getStatus() {
    return {
      running: this.running,
      done: this.doneInRun,
      total: this.totalInRun,
      pending: this.queue.length,
      known: Object.keys(this.videos).length,
      paused: !!this.pausedReason,
      message: this.pausedReason || "",
    };
  }

  // ---------- 조회 대기열 ----------

  // 조회가 필요한 품번인지 (없거나, 못 찾은 지 오래된 것)
  needsFetch(code) {
    const record = this.videos[code];
    if (!record) return true;
    if (record.status === "notfound") {
      return Date.now() - (Date.parse(record.fetchedAt) || 0) > NOT_FOUND_RETRY_MS;
    }
    return false;
  }

  // 품번들을 조회 대기열에 추가. 반환: 새로 추가된 개수
  enqueue(codes) {
    let added = 0;
    for (const code of codes || []) {
      if (typeof code !== "string" || !/^[A-Z0-9]{2,8}-\d{2,6}$/.test(code)) continue;
      if (this.queued.has(code) || !this.needsFetch(code)) continue;
      this.queued.add(code);
      this.queue.push(code);
      added++;
    }
    if (added > 0) {
      this.totalInRun += added;
      this.run();
    }
    return added;
  }

  async run() {
    if (this.running || this.stopped) return;
    if (!this.settings.autoFetch || this.activeSources().length === 0) return;

    this.running = true;
    let backoff = 0;
    let pendingEvents = [];

    const flushEvents = () => {
      if (pendingEvents.length === 0) return;
      this.emit("updated", pendingEvents);
      pendingEvents = [];
    };

    try {
      while (this.queue.length > 0 && !this.stopped) {
        if (!this.settings.autoFetch || this.activeSources().length === 0) break;

        // 사용자가 요청한 조회(배우 작품 목록)가 진행 중이면 양보
        if (this.priorityJobs > 0) {
          await this.wait(500);
          continue;
        }

        const code = this.queue[0];
        let record = null;

        try {
          record = await this.fetchCode(code);
          backoff = 0;
          this.pausedReason = "";
        } catch (error) {
          // 모든 출처가 일시적으로 실패: 기록하지 않고 간격을 늘려 다시 시도
          backoff = Math.min(MAX_BACKOFF_MS, backoff ? backoff * 2 : 60 * 1000);
          backoff = Math.max(backoff, (error.retryAfter || 0) * 1000);
          this.pausedReason = `조회 실패, ${Math.round(backoff / 60000) || 1}분 후 재시도 (${error.message})`;
          console.warn(`[Metadata] ${code}: ${this.pausedReason}`);
          flushEvents();
          await this.save();
          this.emit("status", this.getStatus());
          await this.wait(backoff * this.intervalScale);
          continue;
        }

        this.queue.shift();
        this.queued.delete(code);
        this.videos[code] = record;
        this.doneInRun++;
        this.unsaved++;
        pendingEvents.push(record);

        if (pendingEvents.length >= 5 || this.queue.length === 0) flushEvents();
        if (this.unsaved >= SAVE_EVERY) await this.save();
        this.emit("status", this.getStatus());
      }
    } finally {
      flushEvents();
      await this.save();
      this.running = false;
      if (this.queue.length === 0) {
        this.doneInRun = 0;
        this.totalInRun = 0;
      }
      this.emit("status", this.getStatus());
    }
  }

  // 중단 가능한 대기
  async wait(ms) {
    const until = Date.now() + ms;
    while (!this.stopped && Date.now() < until) {
      await sleep(Math.min(500, until - Date.now()));
    }
  }

  // ---------- 출처 조회 ----------

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await this.fetch(url, {
        ...options,
        headers: { Accept: "application/json", ...(options.headers || {}) },
        signal: controller.signal,
      });
      if (response.status === 404) return null;
      if (response.status === 429) {
        // 요청 제한: 출처가 알려 준 대기 시간을 호출 쪽에 전달
        const error = new Error("HTTP 429 (요청 제한)");
        error.retryAfter = Number(response.headers.get("retry-after")) || 0;
        throw error;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get("content-type") || "";
      if (!type.includes("json")) throw new Error(`예상치 못한 응답 (${type || "형식 없음"})`);
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new Error("응답 시간 초과");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  contextFor(entry) {
    return {
      fetchJson: (url, options) => this.fetchJson(url, options),
      wait: (ms) => this.wait(ms * this.intervalScale),
      config: entry.config || {},
    };
  }

  markSource(id, error) {
    const health = this.health[id] || (this.health[id] = { failures: 0 });
    if (error) {
      health.failures++;
      health.lastError = error.message;
      if (health.failures >= SOURCE_FAIL_LIMIT) {
        health.downUntil = Date.now() + SOURCE_COOLDOWN_MS;
        health.failures = 0;
        console.warn(`[Metadata] 출처 ${id} 연속 실패, 30분간 건너뜀`);
      }
    } else {
      health.failures = 0;
      health.downUntil = 0;
      health.lastError = "";
      health.lastOkAt = new Date().toISOString();
    }
  }

  // 품번 하나 조회 → 저장할 기록
  //   - 켜진 출처를 우선순위 순으로 조회, 앞 출처의 값을 우선하고 빈 항목만 뒤 출처로 채움
  //   - 필요한 항목이 다 채워지면 남은 출처는 조회하지 않음
  //   - 응답한 출처가 하나라도 있는데 아무도 못 찾으면 status: "notfound"
  //   - 모든 출처가 일시적으로 실패하면 예외 (나중에 다시 시도)
  async fetchCode(code) {
    const fetchedAt = new Date().toISOString();
    const merged = {};
    const usedSources = [];
    let answered = 0;
    let lastError = null;

    const complete = () =>
      !isEmpty(merged.title) && !isEmpty(merged.releaseDate) && !isEmpty(merged.cover) &&
      !isEmpty(merged.actresses) && merged.actresses.every((actress) => actress.image);

    for (const { entry, adapter } of this.activeSources()) {
      const health = this.health[entry.id];
      if (health && health.downUntil > Date.now()) continue;

      try {
        const found = await adapter.lookup(code, this.contextFor(entry));
        this.markSource(entry.id, null);
        answered++;
        if (found) {
          usedSources.push(entry.id);
          for (const [key, value] of Object.entries(found)) {
            if (isEmpty(merged[key]) && !isEmpty(value)) merged[key] = value;
          }
          if (complete()) break;
        }
      } catch (error) {
        this.markSource(entry.id, error);
        lastError = error;
      }
      await this.wait((adapter.minInterval || 1000) * this.intervalScale);
    }

    if (usedSources.length > 0) {
      return {
        code,
        status: "ok",
        fetchedAt,
        sources: usedSources,
        title: merged.title || "",
        titleEn: merged.titleEn || "",
        releaseDate: merged.releaseDate || "",
        runtime: merged.runtime || 0,
        maker: merged.maker || "",
        actresses: (merged.actresses || []).filter((actress) => actress && actress.name),
        cover: merged.cover || "",
      };
    }
    if (answered > 0) return { code, status: "notfound", fetchedAt };
    throw lastError || new Error("사용할 수 있는 출처가 없습니다");
  }

  // 각 출처가 살아 있는지 확인 (설정 화면의 "상태 확인")
  async checkSources() {
    const results = [];
    for (const entry of this.settings.sources) {
      const adapter = this.adapters.find((item) => item.id === entry.id);
      const startedAt = Date.now();
      let result;
      try {
        result = await adapter.check(this.contextFor(entry));
      } catch (error) {
        result = { ok: false, message: error.message };
      }
      this.markSource(entry.id, result.ok ? null : new Error(result.message));
      results.push({ id: entry.id, ok: !!result.ok, message: result.message || "", ms: Date.now() - startedAt });
    }
    return results;
  }

  // ---------- 배우 작품 목록 ----------

  // 배우의 전체 작품 목록 (data/meta/actresses/<번호>.json에 보관, 7일이 지나면 다시 조회)
  // 반환: { success, works: [{ code, title, releaseDate, cover }], fetchedAt, source, stale?, error? }
  getActressWorks(actress, { refresh = false } = {}) {
    const id = actress && actress.id ? String(actress.id) : "";
    if (!/^[\w-]{1,40}$/.test(id)) {
      return Promise.resolve({
        success: false,
        error: "이 배우는 출처의 배우 번호가 없어 작품 목록을 가져올 수 없습니다.",
      });
    }

    const jobKey = `${id}:${refresh}`;
    if (!this.worksJobs.has(jobKey)) {
      const job = this.loadActressWorks(actress, id, refresh).finally(() =>
        this.worksJobs.delete(jobKey)
      );
      this.worksJobs.set(jobKey, job);
    }
    return this.worksJobs.get(jobKey);
  }

  async loadActressWorks(actress, id, refresh) {
    const filePath = path.join(path.dirname(this.filePath), "actresses", `${id}.json`);
    const cached = await this.jsonStore.read(filePath);
    const hasCache = cached.success && cached.data && Array.isArray(cached.data.works);
    const age = hasCache ? Date.now() - (Date.parse(cached.data.fetchedAt) || 0) : Infinity;

    if (hasCache && !refresh && age < WORKS_MAX_AGE_MS) {
      return { success: true, ...cached.data };
    }

    let lastError = null;
    this.priorityJobs++;
    try {
      for (const { entry, adapter } of this.activeSources()) {
        if (typeof adapter.listWorks !== "function") continue;
        try {
          const works = await adapter.listWorks(actress, this.contextFor(entry));
          if (!works) continue;
          this.markSource(entry.id, null);
          const data = {
            actressId: id,
            name: actress.name || "",
            source: entry.id,
            fetchedAt: new Date().toISOString(),
            works,
          };
          if (!this.readOnly) await this.jsonStore.write(filePath, data);
          return { success: true, ...data };
        } catch (error) {
          this.markSource(entry.id, error);
          lastError = error;
        }
      }
    } finally {
      this.priorityJobs--;
    }

    // 새로 가져오지 못했으면 예전 목록이라도 보여 줌
    const reason = lastError ? lastError.message : "작품 목록을 제공하는 출처가 켜져 있지 않습니다.";
    if (hasCache) return { success: true, ...cached.data, stale: true, error: reason };
    return { success: false, error: reason };
  }

  async save() {
    if (this.unsaved === 0 || this.readOnly) return;
    this.unsaved = 0;
    try {
      await this.jsonStore.write(this.filePath, this.videos);
    } catch (error) {
      console.error("[Metadata] 저장 실패:", error.message);
    }
  }

  // ---------- 이미지 ----------

  allowedImageHost(hostname) {
    return this.adapters.some((adapter) => (adapter.imageHosts || []).includes(hostname));
  }

  // 이미지 주소 → 로컬 파일 URL (없으면 내려받음). 실패하면 null
  getImage(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return Promise.resolve(null);
    }
    if (parsed.protocol !== "https:" || !this.allowedImageHost(parsed.hostname)) {
      return Promise.resolve(null);
    }

    if (!this.imageJobs.has(url)) {
      const job = this.downloadImage(url).catch((error) => {
        console.warn("[Metadata] 이미지 실패:", url, error.message);
        this.imageJobs.delete(url); // 다음에 다시 시도할 수 있게
        return null;
      });
      this.imageJobs.set(url, job);
    }
    return this.imageJobs.get(url);
  }

  async downloadImage(url) {
    const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
    const name =
      crypto.createHash("sha1").update(url).digest("hex") +
      (/^\.(jpe?g|png|webp|gif)$/.test(ext) ? ext : ".jpg");
    const filePath = path.join(this.cacheDir, name);

    if (!(await fs.pathExists(filePath))) {
      await this.acquireImageSlot();
      try {
        const response = await this.fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0) throw new Error("빈 응답");
        await fs.ensureDir(this.cacheDir);
        const tmpPath = `${filePath}.${process.pid}.tmp`;
        await fs.writeFile(tmpPath, buffer);
        await fs.rename(tmpPath, filePath);
      } finally {
        this.releaseImageSlot();
      }
    }
    return pathToFileURL(filePath).href;
  }

  // 동시에 내려받는 이미지 수 제한
  async acquireImageSlot() {
    if (this.imageSlots >= 4) {
      await new Promise((resolve) => this.imageWaiters.push(resolve));
    }
    this.imageSlots++;
  }

  releaseImageSlot() {
    this.imageSlots--;
    const next = this.imageWaiters.shift();
    if (next) next();
  }

  // 종료 시: 진행을 멈추고 지금까지 받은 정보를 저장
  async stop() {
    this.stopped = true;
    await this.save();
  }
}

module.exports = MetadataService;
