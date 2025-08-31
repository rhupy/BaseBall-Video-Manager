// 메인 애플리케이션 클래스
class App {
  constructor() {
    this.fileManager = null;
    this.virtualScroll = null;
    this.libraryManager = null;
    this.searchEngine = null;
    this.currentTab = "video";
    this.isInitialized = false;
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
  }

  // 이벤트 리스너 설정
  initEventListeners() {
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
    }

    Utils.updateStatus(
      `${tabName === "video" ? "비디오" : "기타"} 파일 모드로 전환`
    );
  }

  // 정렬 처리
  handleSort(sortType) {
    // 정렬 버튼 상태 업데이트
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-sort="${sortType}"]`).classList.add("active");

    // 파일 매니저에 정렬 요청
    if (this.fileManager) {
      this.fileManager.sortFiles(sortType);
    }

    Utils.updateStatus(`${this.getSortTypeName(sortType)}으로 정렬됨`);
  }

  // 정렬 타입 한글명 반환
  getSortTypeName(sortType) {
    const sortNames = {
      default: "기본 순서",
      name: "이름순",
      lasttime: "실행시간순",
      rating: "평점순",
      addtime: "추가시간순",
    };
    return sortNames[sortType] || "알 수 없는 정렬";
  }

  // 파일 새로고침
  async refreshFiles() {
    if (!this.fileManager || this.fileManager.isLoading) return;

    try {
      Utils.updateStatus("파일을 새로고침하는 중...");
      await this.fileManager.refreshFiles();
    } catch (error) {
      console.error("파일 새로고침 실패:", error);
      this.showErrorMessage("파일 새로고침에 실패했습니다.");
    }
  }

  // 파일 정리
  async cleanupFiles() {
    if (!this.fileManager || this.fileManager.isLoading) return;

    const confirmed = confirm(
      "다음 작업을 수행합니다:\n" +
        "• 중복 파일 항목 제거\n" +
        "• 존재하지 않는 파일 정리\n" +
        "\n계속하시겠습니까?"
    );

    if (confirmed) {
      try {
        await this.fileManager.cleanup();
      } catch (error) {
        console.error("파일 정리 실패:", error);
        this.showErrorMessage("파일 정리에 실패했습니다.");
      }
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
    Utils.updateStatus("오류 발생");
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
