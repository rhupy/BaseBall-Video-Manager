// 라이브러리 관리 클래스
class LibraryManager {
  constructor() {
    this.libraries = [];
    this.dataPath = '';
    this.selectedIndex = -1;
    this.modal = null;
    this.listContainer = null;
  }

  // 초기화
  async init() {
    this.dataPath = await window.electronAPI.invoke('get-data-path');
    await this.loadLibraries();
    this.initModal();
  }

  // 모달 초기화
  initModal() {
    this.modal = document.getElementById('library-modal');
    this.listContainer = document.getElementById('library-list');
    
    // 이벤트 리스너들
    document.getElementById('library-btn').addEventListener('click', () => {
      this.showModal();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
      this.hideModal();
    });

    document.getElementById('add-library').addEventListener('click', () => {
      this.addLibrary();
    });

    document.getElementById('remove-library').addEventListener('click', () => {
      this.removeSelectedLibrary();
    });

    document.getElementById('save-library').addEventListener('click', () => {
      this.saveAndClose();
    });

    document.getElementById('cancel-library').addEventListener('click', () => {
      this.cancelAndClose();
    });

    // 모달 배경 클릭으로 닫기
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.hideModal();
      }
    });
  }

  // 라이브러리 목록 로드
  async loadLibraries() {
    try {
      const result = await window.electronAPI.invoke('load-json-file', `${this.dataPath}/lib.json`);
      if (result.success) {
        this.libraries = result.data || [];
      } else {
        this.libraries = [];
        console.warn('라이브러리 파일을 읽을 수 없습니다:', result.error);
      }
    } catch (error) {
      console.error('라이브러리 로딩 실패:', error);
      this.libraries = [];
    }
  }

  // 라이브러리 목록 저장
  async saveLibraries() {
    try {
      // 인덱스 재정렬
      this.libraries.forEach((lib, index) => {
        lib.idx = index + 1;
      });

      const result = await window.electronAPI.invoke('save-json-file', `${this.dataPath}/lib.json`, this.libraries);
      if (!result.success) {
        throw new Error(result.error);
      }
      return true;
    } catch (error) {
      console.error('라이브러리 저장 실패:', error);
      alert('라이브러리 저장에 실패했습니다: ' + error.message);
      return false;
    }
  }

  // 모달 표시
  async showModal() {
    await this.loadLibraries();
    this.renderLibraryList();
    this.modal.classList.remove('hidden');
    this.selectedIndex = -1;
  }

  // 모달 숨기기
  hideModal() {
    this.modal.classList.add('hidden');
    this.selectedIndex = -1;
  }

  // 라이브러리 리스트 렌더링
  renderLibraryList() {
    if (!this.listContainer) return;

    if (this.libraries.length === 0) {
      this.listContainer.innerHTML = `
        <div class="no-files text-center" style="padding: 40px;">
          등록된 라이브러리가 없습니다.<br>
          <small style="color: #999;">폴더 추가 버튼을 눌러 라이브러리를 추가하세요.</small>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    this.libraries.forEach((library, index) => {
      const item = document.createElement('div');
      item.className = 'library-item';
      item.dataset.index = index;
      
      if (index === this.selectedIndex) {
        item.classList.add('selected');
      }

      item.innerHTML = `
        <div class="library-path" title="${Utils.escapeHtml(library.path)}">
          ${Utils.escapeHtml(library.path)}
        </div>
        <div class="library-index">#${library.idx}</div>
      `;

      // 클릭 이벤트
      item.addEventListener('click', () => {
        this.selectLibrary(index);
      });

      // 더블클릭으로 폴더 열기
      item.addEventListener('dblclick', async () => {
        await window.electronAPI.invoke('open-folder', library.path);
      });

      fragment.appendChild(item);
    });

    this.listContainer.innerHTML = '';
    this.listContainer.appendChild(fragment);
  }

  // 라이브러리 선택
  selectLibrary(index) {
    // 이전 선택 해제
    const prevSelected = this.listContainer.querySelector('.library-item.selected');
    if (prevSelected) {
      prevSelected.classList.remove('selected');
    }

    // 새 선택 적용
    this.selectedIndex = index;
    const newSelected = this.listContainer.querySelector(`[data-index="${index}"]`);
    if (newSelected) {
      newSelected.classList.add('selected');
    }
  }

  // 라이브러리 추가
  async addLibrary() {
    try {
      const result = await window.electronAPI.invoke('select-folder');
      if (result.success && result.path) {
        // 중복 체크
        const exists = this.libraries.some(lib => lib.path === result.path);
        if (exists) {
          alert('이미 등록된 경로입니다.');
          return;
        }

        // 새 라이브러리 추가
        const newLibrary = {
          idx: this.libraries.length + 1,
          path: result.path
        };

        this.libraries.push(newLibrary);
        this.renderLibraryList();
        
        // 새로 추가된 항목 선택
        this.selectLibrary(this.libraries.length - 1);
      }
    } catch (error) {
      console.error('폴더 선택 실패:', error);
      alert('폴더 선택에 실패했습니다.');
    }
  }

  // 선택된 라이브러리 제거
  removeSelectedLibrary() {
    if (this.selectedIndex === -1) {
      alert('삭제할 라이브러리를 선택하세요.');
      return;
    }

    if (this.libraries.length <= 1) {
      alert('최소 하나의 라이브러리는 유지되어야 합니다.');
      return;
    }

    const library = this.libraries[this.selectedIndex];
    const confirmMessage = `라이브러리를 삭제하시겠습니까?\n경로: ${library.path}`;
    
    if (confirm(confirmMessage)) {
      this.libraries.splice(this.selectedIndex, 1);
      this.selectedIndex = -1;
      this.renderLibraryList();
    }
  }

  // 저장하고 닫기
  async saveAndClose() {
    if (this.libraries.length === 0) {
      alert('최소 하나의 라이브러리는 필요합니다.');
      return;
    }

    const saved = await this.saveLibraries();
    if (saved) {
      this.hideModal();
      Utils.updateStatus('라이브러리가 저장되었습니다.');
    }
  }

  // 취소하고 닫기
  async cancelAndClose() {
    // 원래 데이터로 복원
    await this.loadLibraries();
    this.hideModal();
  }

  // 현재 라이브러리 목록 반환
  getLibraries() {
    return [...this.libraries];
  }

  // 라이브러리 경로들 반환
  getLibraryPaths() {
    return this.libraries.map(lib => lib.path);
  }

  // 특정 경로가 라이브러리에 포함되어 있는지 확인
  isPathInLibrary(filePath) {
    return this.libraries.some(library => {
      return filePath.startsWith(library.path);
    });
  }

  // 라이브러리 통계 반환
  getLibraryStats() {
    return {
      count: this.libraries.length,
      paths: this.getLibraryPaths()
    };
  }

  // 라이브러리 유효성 검사
  async validateLibraries() {
    const invalidLibraries = [];
    
    for (const library of this.libraries) {
      try {
        const exists = await window.electronAPI.invoke('path-exists', library.path);
        if (!exists) {
          invalidLibraries.push(library);
        }
      } catch (error) {
        console.warn(`라이브러리 경로 확인 실패: ${library.path}`, error);
        invalidLibraries.push(library);
      }
    }

    if (invalidLibraries.length > 0) {
      const message = `다음 라이브러리 경로들이 유효하지 않습니다:\n${invalidLibraries.map(lib => lib.path).join('\n')}\n\n라이브러리 관리에서 수정하시겠습니까?`;
      
      if (confirm(message)) {
        this.showModal();
      }
    }

    return invalidLibraries.length === 0;
  }

  // 라이브러리 초기화 (빈 라이브러리 생성)
  async initializeDefaultLibrary() {
    if (this.libraries.length === 0) {
      // 기본 라이브러리 생성
      const homeDir = await window.electronAPI.invoke('get-home-directory');
      const defaultPath = homeDir || 'C:\\';
      
      this.libraries = [{
        idx: 1,
        path: defaultPath
      }];
      
      await this.saveLibraries();
    }
  }
}

// 전역 변수로 내보내기
window.LibraryManager = LibraryManager;