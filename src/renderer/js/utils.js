// 유틸리티 함수들
class Utils {
  // 디바운싱 함수 - 검색 성능 최적화
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 스로틀링 함수 - 스크롤 성능 최적화
  static throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function(...args) {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  // 날짜 포맷팅
  static formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 파일 크기 포맷팅
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 별점 HTML 생성
  static generateStarRating(rating) {
    const maxStars = 5;
    const starCount = rating.length || 0;
    let html = '';
    
    for (let i = 0; i < maxStars; i++) {
      html += `<span class="star ${i < starCount ? 'active' : ''}" data-rating="${i + 1}">★</span>`;
    }
    
    return html;
  }

  // HTML 이스케이프
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 청크 단위로 배열 분할
  static chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // 비동기 지연
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // LRU 캐시 구현
  static createLRUCache(maxSize) {
    return new Map();
  }

  // 프로그레스 바 표시 (수동 작업 시에만)
  static showProgress(text = '처리 중...') {
    const progressContainer = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    
    if (progressContainer && progressText) {
      progressContainer.classList.remove('hidden');
      progressText.textContent = text;
      this.resetProgressBar();
    }
  }

  // 프로그레스 바 숨기기
  static hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }
  }

  // 프로그레스 바 업데이트 (기존 호환성 유지)
  static updateProgress(current, total, text = '') {
    const percentage = Math.round((current / total) * 100);
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (!progressContainer || !progressFill || !progressText) return;
    
    // 첫 번째 호출 시에만 표시 (백그라운드 작업 제외)
    if (current === 0 && total > 0) {
      progressContainer.classList.remove('hidden');
    }
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text || `${current}/${total} (${percentage}%)`;
    
    // 완료 시 잠깐 보여주고 숨김
    if (current >= total) {
      setTimeout(() => {
        progressContainer.classList.add('hidden');
      }, 500);
    }
  }

  // 진행률 바 리셋
  static resetProgressBar() {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = '0%';
    }
  }

  // 상태 메시지 업데이트 (하이브리드 시스템 고려)
  static updateStatus(message) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = message;
    }
    
    // 백그라운드 작업 메시지는 프로그래스바를 표시하지 않음
    const isBackgroundWork = message.includes('스캔 중') || message.includes('감시') || message.includes('실시간');
    
    // 수동 작업만 프로그래스바 표시 여부 결정
    if (!isBackgroundWork && (
      message.includes('정리') ||
      message.includes('새로고침') ||
      message.includes('로딩') ||
      message.includes('스캔')
    )) {
      // 작업 시작
      if (message.includes('중') || message.includes('로딩')) {
        this.showProgress(message);
      }
      // 작업 완료
      else if (message.includes('완료') || message.includes('실패')) {
        setTimeout(() => this.hideProgress(), 1000);
      }
    }
  }

  // 파일 카운트 업데이트
  static updateFileCount(count) {
    const fileCount = document.getElementById('file-count');
    fileCount.textContent = count.toLocaleString();
  }
}

// 글로벌 상수들
const CONSTANTS = {
  CHUNK_SIZE: 1000,
  DEBOUNCE_DELAY: 300,
  SCROLL_THROTTLE: 16,
  VIRTUAL_ITEM_HEIGHT: 50,
  CACHE_SIZE: 500,
  
  EXTENSIONS: {
    VIDEO: ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp'],
    FILE: ['.zip', '.7z', '.ezc', '.alzip', '.001', '.zpaq']
  },
  
  PATHS: {
    MEDIA_FILES: 'data/media/files.json',
    OTHER_FILES: 'data/file/files.json',
    LIBRARY: 'data/lib.json'
  }
};

// 전역 변수로 내보내기
window.Utils = Utils;
window.CONSTANTS = CONSTANTS;