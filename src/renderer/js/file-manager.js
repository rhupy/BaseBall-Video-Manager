// 파일 매니저 클래스 (JSON 기반)
// - 파일 목록/평점/메모는 data/media/files.json, data/file/files.json에 저장
// - 시작 시와 새로고침 시 라이브러리 폴더를 스캔해 목록을 맞춤
const FILE_TYPES = ["video", "file"];

class FileManager {
  constructor() {
    this.currentTab = "video";
    this.allFiles = {
      video: [],
      file: [],
    };
    this.filteredFiles = {
      video: [],
      file: [],
    };
    this.currentQuery = ""; // 현재 검색어 (새로고침 후에도 유지)
    this.actressQuery = ""; // 배우명 검색어 (비디오 탭 전용)
    this.actressFilter = null; // 선택한 배우 키 (비디오 탭 전용, 없으면 null)
    this.loadErrors = {}; // 타입별 로드 실패 사유 (있으면 해당 타입 저장 차단)
    this.isFillingSizes = false; // 용량 정보 수집 진행 여부
    this.duplicateMode = false; // 중복 파일만 보기
    this.duplicateGroups = { video: [], file: [] }; // 중복 보기에 표시 중인 묶음
    this.groupInfo = new Map(); // 중복 보기에서 파일 → { label, count, isFirst, isLast, groupIndex }
    this.isLoading = false;
  }

  // 초기화
  async init() {
    try {
      this.dataPath = await window.electronAPI.invoke("get-data-path");
      await this.loadAllFiles();
      Utils.updateStatus("파일 로딩 완료");
    } catch (error) {
      console.error("FileManager 초기화 실패:", error);
      Utils.updateStatus("초기화 실패");
    }
  }

  // ---------- 공통 헬퍼 ----------

  // 이름/메모 정렬용 (숫자는 크기순: 2 < 10)
  static collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

  // 시스템(현지) 시간 기준 "YYYY-MM-DD HH:mm:ss"
  static now() {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }

  static addTime(file) {
    const time = file.Addtime ? new Date(file.Addtime).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
  }

