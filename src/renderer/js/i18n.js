// 다국어 지원 시스템
class I18n {
  constructor() {
    this.currentLanguage = 'ko';
    this.listeners = [];
    this.translations = {
      ko: {
        // 앱 제목 및 헤더
        appTitle: 'Baseball Video Manager',
        dataBackup: '데이터 백업',
        extensionManagement: '확장자 관리',
        refresh: '새로고침',
        libraryManagement: '라이브러리 관리',
        cleanup: '정리',
        
        // 검색 및 정렬
        searchPlaceholder: '파일명으로 검색...',
        filesCount: '개 파일',
        sortAddTime: '추가시간순',
        sortLastTime: '실행시간순',
        sortRating: '평점순',
        sortName: '이름순',
        descending: '내림차순',
        ascending: '오름차순',
        
        // 탭
        videoFiles: '비디오 파일',
        otherFiles: '기타 파일',
        
        // 파일 정보
        addTime: '추가시각:',
        lastTime: '실행시각:',
        fileSize: '크기:',
        filePath: '경로:',
        
        // 상태 메시지
        ready: '준비됨',
        initializing: '애플리케이션을 초기화하는 중...',
        initializationComplete: 'Baseball Video Manager 초기화 완료',
        initializationFailed: '초기화 실패',
        loadingFiles: '파일 데이터를 로딩하는 중...',
        refreshingFiles: '파일을 새로고침하는 중...',
        synchronizing: '라이브러리와 동기화하는 중...',
        processing: '처리 중...',
        scanningFolder: '스캔 중...',
        cleaningFiles: '파일을 정리하는 중...',
        cleanupComplete: '정리 완료',
        cleanupFailed: '파일 정리에 실패했습니다.',
        refreshComplete: '새로고침 완료',
        refreshFailed: '파일 새로고침에 실패했습니다.',
        
        // 정렬 메시지
        sortedByName: '이름순',
        sortedByLastTime: '실행시간순',
        sortedByRating: '평점순',
        sortedByAddTime: '추가시간순',
        sortedDesc: '내림차순으로 정렬됨',
        sortedAsc: '오름차순으로 정렬됨',
        resortedDesc: '내림차순으로 재정렬됨',
        resortedAsc: '오름차순으로 재정렬됨',
        
        // 탭 전환
        switchedToVideo: '비디오 파일 모드로 전환',
        switchedToOther: '기타 파일 모드로 전환',
        
        // 라이브러리 관리 모달
        libraryManagementTitle: '라이브러리 관리',
        addFolder: '폴더 추가',
        removeSelected: '선택 삭제',
        openDataFolder: '데이터 폴더 열기',
        openDataFolderTooltip: '데이터 폴더(/data)를 파일 탐색기에서 열기',
        save: '저장',
        cancel: '취소',
        
        // 정리 확인 메시지
        cleanupConfirm: '다음 작업을 수행합니다:\n• 중복 파일 항목 제거\n• 빈폴더 제거\n• 존재하지 않는 파일 정리\n\n계속하시겠습니까?',
        
        // 백업 관련 메시지
        backupInProgress: '데이터를 백업하는 중...',
        backupComplete: '백업 완료',
        backupFailed: '백업에 실패했습니다.',
        backupConfirm: 'Data 폴더를 백업하시겠습니까?\n현재 시간으로 파일명이 생성됩니다.',
        
        // 확장자 관리 관련
        extensionManagementTitle: '확장자 관리',
        videoExtensions: '비디오 파일 확장자',
        otherExtensions: '기타 파일 확장자',
        add: '추가',
        remove: '삭제',
        resetToDefault: '기본값으로 초기화',
        extensionExists: '이미 존재하는 확장자입니다.',
        invalidExtension: '올바른 확장자 형식이 아닙니다. (예: .mp4)',
        extensionAdded: '확장자가 추가되었습니다.',
        extensionRemoved: '확장자가 제거되었습니다.',
        extensionsReset: '확장자 설정이 기본값으로 초기화되었습니다.',
        extensionsSaved: '확장자 설정이 저장되었습니다.',
        extensionSaveFailed: '확장자 설정 저장에 실패했습니다.',
        resetExtensionsConfirm: '확장자 설정을 기본값으로 초기화하시겠습니까?\n현재 설정은 모두 삭제됩니다.',
        
        // 에러 메시지
        initError: '애플리케이션 초기화에 실패했습니다: ',
        errorOccurred: '오류 발생',
        
        // 확장자 정보
        extensions: '확장자: .avi, .mp4, .mov, .wmv, .mkv, .flv, .ts'
      },
      
      en: {
        // App title and header
        appTitle: 'Baseball Video Manager',
        dataBackup: 'Data Backup',
        extensionManagement: 'Extension Management',
        refresh: 'Refresh',
        libraryManagement: 'Library Management',
        cleanup: 'Cleanup',
        
        // Search and sorting
        searchPlaceholder: 'Search by filename...',
        filesCount: 'files',
        sortAddTime: 'Add Time',
        sortLastTime: 'Last Time',
        sortRating: 'Rating',
        sortName: 'Name',
        descending: 'Descending',
        ascending: 'Ascending',
        
        // Tabs
        videoFiles: 'Video Files',
        otherFiles: 'Other Files',
        
        // File info
        addTime: 'Added:',
        lastTime: 'Last Run:',
        fileSize: 'Size:',
        filePath: 'Path:',
        
        // Status messages
        ready: 'Ready',
        initializing: 'Initializing application...',
        initializationComplete: 'Baseball Video Manager initialization complete',
        initializationFailed: 'Initialization failed',
        loadingFiles: 'Loading file data...',
        refreshingFiles: 'Refreshing files...',
        synchronizing: 'Synchronizing with library...',
        processing: 'Processing...',
        scanningFolder: 'Scanning...',
        cleaningFiles: 'Cleaning files...',
        cleanupComplete: 'Cleanup complete',
        cleanupFailed: 'Failed to cleanup files.',
        refreshComplete: 'Refresh complete',
        refreshFailed: 'Failed to refresh files.',
        
        // Sort messages
        sortedByName: 'by Name',
        sortedByLastTime: 'by Last Time',
        sortedByRating: 'by Rating',
        sortedByAddTime: 'by Add Time',
        sortedDesc: 'sorted in descending order',
        sortedAsc: 'sorted in ascending order',
        resortedDesc: 'resorted in descending order',
        resortedAsc: 'resorted in ascending order',
        
        // Tab switching
        switchedToVideo: 'Switched to video file mode',
        switchedToOther: 'Switched to other file mode',
        
        // Library management modal
        libraryManagementTitle: 'Library Management',
        addFolder: 'Add Folder',
        removeSelected: 'Remove Selected',
        openDataFolder: 'Open Data Folder',
        openDataFolderTooltip: 'Open data folder (/data) in file explorer',
        save: 'Save',
        cancel: 'Cancel',
        
        // Cleanup confirmation
        cleanupConfirm: 'The following actions will be performed:\n• Remove duplicate file entries\n• Remove empty folders\n• Clean non-existent files\n\nDo you want to continue?',
        
        // Backup related messages
        backupInProgress: 'Backing up data...',
        backupComplete: 'Backup complete',
        backupFailed: 'Backup failed.',
        backupConfirm: 'Do you want to backup the Data folder?\nFilename will be generated with current timestamp.',
        
        // Extension management related
        extensionManagementTitle: 'Extension Management',
        videoExtensions: 'Video File Extensions',
        otherExtensions: 'Other File Extensions',
        add: 'Add',
        remove: 'Remove',
        resetToDefault: 'Reset to Default',
        extensionExists: 'Extension already exists.',
        invalidExtension: 'Invalid extension format. (e.g., .mp4)',
        extensionAdded: 'Extension has been added.',
        extensionRemoved: 'Extension has been removed.',
        extensionsReset: 'Extension settings have been reset to default.',
        extensionsSaved: 'Extension settings have been saved.',
        extensionSaveFailed: 'Failed to save extension settings.',
        resetExtensionsConfirm: 'Do you want to reset extension settings to default?\nAll current settings will be deleted.',
        
        // Error messages
        initError: 'Failed to initialize application: ',
        errorOccurred: 'Error occurred',
        
        // Extensions info
        extensions: 'Extensions: .avi, .mp4, .mov, .wmv, .mkv, .flv, .ts'
      }
    };
    
    this.loadLanguage();
  }

