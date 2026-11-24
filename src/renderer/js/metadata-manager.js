// 영상 정보(제목/출시일/배우/커버) 관리 - 렌더러 쪽
// - 메인 프로세스가 수집한 정보를 받아 파일과 연결 (파일명 품번 기준)
// - 배우별 묶음 계산, 이미지 로딩(로컬 캐시), 배우 좋아요 관리
class MetadataManager {
  static UNASSIGNED = "__none__"; // 배우 정보가 없는 영상 묶음의 키

  constructor() {
    this.videos = {}; // 품번 → 기록
    this.codeCache = new WeakMap(); // 파일 객체 → 품번(없으면 null)
    this.images = new Map(); // 이미지 주소 → Promise<로컬 URL|null>
    this.likes = new Set(); // 좋아요한 배우 키
    this.listeners = [];
    this.notifyTimer = null;
    this.likesPath = null;
  }

  async init(dataPath) {
    // 좋아요는 이 PC 전용(local 폴더)이라 Git 동기화에 올라가지 않음
    this.likesPath = `${dataPath}/local/actress-likes.json`;

    try {
      this.videos = (await window.electronAPI.invoke("meta-get-all")) || {};
    } catch (error) {
      console.warn("영상 정보 로드 실패:", error);
    }

    const likes = await window.electronAPI.invoke("load-json-file", this.likesPath);
    if (likes.success && Array.isArray(likes.data)) this.likes = new Set(likes.data.map(String));

    window.electronAPI.on("meta-updated", (event, records) => {
      for (const record of records || []) this.videos[record.code] = record;
      this.notifySoon();
    });
    window.electronAPI.on("meta-status", (event, status) => this.showStatus(status));
  }

  // 변경 알림 (연속 갱신은 모아서 한 번만)
  onChange(listener) {
    this.listeners.push(listener);
  }

  notifySoon() {
    if (this.notifyTimer) return;
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      this.listeners.forEach((listener) => listener());
    }, 1200);
  }

  showStatus(status) {
    const element = document.getElementById("meta-status");
    if (!element || !status) return;
    if (status.paused) {
      element.textContent = `영상 정보: ${status.message}`;
    } else if (status.running && status.total > 0) {
      element.textContent = `영상 정보 수집 ${status.done} / ${status.total}`;
    } else {
      element.textContent = "";
    }
  }

  // 조회할 수 있는 품번인지 (영문 접두어-숫자 형태만. FC2, 날짜형 번호는 출처가 지원하지 않음)
  static isLookupCode(code) {
    return /^(?=[A-Z0-9]*[A-Z])[A-Z0-9]{2,8}-\d{2,6}$/.test(code || "");
  }

  codeOf(file) {
    if (!this.codeCache.has(file)) {
      const code = DuplicateFinder.extractCode(file.Filename);
      this.codeCache.set(file, MetadataManager.isLookupCode(code) ? code : null);
    }
    return this.codeCache.get(file);
  }

  // 파일의 영상 정보 (없으면 null)
  metaOf(file) {
    const code = this.codeOf(file);
    const record = code ? this.videos[code] : null;
    return record && record.status === "ok" ? record : null;
  }

  static actressKey(actress) {
    return String(actress.id || actress.name);
  }

  actressesOf(file) {
    const meta = this.metaOf(file);
    return meta ? meta.actresses || [] : [];
  }

  releaseOf(file) {
    const meta = this.metaOf(file);
    return meta ? meta.releaseDate || "" : "";
  }

  // 아직 정보가 없는 영상의 품번을 수집 대기열에 추가
  async requestMissing(files) {
    const codes = new Set();
    for (const file of files) {
      const code = this.codeOf(file);
      if (code && !(this.videos[code] && this.videos[code].status === "ok")) codes.add(code);
    }
    if (codes.size === 0) return 0;
    try {
      return await window.electronAPI.invoke("meta-enqueue", [...codes]);
    } catch (error) {
      console.warn("영상 정보 수집 요청 실패:", error);
      return 0;
    }
  }

  // 배우별 묶음: { actresses: [{ key, name, nameJa, image, files, liked }], unassigned: [파일] }
  buildActressIndex(files) {
    const byKey = new Map();
    const unassigned = [];

    for (const file of files) {
      const actresses = this.actressesOf(file);
      if (actresses.length === 0) {
        unassigned.push(file);
        continue;
      }
      for (const actress of actresses) {
        const key = MetadataManager.actressKey(actress);
        let entry = byKey.get(key);
        if (!entry) {
          entry = { key, id: actress.id || null, name: actress.name, nameJa: actress.nameJa || "", image: actress.image || "", files: [] };
          byKey.set(key, entry);
        }
        if (!entry.image && actress.image) entry.image = actress.image;
        if (!entry.nameJa && actress.nameJa) entry.nameJa = actress.nameJa;
        entry.files.push(file);
      }
    }

    const actresses = [...byKey.values()];
    for (const entry of actresses) entry.liked = this.likes.has(entry.key);
    return { actresses, unassigned };
  }

  // 파일이 해당 배우(또는 미분류)에 속하는지
  fileHasActress(file, key) {
    const actresses = this.actressesOf(file);
    if (key === MetadataManager.UNASSIGNED) return actresses.length === 0;
    return actresses.some((actress) => MetadataManager.actressKey(actress) === key);
  }

  // 파일의 배우 이름이 검색어를 포함하는지 (영문/일본어 이름 모두)
  fileMatchesActressQuery(file, words) {
    const actresses = this.actressesOf(file);
    if (actresses.length === 0) return false;
    return actresses.some((actress) => MetadataManager.nameMatches(actress, words));
  }

  static nameMatches(actress, words) {
    const haystack = `${actress.name || ""} ${actress.nameJa || ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  }

  // 이미지 주소 → 로컬 캐시 URL (없으면 메인 프로세스가 내려받음)
  image(url) {
    if (!url) return Promise.resolve(null);
    if (!this.images.has(url)) {
      this.images.set(
        url,
        window.electronAPI.invoke("meta-get-image", url).catch(() => null)
      );
    }
    return this.images.get(url);
  }

  // img 요소에 이미지를 채움 (가상 스크롤로 요소가 재사용/제거돼도 안전)
  setImage(img, url) {
    img.dataset.source = url || "";
    if (!url) return;
    this.image(url).then((localUrl) => {
      if (localUrl && img.dataset.source === url) {
        img.src = localUrl;
        img.classList.add("loaded");
      }
    });
  }

  isLiked(key) {
    return this.likes.has(key);
  }

  async toggleLike(key) {
    if (this.likes.has(key)) this.likes.delete(key);
    else this.likes.add(key);
    await window.electronAPI.invoke("save-json-file", this.likesPath, [...this.likes].sort());
    return this.likes.has(key);
  }
}

window.MetadataManager = MetadataManager;
