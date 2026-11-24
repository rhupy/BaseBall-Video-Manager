// 메인 애플리케이션 클래스
class App {
  // 컬럼을 처음 클릭했을 때의 방향 (true: 내림차순)
  static SORT_DEFAULT_DESC = {
    name: false,
    memo: false,
    size: true,
    release: true,
    addtime: true,
    lasttime: true,
    rating: true,
  };

  constructor() {
    this.fileManager = null;
    this.virtualScroll = null;
    this.libraryManager = null;
    this.searchEngine = null;
    this.currentTab = "video";
    this.isInitialized = false;
    this.lastExecutedFile = null; // 마지막으로 실행한 파일 경로
    this.currentSort = "addtime"; // 현재 정렬 타입 (기본: 추가시간순)
    this.isDescending = true; // 정렬 방향 (true: 내림차순, false: 오름차순)
    this.loadSortState();

    // 화면 상태와 이동 기록 (뒤로/앞으로)
    //   tab: "video" | "file", view: "list"(행 목록) | "actresses"(배우 격자) | "works"(배우의 전체 작품),
    //   actress: 선택한 배우 키, duplicates: 중복 파일만 보기
    this.viewState = { tab: "video", view: "list", actress: null, duplicates: false };
    this.history = [{ state: this.viewState, scroll: 0 }];
    this.historyIndex = 0;
  }

  // 앱 초기화
  async init() {
    try {
      Utils.updateStatus("애플리케이션을 초기화하는 중...");

      // Electron API 체크
      if (!window.electronAPI) {
        // Electron API가 없으면 생성 (contextIsolation이 false이므로)
        const { ipcRenderer } = require("electron");
        window.electronAPI = {
          invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
          on: (channel, listener) => ipcRenderer.on(channel, listener),
        };

        // 기본 alert()/confirm() 대신 메인 프로세스의 메시지 박스 사용
        // (Windows에서 기본 창을 닫은 뒤 입력창에 글자가 입력되지 않는 문제 방지)
        window.alert = (message) => {
          ipcRenderer.sendSync("dialog-alert", String(message));
        };
        window.confirm = (message) => ipcRenderer.sendSync("dialog-confirm", String(message));
      }

      // 핵심 모듈들 초기화
      await this.initManagers();

      // UI 초기화
      this.initUI();

      // 이벤트 리스너 설정
      this.initEventListeners();

      // 데이터 로딩
      await this.loadInitialData();

      this.isInitialized = true;
      Utils.updateStatus("준비됨");

      // 초기화 완료 후 프로그래스바 숨김
      Utils.hideProgress();

      // 싱크 버튼 상태 초기화
      await this.initSyncButtonState();

      console.log("Baseball Video Manager 초기화 완료");
    } catch (error) {
      console.error("앱 초기화 실패:", error);
      Utils.updateStatus("초기화 실패");
      this.showErrorMessage(
        "애플리케이션 초기화에 실패했습니다: " + error.message
      );
    }
  }

  // 매니저들 초기화
  async initManagers() {
    // 확장자 매니저 초기화
    await window.extensionManager.init();

    // 파일 매니저 초기화
    this.fileManager = new FileManager();
    window.fileManager = this.fileManager;

    // 라이브러리 매니저 초기화
    this.libraryManager = new LibraryManager();
    window.libraryManager = this.libraryManager;
    await this.libraryManager.init();

    // 검색 엔진 초기화
    this.searchEngine = new SearchEngine();
    window.searchEngine = this.searchEngine;

    // 가상 스크롤 초기화
    const scrollContainer = document.getElementById("file-list");
    this.virtualScroll = new VirtualScroll(
      scrollContainer,
      CONSTANTS.VIRTUAL_ITEM_HEIGHT
    );
    window.virtualScroll = this.virtualScroll;

    // 영상 정보(배우/커버/출시일) 관리
    this.metadataManager = new MetadataManager();
    window.metadataManager = this.metadataManager;
    await this.metadataManager.init(await window.electronAPI.invoke("get-data-path"));
    this.actressView = new ActressView(this);
    this.worksView = new WorksView(this);
    this.metaSettings = new MetaSettings();
    this.metadataManager.onChange(() => this.onMetadataChanged());
  }

  // UI 초기화
  initUI() {
    // 탭 버튼 초기화
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // 초기 탭 활성화
    this.switchTab("video");

    // 검색 엔진 초기화
    this.searchEngine.init();

    // 다국어 시스템 초기화
    this.initI18n();
  }