  // 언어 설정 로드
  loadLanguage() {
    const saved = localStorage.getItem('app-language');
    if (saved && this.translations[saved]) {
      this.currentLanguage = saved;
    }
  }

  // 언어 설정 저장
  saveLanguage() {
    localStorage.setItem('app-language', this.currentLanguage);
  }

  // 언어 변경
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      this.saveLanguage();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // 현재 언어 반환
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // 번역 텍스트 반환
  t(key, params = {}) {
    const translation = this.translations[this.currentLanguage][key] || key;
    
    // 매개변수 치환
    let result = translation;
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return result;
  }

  // 언어 변경 리스너 등록
  addListener(callback) {
    this.listeners.push(callback);
  }

  // 언어 변경 리스너 제거
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 모든 리스너에게 언어 변경 알림
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentLanguage);
      } catch (error) {
        console.error('Error in i18n listener:', error);
      }
    });
  }

  // 언어 토글 (한국어 ↔ 영어)
  toggle() {
    const newLang = this.currentLanguage === 'ko' ? 'en' : 'ko';
    this.setLanguage(newLang);
  }

  // 모든 번역 가능한 요소 업데이트
  updateDOM() {
    // data-i18n 속성을 가진 모든 요소 업데이트
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // data-i18n-title 속성을 가진 모든 요소의 title 업데이트
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });
  }

  // 초기화 (DOM 로딩 후 호출)
  init() {
    this.addListener(() => {
      this.updateDOM();
    });
    
    // 페이지 로딩 시 초기 번역 적용
    this.updateDOM();
  }
}

// 전역 인스턴스 생성
window.i18n = new I18n();