  // fullpath가 dir 안에 있는지 (Windows 기준: 대소문자/구분자 무시)
  static isUnderDir(fullpath, dir) {
    const norm = (p) => String(p).replace(/\//g, "\\").toLowerCase();
    const base = norm(dir).replace(/\\+$/, "");
    const target = norm(fullpath);
    return target === base || target.startsWith(base + "\\");
  }

  static extensionOf(filePath) {
    const name = String(filePath).split(/[\\/]/).pop();
    const lastDot = name.lastIndexOf(".");
    return lastDot <= 0 ? "" : name.substring(lastDot).toLowerCase();
  }

  // 현재 확장자 설정 { video: [...], other: [...] }
  getExtensions() {
    const current = window.extensionManager ? window.extensionManager.getExtensions() : null;
    return {
      video: (current && current.video) || CONSTANTS.EXTENSIONS.VIDEO || [],
      other: (current && current.other) || CONSTANTS.EXTENSIONS.FILE || [],
    };
  }

  jsonPath(type) {
    const fileName = type === "video" ? "media/files.json" : "file/files.json";
    return `${this.dataPath}/${fileName}`;
  }

  findFile(filePath) {
    for (const type of FILE_TYPES) {
      const file = this.allFiles[type].find((f) => f.Fullpath === filePath);
      if (file) return { type, file };
    }
    return null;
  }

  hasLoadErrors() {
    return Object.keys(this.loadErrors).length > 0;
  }

  // 로드 실패 상태에서는 목록을 바꾸는 작업을 막음 (평점/메모 유실 방지)
  blockIfLoadFailed(silent = false) {
    if (!this.hasLoadErrors()) return false;
    Utils.updateStatus("데이터 파일을 읽지 못해 저장/새로고침이 중단된 상태입니다.");
    if (!silent) {
      alert(
        "데이터 파일을 읽지 못한 상태라 이 작업을 진행할 수 없습니다.\n" +
          "data 폴더의 파일을 복원한 뒤 앱을 다시 시작해 주세요."
      );
    }
    return true;
  }

  async loadLibraries() {
    const result = await window.electronAPI.invoke(
      "load-json-file",
      `${this.dataPath}/lib.json`
    );
    if (!result.success) {
      throw new Error("라이브러리 파일을 읽을 수 없습니다.");
    }
    return Array.isArray(result.data) ? result.data : [];
  }

  // ---------- 로드 / 저장 ----------

  // 모든 파일 로드
  async loadAllFiles() {
    this.isLoading = true;
    Utils.updateStatus("파일을 로드하는 중...");

    try {
      const results = await Promise.all(FILE_TYPES.map((type) => this.loadFileData(type)));
      const recovered = [];
      this.loadErrors = {};

      FILE_TYPES.forEach((type, i) => {
        const result = results[i];
        if (result.success && Array.isArray(result.data)) {
          this.allFiles[type] = result.data;
          if (result.recovered) recovered.push(this.jsonPath(type));
        } else if (!result.success && result.code === "ENOENT") {
          // 파일이 아직 없는 것은 정상 (첫 실행)
          this.allFiles[type] = [];
        } else {
          // 손상/읽기 오류: 빈 목록으로 덮어쓰지 않도록 저장을 차단
          this.allFiles[type] = [];
          this.loadErrors[type] = result.error || "올바른 목록 형식이 아닙니다.";
        }
      });

      this.applyFilter();
      this.updateUI();

      if (this.hasLoadErrors()) {
        const details = Object.entries(this.loadErrors)
          .map(([type, error]) => `${this.jsonPath(type)}\n  → ${error}`)
          .join("\n");
        console.error("데이터 파일 로드 실패:", this.loadErrors);
        alert(
          "데이터 파일을 읽을 수 없습니다.\n\n" +
            details +
            "\n\n평점/메모가 지워지지 않도록 저장과 새로고침을 중단했습니다.\n" +
            "백업(zip)이나 Git 동기화에서 data 폴더를 복원한 뒤 앱을 다시 시작해 주세요."
        );
      } else if (recovered.length > 0) {
        console.warn("백업본(.bak)에서 복구:", recovered);
        alert(
          "데이터 파일이 손상되어 직전 백업본(.bak)에서 복구했습니다.\n\n" +
            recovered.join("\n") +
            "\n\n마지막 변경 한 번이 반영되지 않았을 수 있습니다."
        );
      }
    } finally {
      this.isLoading = false;
    }
  }

  // 개별 파일 데이터 로드
  async loadFileData(type) {
    return await window.electronAPI.invoke("load-json-file", this.jsonPath(type));
  }

  // 파일 데이터 저장 (변경이 없으면 메인 프로세스에서 쓰기를 건너뜀)
  async saveFileData(type) {
    if (this.loadErrors[type]) {
      console.warn(`${type} 목록은 로드에 실패한 상태라 저장하지 않습니다.`);
      return { success: false, error: "load-failed" };
    }

    const result = await window.electronAPI.invoke(
      "save-json-file",
      this.jsonPath(type),
      this.allFiles[type]
    );
    if (!result.success) {
      console.error("저장 실패:", result.error);
      Utils.updateStatus("저장 실패: " + result.error);
    }
    return result;
  }

  // ---------- 검색 ----------

  // 현재 검색어로 표시 목록 재계산
  applyFilter() {
    const words = this.currentQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // 모든 검색어가 파일명에 포함되는지
    const matches = (file) => {
      const name = (file.Filename || "").toLowerCase();
      return words.every((word) => name.includes(word));
    };

    this.groupInfo = new Map();

    for (const type of FILE_TYPES) {
      const base = this.baseFiles(type);

      if (this.duplicateMode) {
        // 중복 묶음만 표시. 검색어가 있으면 구성원 중 하나라도 맞는 묶음을 통째로 표시
        let groups = DuplicateFinder.findGroups(base);
        if (words.length > 0) {
          groups = groups.filter(
            (group) =>
              group.files.some(matches) ||
              words.every((word) => group.label.toLowerCase().includes(word))
          );
        }

        // 같은 묶음끼리는 항상 붙여 두고, 선택한 정렬을 묶음 안과 묶음 순서 양쪽에 적용
        // (묶음 순서는 정렬 후 각 묶음의 맨 위 파일 기준, 이름 정렬이면 묶음 이름 기준)
        const compare = this.getCurrentComparator();
        groups.forEach((group) => group.files.sort(compare));
        if (window.app && window.app.currentSort === "name") {
          const direction = window.app.isDescending ? -1 : 1;
          groups.sort((a, b) => direction * FileManager.collator.compare(a.label, b.label));
        } else {
          groups.sort(
            (a, b) =>
              compare(a.files[0], b.files[0]) || FileManager.collator.compare(a.label, b.label)
          );
        }

        const list = [];
        groups.forEach((group, groupIndex) => {
          group.files.forEach((file, i) => {
            this.groupInfo.set(file, {
              label: group.label,
              count: group.files.length,
              isFirst: i === 0,
              isLast: i === group.files.length - 1,
              groupIndex,
            });
            list.push(file);
          });
        });
        this.filteredFiles[type] = list;
        this.duplicateGroups[type] = groups;
      } else if (words.length === 0) {
        this.filteredFiles[type] = [...base];
      } else {
        this.filteredFiles[type] = base.filter(matches);
      }
    }
  }

  // 배우명 검색어를 단어로 나눈 것
  getActressWords() {
    return this.actressQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  // 탭의 기본 목록. 비디오 탭은 선택한 배우 / 배우명 검색을 먼저 적용
  baseFiles(type) {
    const files = this.allFiles[type];
    const manager = window.metadataManager;
    if (type !== "video" || !manager) return files;

    let result = files;
    if (this.actressFilter) {
      result = result.filter((file) => manager.fileHasActress(file, this.actressFilter));
    }
    const actressWords = this.getActressWords();
    if (actressWords.length > 0) {
      result = result.filter((file) => manager.fileMatchesActressQuery(file, actressWords));
    }
    return result;
  }

  searchActress(query) {
    this.actressQuery = query || "";
    this.applyFilter();
    this.updateUI();
  }

  // 중복 파일만 보기 전환 (같은 묶음은 항상 인접, 정렬은 묶음 단위로 적용)
  setDuplicateMode(enabled) {
    this.duplicateMode = !!enabled;
    this.applyFilter();
    this.updateUI();
  }

  // 중복 보기에서 해당 파일의 묶음 정보 (일반 보기에서는 undefined)
  getGroupInfo(file) {
    return this.groupInfo.get(file);
  }

  // 현재 탭에 표시 중인 중복 묶음 (중복 보기가 아니면 빈 배열)
  getDuplicateGroups() {
    return this.duplicateMode ? this.duplicateGroups[this.currentTab] || [] : [];
  }

  // 이미 디스크에서 지운 파일들을 목록에서 제거하고 저장 (files: 파일 객체의 Set)
  async removeFiles(files) {
    for (const type of FILE_TYPES) {
      const before = this.allFiles[type].length;
      this.allFiles[type] = this.allFiles[type].filter((file) => !files.has(file));
      if (this.allFiles[type].length !== before || files.size > 0) {
        await this.saveFileData(type);
      }
    }
    this.applyFilter();
    this.updateUI();
  }

  // 현재 탭의 중복 현황 { groups, files }
  getDuplicateStats() {
    return {
      groups: this.getDuplicateGroups().length,
      files: this.getCurrentFiles().length,
    };
  }

  search(query) {
    this.currentQuery = query || "";
    this.applyFilter();
    this.updateUI();
  }

  // ---------- 새로고침 (라이브러리 스캔) ----------

  // 자동 동기화 (앱 시작시)
  async autoSync() {
    return await this.refreshFiles(true);
  }

  // 파일 새로고침: 라이브러리마다 한 번만 순회해 비디오/기타를 함께 수집
  async refreshFiles(isAutoSync = false) {
    if (this.isLoading) return;
    if (this.blockIfLoadFailed(isAutoSync)) return;

    this.isLoading = true;
    const statusText = isAutoSync
      ? "자동 동기화 중..."
      : "파일을 새로고침하는 중...";
    Utils.updateStatus(statusText);

    try {
      const libraries = await this.loadLibraries();
      const extensions = this.getExtensions();
      const videoExts = new Set(extensions.video.map((ext) => ext.toLowerCase()));
      const allExts = [...new Set([...extensions.video, ...extensions.other])];

      const scanned = { video: new Map(), file: new Map() }; // Fullpath → Filename
      const inaccessibleLibraries = [];
      const preservedRoots = []; // 읽지 못한 경로: 그 아래 기존 항목은 그대로 보존

      for (let i = 0; i < libraries.length; i++) {
        const library = libraries[i];
        Utils.updateProgress(i, libraries.length, `${library.path} 스캔 중...`);

        const libraryExists = await window.electronAPI.invoke("path-exists", library.path);
        const scanResult = libraryExists
          ? await window.electronAPI.invoke("scan-directory", library.path, allExts)
          : null;

        if (!scanResult || !scanResult.success) {
          // 접근 불가능한 라이브러리는 건드리지 않음
          inaccessibleLibraries.push(library);
          preservedRoots.push(library.path);
          continue;
        }

        for (const scannedFile of scanResult.files) {
          const type = videoExts.has(scannedFile.ext) ? "video" : "file";
          scanned[type].set(scannedFile.fullpath, scannedFile.filename);
        }
        preservedRoots.push(...(scanResult.skippedDirs || []));

        // 수동 새로고침시에만 빈 폴더 삭제
        if (!isAutoSync) {
          await this.removeEmptyFolders(library.path);
        }
      }

      // 기존 항목 조회용 (평점/메모 보존, 탭 간 이동 시에도 유지)
      const existingByPath = new Map();
      for (const type of FILE_TYPES) {
        for (const file of this.allFiles[type]) {
          if (!existingByPath.has(file.Fullpath)) existingByPath.set(file.Fullpath, file);
        }
      }

      const isPreserved = (file) =>
        preservedRoots.some((root) => FileManager.isUnderDir(file.Fullpath, root));

      const now = FileManager.now();
      let addedCount = 0;
      let removedCount = 0;
      const nextFiles = {};

      for (const type of FILE_TYPES) {
        const kept = [];
        const added = [];
        const seen = new Set();

        // 1) 기존 항목: 스캔에서 확인됐거나 보존 대상이면 기존 순서 그대로 유지
        for (const file of this.allFiles[type]) {
          if (seen.has(file.Fullpath)) continue;
          if (scanned[type].has(file.Fullpath) || isPreserved(file)) {
            seen.add(file.Fullpath);
            kept.push(file);
          } else if (!scanned.video.has(file.Fullpath) && !scanned.file.has(file.Fullpath)) {
            removedCount++;
          }
        }

        // 2) 새로 발견된 항목 (다른 탭에 있던 파일이면 메타데이터를 가져옴)
        for (const [fullpath, filename] of scanned[type]) {
          if (seen.has(fullpath)) continue;
          seen.add(fullpath);

          const existing = existingByPath.get(fullpath);
          if (existing) {
            added.push(existing);
          } else {
            addedCount++;
            added.push({
              Filename: filename,
              Fullpath: fullpath,
              Addtime: now,
              Lasttime: "",
              Eval: "",
              Desc: "",
            });
          }
        }

        // 추가 시간 역순 (안정 정렬: 변경이 없으면 순서 그대로, 같은 시각이면 새 항목이 앞)
        const result = [...added, ...kept];
        result.sort((a, b) => FileManager.addTime(b) - FileManager.addTime(a));
        nextFiles[type] = result;
      }

      this.allFiles = nextFiles;
      for (const type of FILE_TYPES) {
        await this.saveFileData(type);
      }

      this.applyFilter();
      this.updateUI();

      // 접속 불가능한 라이브러리가 있으면 사용자에게 알림
      if (inaccessibleLibraries.length > 0) {
        const inaccessiblePaths = inaccessibleLibraries.map((lib) => lib.path);
        console.warn("접속 불가능한 라이브러리:", inaccessiblePaths);

        if (!isAutoSync) {
          // 수동 새로고침시에만 알림 표시
          alert(
            `다음 라이브러리에 접속할 수 없습니다:\n\n${inaccessiblePaths.join(
              "\n"
            )}\n\n` +
              "해당 라이브러리의 파일들은 변경되지 않았습니다.\n" +
              "네트워크 연결이나 경로를 확인해 주세요."
          );
        }
      }

      const completedText = isAutoSync ? "동기화 완료" : "새로고침 완료";
      const changeText =
        addedCount || removedCount ? ` (추가 ${addedCount}, 제거 ${removedCount})` : "";
      Utils.updateStatus(
        `${completedText} - 비디오: ${this.allFiles.video.length}개, 기타: ${this.allFiles.file.length}개${changeText}`
      );

      // 용량 정보가 없는 파일은 백그라운드에서 채움 (스캔 자체는 stat 없이 빠르게 유지)
      this.fillMissingSizes(preservedRoots);

      // 영상 정보가 없는 품번은 백그라운드 수집 대기열에 추가
      if (window.metadataManager) window.metadataManager.requestMissing(this.allFiles.video);
    } catch (error) {
      console.error("파일 새로고침 실패:", error);
      Utils.updateStatus("새로고침 실패");
    } finally {
      this.isLoading = false;
    }
  }

  // 용량(Size, 바이트)이 없는 항목을 백그라운드로 조회해 저장
  // - 새로 추가된 파일, 또는 용량 컬럼 도입 전 데이터가 대상 (한 번 채워지면 다시 조회하지 않음)
  // - 접근할 수 없는 경로(skipRoots) 아래 파일은 건너뜀
  async fillMissingSizes(skipRoots = []) {
    if (this.isFillingSizes || this.hasLoadErrors()) return;
    this.isFillingSizes = true;

    try {
      const targets = [];
      for (const type of FILE_TYPES) {
        for (const file of this.allFiles[type]) {
          if (typeof file.Size === "number") continue;
          if (skipRoots.some((root) => FileManager.isUnderDir(file.Fullpath, root))) continue;
          targets.push(file);
        }
      }
      if (targets.length === 0) return;

      const CHUNK = 300;
      const SAVE_EVERY = 1500;
      let filled = 0;
      let unsaved = 0;

      const saveAll = async () => {
        for (const type of FILE_TYPES) await this.saveFileData(type);
        unsaved = 0;
      };

      for (let start = 0; start < targets.length; start += CHUNK) {
        const chunk = targets.slice(start, start + CHUNK);
        const sizes = await window.electronAPI.invoke(
          "get-file-sizes",
          chunk.map((file) => file.Fullpath)
        );

        chunk.forEach((file, i) => {
          if (typeof sizes[i] === "number") {
            file.Size = sizes[i];
            filled++;
            unsaved++;
          }
        });

        if (targets.length > CHUNK) {
          Utils.updateStatus(
            `용량 정보 수집: ${Math.min(start + CHUNK, targets.length)} / ${targets.length}`
          );
        }
        // 오래 걸리는 경우를 대비해 중간 저장
        if (unsaved >= SAVE_EVERY) await saveAll();
      }

      if (unsaved > 0) await saveAll();
      if (filled > 0) {
        // 용량이 채워지면 "같은 용량" 묶음이 달라질 수 있음
        if (this.duplicateMode) this.applyFilter();
        this.updateUI();
        if (targets.length > CHUNK) Utils.updateStatus(`용량 정보 수집 완료 (${filled}개)`);
      }
    } catch (error) {
      console.warn("용량 정보 수집 실패:", error);
    } finally {
      this.isFillingSizes = false;
    }
  }

  // ---------- 파일 실행 / 메타데이터 ----------

  // 파일이 속한 라이브러리(드라이브)에 접근 가능한지
  // 외장/네트워크 드라이브가 분리된 상태에서 항목이 지워지는 것을 막기 위함
  async isLibraryReachable(filePath) {
    try {
      const libraries = await this.loadLibraries();
      const owners = libraries.filter((lib) => FileManager.isUnderDir(filePath, lib.path));
      if (owners.length === 0) return true;

      for (const library of owners) {
        if (await window.electronAPI.invoke("path-exists", library.path)) return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // 파일이 없을 때 처리: 라이브러리가 살아 있으면 목록에서 제거, 아니면 그대로 둠
  async handleMissingFile(filePath) {
    if (await this.isLibraryReachable(filePath)) {
      await this.removeFileFromList(filePath);
      Utils.updateStatus(`존재하지 않는 파일을 목록에서 제거했습니다.`);
    } else {
      Utils.updateStatus("라이브러리(드라이브)에 접근할 수 없습니다. 연결 상태를 확인해 주세요.");
    }
  }

  // 파일 실행
  async executeFile(filePath) {
    const exists = await window.electronAPI.invoke("path-exists", filePath);
    if (!exists) {
      await this.handleMissingFile(filePath);
      return;
    }

    const result = await window.electronAPI.invoke("open-file", filePath);
    if (result.success) {
      this.updateLastAccessTime(filePath);
    } else {
      alert("파일을 열 수 없습니다: " + result.error);
    }
  }

  // 폴더 열기
  async openFolder(filePath) {
    const exists = await window.electronAPI.invoke("path-exists", filePath);
    if (!exists) {
      await this.handleMissingFile(filePath);
      return;
    }

    await window.electronAPI.invoke("open-folder", filePath);
  }

  // 마지막 접근 시간 업데이트
  updateLastAccessTime(filePath) {
    const found = this.findFile(filePath);
    if (!found) return;
    found.file.Lasttime = FileManager.now();
    this.saveFileData(found.type);
  }

  // 평점 업데이트
  async updateRating(filePath, rating) {
    const found = this.findFile(filePath);
    if (!found) return;
    found.file.Eval = rating > 0 ? "★".repeat(rating) : "";
    await this.saveFileData(found.type);
  }

  // 설명 업데이트
  async updateDescription(filePath, description) {
    const found = this.findFile(filePath);
    if (!found) return;
    found.file.Desc = description;
    await this.saveFileData(found.type);
  }

  // 탭 변경
  switchTab(tab) {
    this.currentTab = tab;
    this.updateUI();
  }

  // 현재 표시할 파일들 반환
  getCurrentFiles() {
    return this.filteredFiles[this.currentTab] || [];
  }

  // UI 업데이트 (현재 정렬 유지)
  updateUI() {
    // 현재 정렬 상태 재적용 (중복 보기는 applyFilter에서 묶음 단위로 정렬됨)
    if (!this.duplicateMode && window.app && window.app.currentSort) {
      this.sortFilesQuiet(window.app.currentSort, window.app.isDescending);
    }

    const files = this.getCurrentFiles();
    Utils.updateFileCount(files.length);

    // 가상 스크롤러에 알림
    if (window.virtualScroll) {
      window.virtualScroll.updateData(files);
    }

    // 확장자 목록 업데이트
    const currentExtensions = this.getExtensions();
    const extensions =
      this.currentTab === "video"
        ? currentExtensions.video
        : currentExtensions.other;

    const extensionList = document.getElementById("extension-list");
    const prefix = window.i18n ? window.i18n.t('extensions').split(':')[0] + ':' : '확장자:';
    extensionList.textContent = `${prefix} ${extensions.join(", ")}`;
  }

  // 빈 폴더 제거
  async removeEmptyFolders(libraryPath) {
    try {
      const result = await window.electronAPI.invoke(
        "remove-empty-folders",
        libraryPath
      );
      if (result.success && result.count > 0) {
        console.log(
          `${libraryPath}에서 ${result.count}개의 빈 폴더를 제거했습니다.`
        );
      }
    } catch (error) {
      console.warn("빈 폴더 삭제 실패:", error);
    }
  }

  // 목록에서 파일 제거
  async removeFileFromList(filePath) {
    for (const type of FILE_TYPES) {
      const index = this.allFiles[type].findIndex((f) => f.Fullpath === filePath);
      if (index !== -1) {
        this.allFiles[type].splice(index, 1);
        await this.saveFileData(type);
      }
    }

    this.applyFilter();
    this.updateUI();
  }

  // 중복 제거 및 정리 (빈 폴더 삭제 포함)
  async cleanup() {
    if (this.isLoading) return;
    if (this.blockIfLoadFailed()) return;

    this.isLoading = true;
    Utils.showProgress("중복 제거 및 정리 중...");
    Utils.updateStatus("중복 제거 및 정리 중...");

    try {
      let totalDuplicatesRemoved = 0;
      let totalInvalidFilesRemoved = 0;

      // 접근할 수 없는 라이브러리의 파일은 "없는 파일"로 취급하지 않고 보존
      const libraries = await this.loadLibraries();
      const offlineRoots = [];
      for (const library of libraries) {
        if (!(await window.electronAPI.invoke("path-exists", library.path))) {
          offlineRoots.push(library.path);
        }
      }
      const isOffline = (file) =>
        offlineRoots.some((root) => FileManager.isUnderDir(file.Fullpath, root));

      for (const type of FILE_TYPES) {
        Utils.updateStatus(`${type === "video" ? "비디오" : "압축"} 파일 정리 중...`);

        // 1. 존재하지 않는 파일 제거 (한 번의 호출로 일괄 확인)
        const files = this.allFiles[type];
        const toCheck = files.filter((file) => !isOffline(file));
        const existsList = await window.electronAPI.invoke(
          "paths-exist",
          toCheck.map((file) => file.Fullpath)
        );
        const missing = new Set(toCheck.filter((file, i) => !existsList[i]));

        // 2. 중복 제거 (Fullpath 기준)
        const uniqueFiles = [];
        const seenPaths = new Set();

        for (const file of files) {
          if (missing.has(file)) {
            totalInvalidFilesRemoved++;
            console.log(`존재하지 않는 파일 제거: ${file.Filename}`);
          } else if (seenPaths.has(file.Fullpath)) {
            totalDuplicatesRemoved++;
            console.log(`중복 파일 제거: ${file.Filename}`);
          } else {
            seenPaths.add(file.Fullpath);
            uniqueFiles.push(file);
          }
        }

        // 3. 추가 시간 역순 정렬
        uniqueFiles.sort((a, b) => FileManager.addTime(b) - FileManager.addTime(a));

        this.allFiles[type] = uniqueFiles;
        await this.saveFileData(type);
      }

      // 4. 빈 폴더 제거
      Utils.updateStatus("빈 폴더 제거 중...");
      const totalEmptyFoldersRemoved = await this.removeAllEmptyFolders();

      this.applyFilter();
      this.updateUI();

      // 결과 메시지
      let message = "정리 완료";
      const results = [];

      if (totalDuplicatesRemoved > 0) {
        results.push(`중복 ${totalDuplicatesRemoved}개 제거`);
      }
      if (totalInvalidFilesRemoved > 0) {
        results.push(`무효 파일 ${totalInvalidFilesRemoved}개 제거`);
      }
      if (totalEmptyFoldersRemoved > 0) {
        results.push(`빈 폴더 ${totalEmptyFoldersRemoved}개 제거`);
      }
      if (offlineRoots.length > 0) {
        results.push(`접근 불가 라이브러리 ${offlineRoots.length}개는 건너뜀`);
      }

      if (results.length > 0) {
        message += ` - ${results.join(", ")}`;
      }

      Utils.updateStatus(message);
      console.log(`정리 완료: 비디오 ${this.allFiles.video.length}개, 압축 ${this.allFiles.file.length}개`);
    } catch (error) {
      console.error("정리 실패:", error);
      Utils.updateStatus("정리 실패");
    } finally {
      this.isLoading = false;
      // 정리 완료 후 프로그래스바 숨김
      setTimeout(() => Utils.hideProgress(), 1000);
    }
  }

  // 모든 라이브러리 경로의 빈 폴더 제거
  async removeAllEmptyFolders() {
    try {
      // 라이브러리 경로들 로드
      const libraryResult = await window.electronAPI.invoke(
        "load-json-file",
        `${this.dataPath}/lib.json`
      );
      
      if (!libraryResult.success) {
        console.warn("라이브러리 파일을 읽을 수 없습니다.");
        return 0;
      }

      const libraries = libraryResult.data || [];
      let totalRemoved = 0;

      // 각 라이브러리 경로에서 빈 폴더 제거
      for (const library of libraries) {
        try {
          const exists = await window.electronAPI.invoke("path-exists", library.path);
          if (exists) {
            const result = await window.electronAPI.invoke(
              "remove-empty-folders",
              library.path
            );
            
            if (result.success) {
              totalRemoved += result.count || 0;
              console.log(`${library.path}에서 ${result.count}개 빈 폴더 제거`);
            }
          } else {
            console.warn(`라이브러리 경로 접근 불가: ${library.path}`);
          }
        } catch (error) {
          console.warn(`빈 폴더 제거 실패 (${library.path}):`, error.message);
        }
      }

      return totalRemoved;
    } catch (error) {
      console.error("빈 폴더 제거 실패:", error);
      return 0;
    }
  }

  // 정렬만 수행 (UI 갱신 없이 — updateUI에서 호출)
  sortFilesQuiet(sortType, isDescending = true) {
    const currentFiles = this.filteredFiles[this.currentTab];
    if (!currentFiles || currentFiles.length === 0) return;
    this._doSort(currentFiles, sortType, isDescending);
  }

  // 정렬 비교 함수. 선택한 컬럼 값이 같으면 항상 파일명순(오름차순)으로 정리
  getComparator(sortType, isDescending) {
    const direction = isDescending ? -1 : 1;
    const collator = FileManager.collator;
    const time = (value) => {
      const t = value ? new Date(value).getTime() : 0;
      return Number.isNaN(t) ? 0 : t;
    };
    const byName = (a, b) => collator.compare(a.Filename || "", b.Filename || "");

    let primary;
    switch (sortType) {
      case "name":
        return (a, b) => direction * byName(a, b);
      case "lasttime":
        primary = (a, b) => direction * (time(a.Lasttime) - time(b.Lasttime));
        break;
      case "rating":
        primary = (a, b) =>
          direction * ((a.Eval ? a.Eval.length : 0) - (b.Eval ? b.Eval.length : 0));
        break;
      case "size":
        primary = (a, b) => direction * ((a.Size || 0) - (b.Size || 0));
        break;
      case "release":
        // 출시일을 모르는 항목은 방향과 관계없이 항상 뒤로
        primary = (a, b) => {
          const manager = window.metadataManager;
          const dateA = manager ? manager.releaseOf(a) : "";
          const dateB = manager ? manager.releaseOf(b) : "";
          if (!dateA || !dateB) return dateA ? -1 : dateB ? 1 : 0;
          return direction * dateA.localeCompare(dateB);
        };
        break;
      case "memo":
        // 메모가 없는 항목은 방향과 관계없이 항상 뒤로
        primary = (a, b) => {
          const descA = a.Desc || "";
          const descB = b.Desc || "";
          if (!descA || !descB) return descA ? -1 : descB ? 1 : 0;
          return direction * collator.compare(descA, descB);
        };
        break;
      case "addtime":
      default:
        primary = (a, b) => direction * (time(a.Addtime) - time(b.Addtime));
        break;
    }

    return (a, b) => primary(a, b) || byName(a, b);
  }

  // 현재 선택된 정렬의 비교 함수
  getCurrentComparator() {
    const sortType = (window.app && window.app.currentSort) || "addtime";
    const isDescending = window.app ? window.app.isDescending !== false : true;
    return this.getComparator(sortType, isDescending);
  }

  // 실제 정렬 로직
  _doSort(currentFiles, sortType, isDescending) {
    currentFiles.sort(this.getComparator(sortType, isDescending));
  }

  // 파일 정렬 (UI 업데이트 포함)
  sortFiles(sortType, isDescending = true) {
    if (this.duplicateMode) {
      // 묶음은 붙여 둔 채로 묶음 순서와 묶음 안을 다시 정렬
      this.applyFilter();
    } else {
      const currentFiles = this.filteredFiles[this.currentTab];
      this._doSort(currentFiles, sortType, isDescending);
    }

    this.updateUI();
  }

  // 확장자 설정 변경 처리
  async onExtensionsChanged() {
    if (this.blockIfLoadFailed(true)) return;

    console.log("확장자 설정이 변경되어 파일 분류를 다시 수행합니다.");

    const moved = this.reclassifyFiles();
    if (moved > 0) {
      for (const type of FILE_TYPES) {
        await this.saveFileData(type);
      }
    }

    this.applyFilter();
    this.updateUI();

    Utils.updateStatus("확장자 설정 변경으로 파일 분류가 업데이트되었습니다.");
  }

  // 파일 재분류: 확장자가 반대쪽 목록으로 옮겨진 파일만 탭을 이동 (평점/메모 유지)
  // 새로 추가된 확장자의 파일은 다음 새로고침 때 스캔됨
  reclassifyFiles() {
    const extensions = this.getExtensions();
    const videoExts = new Set(extensions.video.map((ext) => ext.toLowerCase()));
    const otherExts = new Set(extensions.other.map((ext) => ext.toLowerCase()));

    const next = { video: [], file: [] };
    let moved = 0;

    for (const type of FILE_TYPES) {
      for (const file of this.allFiles[type]) {
        const ext = FileManager.extensionOf(file.Fullpath || file.Filename || "");
        let target = type;
        if (videoExts.has(ext)) target = "video";
        else if (otherExts.has(ext)) target = "file";

        if (target !== type) moved++;
        next[target].push(file);
      }
    }

    if (moved > 0) {
      for (const type of FILE_TYPES) {
        next[type].sort((a, b) => FileManager.addTime(b) - FileManager.addTime(a));
      }
      this.allFiles = next;
    }

    console.log(`파일 재분류 완료: ${moved}개 이동`);
    return moved;
  }
}

// 전역 변수로 내보내기
window.FileManager = FileManager;