  // 이벤트 리스너 설정
  initEventListeners() {
    // 동기화 설정 버튼
    document.getElementById("sync-settings-btn").addEventListener("click", () => {
      this.openSyncSettings();
    });

    // 백업 버튼
    document.getElementById("backup-btn").addEventListener("click", () => {
      this.backupData();
    });

    // 새로고침 버튼
    document.getElementById("refresh-btn").addEventListener("click", () => {
      this.refreshFiles();
    });

    // 정리 버튼
    document.getElementById("cleanup-btn").addEventListener("click", () => {
      this.cleanupFiles();
    });

    // 중복 파일만 보기 전환
    document.getElementById("duplicate-toggle").addEventListener("click", () => {
      this.toggleDuplicateMode();
    });

    this.initColumnResize();
    this.initNavigation();
    this.duplicateCleaner = new DuplicateCleaner(this.fileManager);

    // 컬럼 헤더 클릭 → 정렬 (같은 컬럼을 다시 클릭하면 방향 전환)
    document.querySelectorAll("#file-header .sortable").forEach((header) => {
      header.addEventListener("click", () => {
        this.handleSort(header.dataset.sort);
      });
    });

    // 키보드 단축키
    document.addEventListener("keydown", (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // 윈도우 포커스/블러 이벤트
    window.addEventListener("focus", () => {
      // 포커스 시 파일 상태 확인 (필요시)
    });

    // 애플리케이션 종료 전 정리
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
  }

  // 초기 데이터 로딩
  async loadInitialData() {
    Utils.updateStatus("파일 데이터를 로딩하는 중...");

    // 라이브러리 유효성 검사
    await this.libraryManager.validateLibraries();

    // 파일 매니저 초기화
    await this.fileManager.init();

    // 앱 시작시 자동 동기화
    Utils.updateStatus("라이브러리와 동기화하는 중...");
    await this.fileManager.autoSync();
    
    // 기본 정렬 적용
    this.applyDefaultSort();

    // 초기 화면 상태 반영 (버튼 표시 등)
    this.applyViewState(this.viewState, 0);

    // 프로그램 이름 옆에 버전 표시
    try {
      const version = await window.electronAPI.invoke("get-app-version");
      const versionLabel = document.getElementById("app-version");
      versionLabel.textContent = `v${version}`;

      // 자동 업데이트 상태 표시, 버전을 누르면 수동 확인
      const showUpdateState = (state) => {
        const visible = ["available", "downloading", "ready"].includes(state && state.status);
        document.getElementById("update-status").textContent = visible ? state.message : "";
      };
      window.electronAPI.on("update-state", (event, state) => showUpdateState(state));
      showUpdateState(await window.electronAPI.invoke("update-get-state"));
      versionLabel.addEventListener("click", () => window.electronAPI.invoke("update-check"));
    } catch (error) {
      // 버전 표시는 실패해도 무시
    }
  }

  // 탭 전환
  switchTab(tabName) {
    this.navigate({ tab: tabName });
  }

  // ---------- 화면 이동 (탭 / 중복 보기 / 배우 보기) ----------

  initNavigation() {
    document.getElementById("nav-back").addEventListener("click", () => this.goHistory(-1));
    document.getElementById("nav-forward").addEventListener("click", () => this.goHistory(1));

    // 마우스의 뒤로/앞으로 버튼
    window.addEventListener("mouseup", (e) => {
      if (e.button === 3) this.goHistory(-1);
      if (e.button === 4) this.goHistory(1);
    });

    // 배우별 버튼: 배우 격자 ↔ 목록
    document.getElementById("actress-toggle").addEventListener("click", () => {
      this.navigate({ view: this.viewState.view === "actresses" ? "list" : "actresses" });
    });

    // 배우명 검색 (비디오 탭 전용): 배우 격자에서는 카드를, 목록에서는 영상을 거름
    const actressSearch = document.getElementById("actress-search");
    actressSearch.addEventListener(
      "input",
      Utils.debounce(() => {
        this.fileManager.actressQuery = actressSearch.value.trim();
        if (this.viewState.view === "actresses") {
          this.actressView.render();
        } else {
          this.fileManager.applyFilter();
          this.fileManager.updateUI();
          this.renderActressBar();
        }
      }, 200)
    );

    // 선택한 배우 표시줄의 버튼 (좋아요 / 닫기)
    document.getElementById("actress-bar").addEventListener("click", async (e) => {
      if (e.target.closest(".actress-bar-like")) {
        await this.metadataManager.toggleLike(this.viewState.actress);
        this.renderActressBar();
      } else if (e.target.closest(".actress-bar-close")) {
        this.navigate({ view: "actresses" });
      } else if (e.target.closest(".actress-bar-tab")) {
        // 보유 영상 ↔ 전체 작품
        this.navigate({ view: e.target.closest(".actress-bar-tab").dataset.view });
      }
    });
  }

  // 상태를 일관되게 정리: 기타 탭에는 배우 보기가 없고, 배우 격자에서는 중복 보기를 끔
  normalizeState(state) {
    const next = { ...state };
    if (next.tab !== "video") {
      next.view = "list";
      next.actress = null;
    }
    if (next.view === "actresses") {
      next.actress = null;
      next.duplicates = false;
    }
    if (next.view === "works") {
      // 전체 작품 화면은 배우를 선택한 상태에서만
      if (!next.actress || next.actress === MetadataManager.UNASSIGNED) next.view = "list";
      else next.duplicates = false;
    }
    return next;
  }

  currentScroll() {
    const ids = { actresses: "actress-view", works: "works-view" };
    return document.getElementById(ids[this.viewState.view] || "file-list").scrollTop;
  }

  // 새 화면으로 이동 (이동 기록에 추가)
  navigate(patch) {
    const next = this.normalizeState({ ...this.viewState, ...patch });
    if (JSON.stringify(next) === JSON.stringify(this.viewState)) return;

    this.history[this.historyIndex].scroll = this.currentScroll();
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ state: next, scroll: 0 });
    if (this.history.length > 100) this.history.shift();
    this.historyIndex = this.history.length - 1;

    this.applyViewState(next, 0);
  }

