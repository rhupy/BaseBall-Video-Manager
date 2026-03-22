// 메인 애플리케이션 클래스
class App {
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
        };
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

      // 초기화 완료 후 프로그래스바 숨김 (하이브리드 시스템의 경우 실시간 감시만 활성)
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

    // 정렬 버튼들
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const sortType = e.target.dataset.sort;
        this.handleSort(sortType);
      });
    });

    // 정렬 방향 토글
    document.getElementById("sort-direction-toggle").addEventListener("change", (e) => {
      this.handleSortDirectionChange(e.target.checked);
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
  }

  // 탭 전환
  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    this.currentTab = tabName;

    // 탭 버튼 상태 업데이트
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // 파일 매니저에 탭 변경 알림
    if (this.fileManager) {
      this.fileManager.switchTab(tabName);
      // 탭 전환 후 현재 정렬 유지
      this.fileManager.sortFiles(this.currentSort, this.isDescending);
    }

    const message = tabName === "video" ? 
      (window.i18n ? window.i18n.t('switchedToVideo') : "비디오 파일 모드로 전환") :
      (window.i18n ? window.i18n.t('switchedToOther') : "기타 파일 모드로 전환");
    Utils.updateStatus(message);
  }

  // 정렬 처리
  handleSort(sortType) {
    this.currentSort = sortType;
    
    // 정렬 버튼 상태 업데이트
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-sort="${sortType}"]`).classList.add("active");

    // 파일 매니저에 정렬 요청 (방향 포함)
    if (this.fileManager) {
      this.fileManager.sortFiles(sortType, this.isDescending);
    }

    const directionText = this.isDescending ? 
      (window.i18n ? window.i18n.t('descending') : "내림차순") : 
      (window.i18n ? window.i18n.t('ascending') : "오름차순");
    const sortedText = this.isDescending ?
      (window.i18n ? window.i18n.t('sortedDesc') : "으로 정렬됨") :
      (window.i18n ? window.i18n.t('sortedAsc') : "으로 정렬됨");
    Utils.updateStatus(`${this.getSortTypeName(sortType)} ${sortedText}`);
  }

  // 정렬 방향 변경 처리
  handleSortDirectionChange(isDescending) {
    this.isDescending = isDescending;
    
    // 라벨 업데이트
    const label = document.querySelector(".sort-direction-label");
    if (label) {
      const labelText = isDescending ? 
        (window.i18n ? window.i18n.t('descending') : "내림차순") : 
        (window.i18n ? window.i18n.t('ascending') : "오름차순");
      label.textContent = labelText;
    }
    
    // 현재 정렬이 있으면 재정렬
    if (this.fileManager) {
      this.fileManager.sortFiles(this.currentSort, this.isDescending);
      
      const resortedText = this.isDescending ?
        (window.i18n ? window.i18n.t('resortedDesc') : "내림차순으로 재정렬됨") :
        (window.i18n ? window.i18n.t('resortedAsc') : "오름차순으로 재정렬됨");
      Utils.updateStatus(`${this.getSortTypeName(this.currentSort)} ${resortedText}`);
    }
  }

  // 기본 정렬 적용 (앱 초기화 시)
  applyDefaultSort() {
    // UI 버튼 상태 업데이트
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-sort="${this.currentSort}"]`).classList.add("active");
    
    // 기본 정렬 적용
    if (this.fileManager) {
      this.fileManager.sortFiles(this.currentSort, this.isDescending);
    }
    
    const directionLog = this.isDescending ? 
      (window.i18n ? window.i18n.t('descending') : '내림차순') : 
      (window.i18n ? window.i18n.t('ascending') : '오름차순');
    console.log(`기본 정렬 적용: ${this.getSortTypeName(this.currentSort)} ${directionLog}`);
  }

  // 정렬 타입 한글명 반환
  getSortTypeName(sortType) {
    const sortNames = {
      name: window.i18n ? window.i18n.t('sortedByName') : "이름순",
      lasttime: window.i18n ? window.i18n.t('sortedByLastTime') : "실행시간순", 
      rating: window.i18n ? window.i18n.t('sortedByRating') : "평점순",
      addtime: window.i18n ? window.i18n.t('sortedByAddTime') : "추가시간순",
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

      // 언어 변경 시 정렬 방향 라벨 업데이트
      window.i18n.addListener(() => {
        const label = document.querySelector(".sort-direction-label");
        if (label) {
          const labelText = this.isDescending ? 
            window.i18n.t('descending') : 
            window.i18n.t('ascending');
          label.textContent = labelText;
        }
      });

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
    if (syncStatus.isActive) {
      statusEl.className = "sync-status connected";
      statusEl.textContent = window.i18n ? window.i18n.t("syncConnected") : "동기화 연결됨 - 자동 백업 활성";
      disconnectBtn.style.display = "";
    } else if (settings.hasToken) {
      statusEl.className = "sync-status error";
      statusEl.textContent = window.i18n ? window.i18n.t("syncError") : "설정은 있지만 연결 실패";
      disconnectBtn.style.display = "";
    } else {
      statusEl.className = "sync-status disconnected";
      statusEl.textContent = window.i18n ? window.i18n.t("syncNotConfigured") : "동기화가 설정되지 않았습니다";
      disconnectBtn.style.display = "none";
    }

    modal.classList.remove("hidden");

    // 이벤트 리스너 (중복 방지를 위해 clone)
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

    const closeModal = () => modal.classList.add("hidden");

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

      // 토큰이 비어있으면 기존 토큰 유지
      if (!token) {
        const existing = await window.electronAPI.invoke("sync-load-settings");
        if (!existing.hasToken) {
          statusEl.className = "sync-status error";
          statusEl.textContent = window.i18n ? window.i18n.t("syncNeedToken") : "토큰을 입력하세요";
          return;
        }
        // 기존 토큰으로 레포 URL만 업데이트
        // 이 경우 기존 설정 파일을 직접 수정해야 하므로 풀 토큰 필요
        statusEl.className = "sync-status error";
        statusEl.textContent = window.i18n ? window.i18n.t("syncNeedToken") : "새 설정 저장 시 토큰을 다시 입력하세요";
        return;
      }

      const result = await window.electronAPI.invoke("sync-save-settings", { repoUrl, token });

      if (result.success) {
        statusEl.className = "sync-status connected";
        statusEl.textContent = window.i18n ? window.i18n.t("syncSaved") : "저장 완료! 자동 동기화가 활성화되었습니다.";
        this.updateSyncButton(true);
        Utils.updateStatus(window.i18n ? window.i18n.t("syncActivated") : "Git 동기화 활성화됨");
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
        this.updateSyncButton(false);
        Utils.updateStatus(window.i18n ? window.i18n.t("syncDeactivated") : "Git 동기화 비활성화됨");
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
