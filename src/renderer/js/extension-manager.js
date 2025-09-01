// 확장자 관리 클래스
class ExtensionManager {
  constructor() {
    this.modal = null;
    this.currentExtensions = {
      video: [],
      other: []
    };
    
    // 기본 확장자 설정
    this.defaultExtensions = {
      video: ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp', '.3gp', '.3g2', '.asf', '.dv', '.m2v', '.m4v', '.mpg', '.mpeg', '.mpv', '.qt', '.rm', '.rmvb', '.vob', '.webm', '.ogv'],
      other: ['.zip', '.7z', '.ezc', '.alzip', '.001', '.zpaq', '.rar', '.tar', '.gz', '.bz2', '.xz']
    };
  }

  // 초기화
  async init() {
    this.modal = document.getElementById('extensions-modal');
    await this.loadExtensions();
    this.initEventListeners();
    this.renderExtensions();
  }

  // 이벤트 리스너 초기화
  initEventListeners() {
    // 모달 열기/닫기
    document.getElementById('extensions-btn').addEventListener('click', () => {
      this.showModal();
    });

    document.getElementById('close-extensions-modal').addEventListener('click', () => {
      this.hideModal();
    });

    // 비디오 확장자 추가
    document.getElementById('add-video-extension').addEventListener('click', () => {
      this.addExtension('video');
    });

    document.getElementById('video-extension-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addExtension('video');
      }
    });

    // 기타 확장자 추가
    document.getElementById('add-other-extension').addEventListener('click', () => {
      this.addExtension('other');
    });

    document.getElementById('other-extension-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addExtension('other');
      }
    });

    // 기본값 초기화
    document.getElementById('reset-extensions').addEventListener('click', () => {
      this.resetToDefault();
    });

    // 저장/취소
    document.getElementById('save-extensions').addEventListener('click', () => {
      this.saveExtensions();
    });

    document.getElementById('cancel-extensions').addEventListener('click', () => {
      this.cancelChanges();
    });

    // 모달 바깥 클릭 시 닫기
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });
  }

  // 확장자 설정 로드
  async loadExtensions() {
    try {
      // 먼저 data 폴더의 JSON 파일에서 로드 시도
      const result = await window.electronAPI.invoke('load-json-file', CONSTANTS.PATHS.EXTENSIONS);
      
      if (result.success && result.data) {
        this.currentExtensions = {
          video: result.data.video || [...this.defaultExtensions.video],
          other: result.data.other || [...this.defaultExtensions.other]
        };
        console.log('확장자 설정을 data/extensions.json에서 로드했습니다.');
      } else {
        // JSON 파일이 없으면 localStorage에서 마이그레이션 시도
        await this.migrateFromLocalStorage();
      }
    } catch (error) {
      console.error('확장자 설정 로드 실패:', error);
      // 오류 발생 시 기본값 사용
      this.currentExtensions = {
        video: [...this.defaultExtensions.video],
        other: [...this.defaultExtensions.other]
      };
      // 기본값으로 JSON 파일 생성
      await this.saveExtensionsToFile();
    }
  }

  // localStorage에서 JSON 파일로 마이그레이션
  async migrateFromLocalStorage() {
    try {
      const saved = localStorage.getItem('app-extensions');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentExtensions = {
          video: parsed.video || [...this.defaultExtensions.video],
          other: parsed.other || [...this.defaultExtensions.other]
        };
        
        // JSON 파일로 저장
        await this.saveExtensionsToFile();
        
        // localStorage 데이터 제거 (마이그레이션 완료)
        localStorage.removeItem('app-extensions');
        
        console.log('확장자 설정을 localStorage에서 JSON 파일로 마이그레이션했습니다.');
      } else {
        // localStorage에도 데이터가 없으면 기본값 사용
        this.currentExtensions = {
          video: [...this.defaultExtensions.video],
          other: [...this.defaultExtensions.other]
        };
        await this.saveExtensionsToFile();
      }
    } catch (error) {
      console.error('localStorage 마이그레이션 실패:', error);
      this.currentExtensions = {
        video: [...this.defaultExtensions.video],
        other: [...this.defaultExtensions.other]
      };
    }
  }

  // 확장자 설정 저장
  async saveExtensions() {
    try {
      await this.saveExtensionsToFile();
      
      // CONSTANTS 업데이트
      window.CONSTANTS.EXTENSIONS.VIDEO = [...this.currentExtensions.video];
      window.CONSTANTS.EXTENSIONS.FILE = [...this.currentExtensions.other];
      
      // 파일 매니저에 변경 알림
      if (window.app && window.app.fileManager) {
        window.app.fileManager.onExtensionsChanged();
      }
      
      this.hideModal();
      
      const message = window.i18n ? window.i18n.t('extensionsSaved') : '확장자 설정이 저장되었습니다.';
      Utils.updateStatus(message);
      
    } catch (error) {
      console.error('확장자 설정 저장 실패:', error);
      alert(window.i18n ? window.i18n.t('extensionSaveFailed') : '확장자 설정 저장에 실패했습니다.');
    }
  }

  // 파일에 확장자 설정 저장
  async saveExtensionsToFile() {
    const result = await window.electronAPI.invoke('save-json-file', CONSTANTS.PATHS.EXTENSIONS, this.currentExtensions);
    if (!result.success) {
      throw new Error('확장자 설정 파일 저장 실패');
    }
  }

  // 변경 취소
  async cancelChanges() {
    await this.loadExtensions();
    this.renderExtensions();
    this.hideModal();
  }

  // 모달 표시
  async showModal() {
    await this.loadExtensions();
    this.renderExtensions();
    this.modal.classList.remove('hidden');
  }

  // 모달 숨기기
  hideModal() {
    this.modal.classList.add('hidden');
  }

  // 확장자 추가
  addExtension(type) {
    const inputId = type === 'video' ? 'video-extension-input' : 'other-extension-input';
    const input = document.getElementById(inputId);
    const extension = input.value.trim().toLowerCase();

    // 유효성 검사
    if (!this.validateExtension(extension)) {
      alert(window.i18n ? window.i18n.t('invalidExtension') : '올바른 확장자 형식이 아닙니다. (예: .mp4)');
      return;
    }

    // 중복 검사
    if (this.currentExtensions[type].includes(extension)) {
      alert(window.i18n ? window.i18n.t('extensionExists') : '이미 존재하는 확장자입니다.');
      return;
    }

    // 추가
    this.currentExtensions[type].push(extension);
    this.currentExtensions[type].sort();
    
    input.value = '';
    this.renderExtensions();
    
    const message = window.i18n ? window.i18n.t('extensionAdded') : '확장자가 추가되었습니다.';
    console.log(message, extension);
  }

  // 확장자 제거
  removeExtension(type, extension) {
    const index = this.currentExtensions[type].indexOf(extension);
    if (index > -1) {
      this.currentExtensions[type].splice(index, 1);
      this.renderExtensions();
      
      const message = window.i18n ? window.i18n.t('extensionRemoved') : '확장자가 제거되었습니다.';
      console.log(message, extension);
    }
  }

  // 기본값으로 초기화
  async resetToDefault() {
    const confirmed = confirm(
      window.i18n ? window.i18n.t('resetExtensionsConfirm') : 
      '확장자 설정을 기본값으로 초기화하시겠습니까?\n현재 설정은 모두 삭제됩니다.'
    );
    
    if (confirmed) {
      this.currentExtensions = {
        video: [...this.defaultExtensions.video],
        other: [...this.defaultExtensions.other]
      };
      
      // 즉시 파일에 저장
      try {
        await this.saveExtensionsToFile();
        this.renderExtensions();
        
        const message = window.i18n ? window.i18n.t('extensionsReset') : '확장자 설정이 기본값으로 초기화되었습니다.';
        console.log(message);
      } catch (error) {
        console.error('기본값 초기화 저장 실패:', error);
        alert('기본값 초기화에 실패했습니다.');
      }
    }
  }

  // 확장자 유효성 검사
  validateExtension(extension) {
    // .으로 시작하고, 알파벳과 숫자만 포함하는 2-10자 확장자
    const regex = /^\.[a-z0-9]{1,9}$/i;
    return regex.test(extension);
  }

  // UI 렌더링
  renderExtensions() {
    this.renderExtensionList('video');
    this.renderExtensionList('other');
  }

  // 확장자 목록 렌더링
  renderExtensionList(type) {
    const containerId = type === 'video' ? 'video-extensions-list' : 'other-extensions-list';
    const container = document.getElementById(containerId);
    
    container.innerHTML = '';
    
    this.currentExtensions[type].forEach(extension => {
      const tag = this.createExtensionTag(type, extension);
      container.appendChild(tag);
    });
  }

  // 확장자 태그 생성
  createExtensionTag(type, extension) {
    const tag = document.createElement('div');
    tag.className = `extension-tag ${type}`;
    
    const text = document.createElement('span');
    text.textContent = extension;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = window.i18n ? window.i18n.t('remove') : '삭제';
    removeBtn.addEventListener('click', () => {
      this.removeExtension(type, extension);
    });
    
    tag.appendChild(text);
    tag.appendChild(removeBtn);
    
    return tag;
  }

  // 현재 확장자 설정 반환
  getExtensions() {
    return {
      video: [...this.currentExtensions.video],
      other: [...this.currentExtensions.other]
    };
  }

  // 파일이 비디오 확장자인지 확인
  isVideoExtension(extension) {
    return this.currentExtensions.video.includes(extension.toLowerCase());
  }

  // 파일이 기타 확장자인지 확인
  isOtherExtension(extension) {
    return this.currentExtensions.other.includes(extension.toLowerCase());
  }
}

// 전역 인스턴스 생성
window.extensionManager = new ExtensionManager();