  // 뒤로(-1) / 앞으로(+1): 스크롤 위치까지 되돌림
  goHistory(delta) {
    const target = this.historyIndex + delta;
    if (target < 0 || target >= this.history.length) return;

    this.history[this.historyIndex].scroll = this.currentScroll();
    this.historyIndex = target;
    const entry = this.history[target];
    this.applyViewState(entry.state, entry.scroll);
  }

  // 화면 상태를 실제 UI에 반영
  applyViewState(state, scroll = 0) {
    this.viewState = state;
    this.currentTab = state.tab;
    if (!this.fileManager) return;

    const isVideo = state.tab === "video";
    const isWorks = state.view === "works";
    const isGrid = state.view === "actresses" || isWorks; // 행 목록이 아닌 격자 화면
    const element = (id) => document.getElementById(id);

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.tab);
    });

    element("actress-toggle").classList.toggle("hidden", !isVideo);
    element("actress-toggle").classList.toggle("active", isGrid || !!state.actress);
    element("actress-search").classList.toggle("hidden", !isVideo || isWorks);
    element("search-input").classList.toggle("hidden", isGrid);
    element("duplicate-toggle").classList.toggle("hidden", isGrid);
    element("duplicate-toggle").classList.toggle("active", state.duplicates);
    element("dedupe-open").classList.toggle("hidden", !state.duplicates || isGrid);
    element("file-list").classList.toggle("dup-mode", state.duplicates);
    element("file-area").classList.toggle("hidden", isGrid);
    element("file-list").classList.toggle("no-meta", !isVideo); // 기타 탭에는 커버/출시일 칸 없음
    element("file-count-label").textContent = isWorks
      ? "개 작품"
      : isGrid
      ? "명"
      : window.i18n
        ? window.i18n.t("filesCount")
        : "개 파일";

    this.fileManager.currentTab = state.tab;
    this.fileManager.duplicateMode = state.duplicates;
    this.fileManager.actressFilter = isVideo ? state.actress : null;
    this.fileManager.applyFilter();

    if (isWorks) {
      this.actressView.hide();
      this.worksView.show();
      this.renderActressBar();
      const entry = this.actressView.find(state.actress);
      this.worksView.load(entry).then(() => {
        if (this.viewState === state) element("works-view").scrollTop = scroll;
      });
      Utils.updateStatus("배우의 전체 작품");
    } else if (isGrid) {
      this.worksView.hide();
      element("actress-bar").classList.add("hidden");
      this.actressView.show();
      this.actressView.render();
      element("actress-view").scrollTop = scroll;
      Utils.updateStatus("배우별 보기");
    } else {
      this.actressView.hide();
      this.worksView.hide();
      this.renderActressBar();
      this.fileManager.updateUI();
      element("file-list").scrollTop = scroll;
      this.virtualScroll.handleScroll();
      this.updateSortIndicators();

      if (state.duplicates) {
        this.showDuplicateStatus();
      } else if (state.actress) {
        Utils.updateStatus("선택한 배우의 영상");
      } else {
        Utils.updateStatus(
          isVideo
            ? (window.i18n ? window.i18n.t("switchedToVideo") : "비디오 파일 모드로 전환")
            : (window.i18n ? window.i18n.t("switchedToOther") : "기타 파일 모드로 전환")
        );
      }
    }

    element("nav-back").disabled = this.historyIndex <= 0;
    element("nav-forward").disabled = this.historyIndex >= this.history.length - 1;
  }

  // 선택한 배우 표시줄 (사진, 이름, 영상 수, 좋아요, 닫기)
  renderActressBar() {
    const bar = document.getElementById("actress-bar");
    const key = this.viewState.actress;
    const view = this.viewState.view;
    if (!key || (view !== "list" && view !== "works") || this.viewState.tab !== "video") {
      bar.classList.add("hidden");
      return;
    }

    const entry = this.actressView.find(key) || { key, name: "(정보 없음)", nameJa: "", image: "" };
    const liked = this.metadataManager.isLiked(key);
    const escape = (text) => Utils.escapeHtml(text || "");
    const count = this.fileManager.filteredFiles.video.length;

    bar.innerHTML =
      `<div class="actress-bar-photo"><span>${escape((entry.name || "?").charAt(0).toUpperCase())}</span><img alt="" /></div>` +
      `<div class="actress-bar-name">${escape(entry.name)}<span>${escape(entry.nameJa)}</span></div>` +
      (key === MetadataManager.UNASSIGNED
        ? `<div class="actress-bar-count">영상 ${count}개</div>`
        : `<div class="actress-bar-tabs">` +
          `<button class="actress-bar-tab${view === "list" ? " active" : ""}" data-view="list">보유 영상 ${count}</button>` +
          `<button class="actress-bar-tab${view === "works" ? " active" : ""}" data-view="works">전체 작품</button>` +
          `</div><div class="actress-bar-count"></div>`) +
      (key === MetadataManager.UNASSIGNED
        ? ""
        : `<button class="actress-bar-like${liked ? " liked" : ""}" title="좋아요">♥</button>`) +
      `<button class="actress-bar-close" title="배우 목록으로">배우 목록 ✕</button>`;
    bar.classList.remove("hidden");
    this.metadataManager.setImage(bar.querySelector("img"), entry.image);
  }

  // 영상 정보가 새로 수집됐을 때 화면 갱신
  onMetadataChanged() {
    if (!this.fileManager) return;

    if (this.viewState.view === "actresses") {
      this.actressView.render({ keepScroll: true });
      return;
    }
    if (this.viewState.view === "works") return; // 작품 화면은 저장된 목록 기준이라 그대로 둠

    // 메모를 입력하는 중이면 행을 다시 그리지 않음 (입력창이 사라지지 않도록)
    const active = document.activeElement;
    if (active && active.tagName === "INPUT" && active.closest("#file-list")) return;

    const needsRefilter =
      this.fileManager.actressFilter ||
      this.fileManager.actressQuery ||
      this.currentSort === "release";
    if (needsRefilter) {
      this.fileManager.applyFilter();
      this.fileManager.updateUI();
    } else {
      this.virtualScroll.render();
    }
    this.renderActressBar();
  }

  // 파일명/메모 경계 드래그로 두 컬럼의 폭 조절 (메모 폭을 정하고 파일명이 나머지를 차지)
  initColumnResize() {
    const list = document.getElementById("file-list");
    const resizer = document.getElementById("memo-resizer");
    const nameHeader = document.querySelector("#file-header .file-col-name");
    const memoHeader = document.querySelector("#file-header .file-col-desc");
    if (!list || !resizer || !nameHeader || !memoHeader) return;

    const MIN_WIDTH = 80;
    const applyWidth = (width) => {
      list.style.setProperty("--memo-width", `${Math.round(width)}px`);
      list.classList.add("memo-fixed");
    };

    const saved = parseInt(localStorage.getItem("app-memo-width"), 10);
    if (saved >= MIN_WIDTH) applyWidth(saved);

    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startMemo = memoHeader.getBoundingClientRect().width;
      const total = startMemo + nameHeader.getBoundingClientRect().width;
      let width = startMemo;
      document.body.classList.add("col-resizing");

      const onMove = (moveEvent) => {
        // 경계를 왼쪽으로 끌면 메모가 넓어지고 파일명이 좁아짐
        width = Math.max(MIN_WIDTH, Math.min(total - MIN_WIDTH, startMemo - (moveEvent.clientX - startX)));
        applyWidth(width);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.classList.remove("col-resizing");
        localStorage.setItem("app-memo-width", String(Math.round(width)));
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    // 경계를 놓을 때 메모 헤더의 정렬 클릭이 실행되지 않도록
    resizer.addEventListener("click", (e) => e.stopPropagation());
    // 더블클릭: 기본 비율로 되돌림
    resizer.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      list.classList.remove("memo-fixed");
      list.style.removeProperty("--memo-width");
      localStorage.removeItem("app-memo-width");
    });
  }

  // 중복 파일만 보기 켜기/끄기
  toggleDuplicateMode() {
    if (!this.fileManager) return;
    this.navigate({ duplicates: !this.viewState.duplicates });
  }

  showDuplicateStatus() {
    if (!this.fileManager) return;
    if (this.fileManager.duplicateMode) {
      const stats = this.fileManager.getDuplicateStats();
      Utils.updateStatus(
        stats.groups > 0
          ? `중복 묶음 ${stats.groups}개, 파일 ${stats.files}개 `
          : "중복 파일이 없습니다."
      );
    } else {
      Utils.updateStatus("전체 파일 보기");
    }
  }

  // 저장된 정렬 상태 불러오기
  loadSortState() {
    try {
      const saved = JSON.parse(localStorage.getItem("app-sort") || "null");
      if (saved && App.SORT_DEFAULT_DESC.hasOwnProperty(saved.sort)) {
        this.currentSort = saved.sort;
        this.isDescending = saved.desc !== false;
      }
    } catch (error) {
      // 저장값이 잘못됐으면 기본 정렬 사용
    }
  }

  saveSortState() {
    try {
      localStorage.setItem(
        "app-sort",
        JSON.stringify({ sort: this.currentSort, desc: this.isDescending })
      );
    } catch (error) {
      // 저장 실패는 무시
    }
  }

  // 컬럼 헤더의 정렬 표시(▲/▼) 갱신
  updateSortIndicators() {
    document.querySelectorAll("#file-header .sortable").forEach((header) => {
      const isActive = header.dataset.sort === this.currentSort;
      header.classList.toggle("active", isActive);
      const indicator = header.querySelector(".sort-indicator");
      if (indicator) {
        indicator.textContent = isActive ? (this.isDescending ? "▼" : "▲") : "";
      }
    });
  }

  // 정렬 처리 (컬럼 헤더 클릭): 같은 컬럼이면 방향 전환, 다른 컬럼이면 그 컬럼의 기본 방향
  handleSort(sortType) {
    if (!App.SORT_DEFAULT_DESC.hasOwnProperty(sortType)) return;

    if (this.currentSort === sortType) {
      this.isDescending = !this.isDescending;
    } else {
      this.currentSort = sortType;
      this.isDescending = App.SORT_DEFAULT_DESC[sortType];
    }

    this.updateSortIndicators();
    this.saveSortState();

    if (this.fileManager) {
      this.fileManager.sortFiles(this.currentSort, this.isDescending);
    }

    const sortedText = this.isDescending ?
      (window.i18n ? window.i18n.t('sortedDesc') : "내림차순으로 정렬됨") :
      (window.i18n ? window.i18n.t('sortedAsc') : "오름차순으로 정렬됨");
    Utils.updateStatus(`${this.getSortTypeName(sortType)} ${sortedText}`);
  }

  // 기본 정렬 적용 (앱 초기화 시)
  applyDefaultSort() {
    this.updateSortIndicators();

    if (this.fileManager) {
      this.fileManager.sortFiles(this.currentSort, this.isDescending);
    }
  }

  // 정렬 타입 한글명 반환
  getSortTypeName(sortType) {
    const sortNames = {
      name: window.i18n ? window.i18n.t('sortedByName') : "이름순",
      lasttime: window.i18n ? window.i18n.t('sortedByLastTime') : "실행시간순", 
      rating: window.i18n ? window.i18n.t('sortedByRating') : "평점순",
      addtime: window.i18n ? window.i18n.t('sortedByAddTime') : "추가시간순",
      memo: window.i18n ? window.i18n.t('sortMemo') : "메모순",
      release: window.i18n ? window.i18n.t('sortRelease') : "출시일순",
      size: window.i18n ? window.i18n.t('sortSize') : "용량순",
    };
    return sortNames[sortType] || (window.i18n ? window.i18n.t('unknownSort') : "알 수 없는 정렬");
  }

  // 파일 새로고침
  async refreshFiles() {
    if (!this.fileManager || this.fileManager.isLoading) return;

    try {
      Utils.updateStatus(window.i18n ? window.i18n.t('refreshingFiles') : "파일을 새로고침하는 중...");
      await this.fileManager.refreshFiles();
    } catch (error) {
      console.error("파일 새로고침 실패:", error);
      this.showErrorMessage(window.i18n ? window.i18n.t('refreshFailed') : "파일 새로고침에 실패했습니다.");
    }
  }

  // 파일 정리
  async cleanupFiles() {
    if (!this.fileManager || this.fileManager.isLoading) return;

    const confirmed = confirm(
      window.i18n ? window.i18n.t('cleanupConfirm') : 
      "다음 작업을 수행합니다:\n" +
        "• 중복 파일 항목 제거\n" +
        "• 빈폴더 제거\n" +
        "• 존재하지 않는 파일 정리\n" +
        "\n계속하시겠습니까?"
    );

    if (confirmed) {
      try {
        await this.fileManager.cleanup();
      } catch (error) {
        console.error("파일 정리 실패:", error);
        this.showErrorMessage(window.i18n ? window.i18n.t('cleanupFailed') : "파일 정리에 실패했습니다.");
      }
    }
  }

  // 데이터 백업
  async backupData() {
    const confirmed = confirm(
      window.i18n ? window.i18n.t('backupConfirm') : 
      "Data 폴더를 백업하시겠습니까?\n현재 시간으로 파일명이 생성됩니다."
    );

    if (!confirmed) return;

    try {
      Utils.updateStatus(window.i18n ? window.i18n.t('backupInProgress') : "데이터를 백업하는 중...");
      
      const result = await window.electronAPI.invoke('backup-data');
      
      if (result.success) {
        Utils.updateStatus(window.i18n ? window.i18n.t('backupComplete') : "백업 완료");
        alert(result.message);
      } else {
        Utils.updateStatus(window.i18n ? window.i18n.t('backupFailed') : "백업 실패");
        if (result.message !== '사용자가 취소했습니다.') {
          this.showErrorMessage(result.message);
        }
      }
    } catch (error) {
      console.error("백업 실패:", error);
      Utils.updateStatus(window.i18n ? window.i18n.t('backupFailed') : "백업 실패");
      this.showErrorMessage(window.i18n ? window.i18n.t('backupFailed') : "백업에 실패했습니다.");
    }
  }

  // 키보드 단축키 처리
  handleKeyboardShortcuts(e) {
    // Alt+←/→: 뒤로/앞으로
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      this.goHistory(e.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    // Ctrl/Cmd 키 조합
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          this.focusSearch();
          break;
        case "r":
          e.preventDefault();
          this.refreshFiles();
          break;
        case "1":
          e.preventDefault();
          this.switchTab("video");
          break;
        case "2":
          e.preventDefault();
          this.switchTab("file");
          break;
        case "l":
          e.preventDefault();
          this.libraryManager.showModal();
          break;
      }
    }

    // F 키들
    switch (e.key) {
      case "F5":
        e.preventDefault();
        this.refreshFiles();
        break;
    }
  }

  // 검색 입력 포커스
  focusSearch() {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  // 에러 메시지 표시
  showErrorMessage(message) {
    // 간단한 에러 표시 (향후 토스트 알림으로 개선 가능)
    alert(message);
    Utils.updateStatus(window.i18n ? window.i18n.t('errorOccurred') : "오류 발생");
  }

  // 정보 메시지 표시
  showInfoMessage(message) {
    Utils.updateStatus(message);
  }

  // 앱 상태 반환
  getAppState() {
    return {
      isInitialized: this.isInitialized,
      currentTab: this.currentTab,
      fileCount: this.fileManager
        ? this.fileManager.getCurrentFiles().length
        : 0,
      libraryCount: this.libraryManager
        ? this.libraryManager.getLibraries().length
        : 0,
      searchQuery: this.searchEngine
        ? this.searchEngine.searchInput?.value || ""
        : "",
    };
  }

  // 리소스 정리
  cleanup() {
    if (this.virtualScroll) {
      this.virtualScroll.destroy();
    }

    // 검색 기록 저장
    if (this.searchEngine) {
      this.searchEngine.saveSearchHistory();
    }

    console.log("앱 리소스 정리 완료");
  }

  // 다국어 시스템 초기화
  initI18n() {
    if (window.i18n) {
      // 언어 토글 버튼 이벤트 리스너
      const languageToggle = document.getElementById('language-toggle');
      if (languageToggle) {
        // 현재 언어에 따라 토글 상태 설정
        languageToggle.checked = window.i18n.getCurrentLanguage() === 'en';
        
        languageToggle.addEventListener('change', (e) => {
          const newLang = e.target.checked ? 'en' : 'ko';
          window.i18n.setLanguage(newLang);
        });
      }

      // 초기화
      window.i18n.init();
    }
  }

  // 디버그 정보 출력
  debug() {
    console.group("Baseball Video Manager Debug Info");
    console.log("App State:", this.getAppState());

    if (this.fileManager) {
      console.log("File Manager:", {
        videoFiles: this.fileManager.allFiles.video.length,
        otherFiles: this.fileManager.allFiles.file.length,
        filteredFiles: this.fileManager.getCurrentFiles().length,
        currentTab: this.fileManager.currentTab,
        isLoading: this.fileManager.isLoading,
      });
    }

    if (this.libraryManager) {
      console.log("Library Manager:", this.libraryManager.getLibraryStats());
    }

    if (this.searchEngine) {
      console.log("Search Engine:", this.searchEngine.getSearchStats());
    }

    if (this.virtualScroll) {
      console.log("Virtual Scroll:", this.virtualScroll.getVisibleRange());
    }

    console.groupEnd();
  }

  // =================== 동기화 설정 ===================

  async openSyncSettings() {
    const modal = document.getElementById("sync-modal");
    const repoInput = document.getElementById("sync-repo-input");
    const tokenInput = document.getElementById("sync-token-input");
    const statusEl = document.getElementById("sync-status");
    const disconnectBtn = document.getElementById("sync-disconnect-btn");

    // 기존 설정 로드
    const settings = await window.electronAPI.invoke("sync-load-settings");
    const syncStatus = await window.electronAPI.invoke("sync-get-status");

    repoInput.value = settings.repoUrl || "";
    tokenInput.value = "";
    tokenInput.placeholder = settings.hasToken ? settings.tokenMasked : "ghp_xxxxxxxxxxxx";

    // 상태 표시
    if (syncStatus.isActive && !syncStatus.lastError) {
      statusEl.className = "sync-status connected";
      statusEl.textContent = window.i18n ? window.i18n.t("syncConnected") : "동기화 연결됨 - 자동 백업 활성";
      disconnectBtn.style.display = "";
    } else if (syncStatus.isActive && syncStatus.lastError) {
      statusEl.className = "sync-status error";
      statusEl.textContent = `동기화 활성 (마지막 오류: ${syncStatus.lastError})`;
      disconnectBtn.style.display = "";
    } else if (settings.hasToken) {
      statusEl.className = "sync-status error";
      const errDetail = syncStatus.lastError ? `: ${syncStatus.lastError}` : "";
      statusEl.textContent = `연결 실패${errDetail}`;
      disconnectBtn.style.display = "";
    } else {
      statusEl.className = "sync-status disconnected";
      statusEl.textContent = window.i18n ? window.i18n.t("syncNotConfigured") : "동기화가 설정되지 않았습니다";
      disconnectBtn.style.display = "none";
    }

    // 자동 싱크 체크박스 초기값
    document.getElementById("sync-auto-checkbox").checked = syncStatus.autoSync === true;

    // 업로드/다운로드 버튼은 설정이 있을 때만 활성화
    document.getElementById("sync-upload-btn").disabled = !settings.hasToken;
    document.getElementById("sync-download-btn").disabled = !settings.hasToken;

    modal.classList.remove("hidden");

    this.setupSyncModalEvents();
  }

  setupSyncModalEvents() {
    const modal = document.getElementById("sync-modal");
    const closeBtn = document.getElementById("close-sync-modal");
    const cancelBtn = document.getElementById("sync-cancel-btn");
    const saveBtn = document.getElementById("sync-save-btn");
    const testBtn = document.getElementById("sync-test-btn");
    const disconnectBtn = document.getElementById("sync-disconnect-btn");
    const tokenToggle = document.getElementById("sync-token-toggle");
    const tokenInput = document.getElementById("sync-token-input");

    const openDataBtn = document.getElementById("sync-open-data-btn");

    const closeModal = () => modal.classList.add("hidden");

    // 데이터 폴더 열기
    openDataBtn.onclick = async () => {
      const dataPath = await window.electronAPI.invoke("get-data-path");
      await window.electronAPI.invoke("open-file", dataPath);
    };

    // 기존 리스너 제거를 위해 새 리스너로 교체
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    // 토큰 보기/숨기기
    tokenToggle.onclick = () => {
      tokenInput.type = tokenInput.type === "password" ? "text" : "password";
    };

    // 연결 테스트
    testBtn.onclick = async () => {
      const repoUrl = document.getElementById("sync-repo-input").value.trim();
      const token = tokenInput.value.trim();
      const statusEl = document.getElementById("sync-status");

      if (!repoUrl || !token) {
        statusEl.className = "sync-status error";
        statusEl.textContent = window.i18n ? window.i18n.t("syncFillAll") : "저장소 URL과 토큰을 모두 입력하세요";
        return;
      }

      statusEl.className = "sync-status testing";
      statusEl.textContent = window.i18n ? window.i18n.t("syncTesting") : "연결 테스트 중...";

      const result = await window.electronAPI.invoke("sync-test", { repoUrl, token });

      if (result.success) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = window.i18n ? window.i18n.t("syncTestSuccess") : "연결 성공! 저장을 눌러 적용하세요.";
      } else {
        statusEl.className = "sync-status error";
        statusEl.textContent = result.error;
      }
    };

    // 저장
    saveBtn.onclick = async () => {
      const repoUrl = document.getElementById("sync-repo-input").value.trim();
      const token = tokenInput.value.trim();
      const statusEl = document.getElementById("sync-status");

      if (!repoUrl) {
        statusEl.className = "sync-status error";
        statusEl.textContent = window.i18n ? window.i18n.t("syncNeedRepo") : "저장소 URL을 입력하세요";
        return;
      }

      if (!token) {
        const existing = await window.electronAPI.invoke("sync-load-settings");
        if (!existing.hasToken) {
          statusEl.className = "sync-status error";
          statusEl.textContent = window.i18n ? window.i18n.t("syncNeedToken") : "토큰을 입력하세요";
          return;
        }
        statusEl.className = "sync-status error";
        statusEl.textContent = window.i18n ? window.i18n.t("syncNeedToken") : "새 설정 저장 시 토큰을 다시 입력하세요";
        return;
      }

      // 설정 저장 (업로드/다운로드는 별도 버튼으로)
      statusEl.className = "sync-status testing";
      statusEl.textContent = "설정 저장 중...";

      const result = await window.electronAPI.invoke("sync-save-settings", { repoUrl, token });

      if (result.success) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = "저장 완료! 업로드 또는 다운로드 버튼을 눌러 동기화하세요.";
        this.updateSyncButton(true);
        // 업로드/다운로드 버튼 즉시 활성화
        document.getElementById("sync-upload-btn").disabled = false;
        document.getElementById("sync-download-btn").disabled = false;
        document.getElementById("sync-disconnect-btn").style.display = "";
      } else {
        statusEl.className = "sync-status error";
        statusEl.textContent = result.error;
      }
    };

    // 연결 해제
    disconnectBtn.onclick = async () => {
      if (!confirm(window.i18n ? window.i18n.t("syncDisconnectConfirm") : "동기화 연결을 해제하시겠습니까?\n원격 저장소의 백업은 유지됩니다.")) {
        return;
      }

      const result = await window.electronAPI.invoke("sync-disconnect");
      if (result.success) {
        const statusEl = document.getElementById("sync-status");
        statusEl.className = "sync-status disconnected";
        statusEl.textContent = window.i18n ? window.i18n.t("syncDisconnected") : "동기화 연결이 해제되었습니다";
        document.getElementById("sync-repo-input").value = "";
        tokenInput.value = "";
        tokenInput.placeholder = "ghp_xxxxxxxxxxxx";
        disconnectBtn.style.display = "none";
        document.getElementById("sync-auto-checkbox").checked = false;
        this.updateSyncButton(false);
        Utils.updateStatus(window.i18n ? window.i18n.t("syncDeactivated") : "Git 동기화 비활성화됨");
      }
    };

    // 자동 싱크 체크박스
    const autoCheckbox = document.getElementById("sync-auto-checkbox");
    autoCheckbox.onchange = async () => {
      await window.electronAPI.invoke("sync-set-auto", autoCheckbox.checked);
      const statusEl = document.getElementById("sync-status");
      if (autoCheckbox.checked) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = "자동 동기화 활성화됨";
      } else {
        statusEl.className = "sync-status connected";
        statusEl.textContent = "자동 동기화 비활성화 (수동 업로드/다운로드 가능)";
      }
    };

    // 강제 업로드
    const uploadBtn = document.getElementById("sync-upload-btn");
    uploadBtn.onclick = async () => {
      const statusEl = document.getElementById("sync-status");

      if (!confirm("현재 로컬 데이터를 Git에 업로드합니다.\n원격 데이터가 덮어씌워집니다. 계속하시겠습니까?")) {
        return;
      }

      statusEl.className = "sync-status testing";
      statusEl.textContent = "업로드 중...";

      const result = await window.electronAPI.invoke("sync-force-upload");

      if (result.success) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = "업로드 완료!";
      } else {
        statusEl.className = "sync-status error";
        statusEl.textContent = "업로드 실패: " + (result.error || "알 수 없는 오류");
      }
    };

    // 강제 다운로드
    const downloadBtn = document.getElementById("sync-download-btn");
    downloadBtn.onclick = async () => {
      const statusEl = document.getElementById("sync-status");

      if (!confirm("Git에서 데이터를 가져와 로컬 데이터를 덮어씁니다.\n현재 로컬 데이터가 사라집니다. 계속하시겠습니까?")) {
        return;
      }

      statusEl.className = "sync-status testing";
      statusEl.textContent = "다운로드 중...";

      const result = await window.electronAPI.invoke("sync-force-download");

      if (result.success) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = "다운로드 완료! 앱을 새로고침합니다.";
        setTimeout(() => location.reload(), 1500);
      } else {
        statusEl.className = "sync-status error";
        statusEl.textContent = "다운로드 실패: " + (result.error || "알 수 없는 오류");
      }
    };
  }

  updateSyncButton(isActive) {
    const btn = document.getElementById("sync-settings-btn");
    if (isActive) {
      btn.classList.add("synced");
      btn.classList.remove("not-synced");
    } else {
      btn.classList.remove("synced");
      btn.classList.add("not-synced");
    }
  }

  async initSyncButtonState() {
    const status = await window.electronAPI.invoke("sync-get-status");
    this.updateSyncButton(status.isActive);
  }
}

// 전역 앱 인스턴스 생성
window.app = new App();

// DOM 로딩 완료 후 앱 초기화
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});

// 개발자 도구용 전역 함수들
window.debugApp = () => window.app.debug();
window.refreshApp = () => window.app.refreshFiles();
window.cleanupApp = () => window.app.cleanupFiles();

// 성능 모니터링 (개발 모드에서만)
if (process && process.argv && process.argv.includes("--dev")) {
  // 메모리 사용량 모니터링
  setInterval(() => {
    if (performance.memory) {
      const memory = performance.memory;
      console.log("메모리 사용량:", {
        used: Math.round(memory.usedJSHeapSize / 1048576) + "MB",
        total: Math.round(memory.totalJSHeapSize / 1048576) + "MB",
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + "MB",
      });
    }
  }, 30000); // 30초마다 출력
}
