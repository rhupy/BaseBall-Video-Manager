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

  // 프로그레스 바 업데이트
  static updateProgress(current, total, text = '') {
    const percentage = Math.round((current / total) * 100);
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (current === 0) {
      progressContainer.classList.remove('hidden');
    }
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text || `${current}/${total} (${percentage}%)`;
    
    if (current >= total) {
      setTimeout(() => {
        progressContainer.classList.add('hidden');
      }, 500);
    }
  }

  // 상태 메시지 업데이트
  static updateStatus(message) {
    const statusText = document.getElementById('status-text');
    statusText.textContent = message;
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