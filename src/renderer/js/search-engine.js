// 고성능 검색 엔진 클래스
class SearchEngine {
  constructor() {
    this.searchInput = null;
    this.debouncedSearch = null;
    this.searchHistory = [];
    this.maxHistorySize = 20;
  }

  // 초기화
  init() {
    this.searchInput = document.getElementById('search-input');
    if (!this.searchInput) return;

    // 디바운싱된 검색 함수 생성
    this.debouncedSearch = Utils.debounce((query) => {
      this.performSearch(query);
    }, CONSTANTS.DEBOUNCE_DELAY);

    // 이벤트 리스너 등록
    this.initEventListeners();
    
    // 검색 기록 로드
    this.loadSearchHistory();
  }

  // 이벤트 리스너 초기화
  initEventListeners() {
    // 실시간 검색
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.debouncedSearch(query);
    });

    // 엔터키 즉시 검색
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = this.searchInput.value.trim();
        this.performSearch(query);
        this.addToHistory(query);
      }
    });

    // ESC로 검색 초기화
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearSearch();
      }
    });

    // 포커스 이벤트
    this.searchInput.addEventListener('focus', () => {
      this.searchInput.select();
    });
  }

  // 검색 수행
  performSearch(query) {
    if (!window.fileManager) return;

    // 빈 검색어면 전체 목록 표시
    if (!query) {
      window.fileManager.search('');
      this.updateSearchStats(null);
      return;
    }

    // 실제 검색 실행
    const startTime = performance.now();
    window.fileManager.search(query);
    const endTime = performance.now();

    // 검색 통계 업데이트
    const currentFiles = window.fileManager.getCurrentFiles();
    this.updateSearchStats({
      query,
      resultsCount: currentFiles.length,
      searchTime: Math.round(endTime - startTime)
    });

    // 검색어 하이라이팅
    this.highlightSearchResults(query);
  }

  // 검색 통계 업데이트
  updateSearchStats(stats) {
    const statusText = document.getElementById('status-text');
    
    if (!stats) {
      statusText.textContent = '준비됨';
    } else {
      const { query, resultsCount, searchTime } = stats;
      statusText.textContent = `"${query}" 검색 결과: ${resultsCount}개 (${searchTime}ms)`;
    }
  }

  // 검색 결과 하이라이팅
  highlightSearchResults(query) {
    if (!query) return;

    const fileItems = document.querySelectorAll('.file-name');
    const searchWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    fileItems.forEach(item => {
      let text = item.textContent;
      let highlightedText = text;
      
      // 각 검색어를 하이라이트
      searchWords.forEach(word => {
        const regex = new RegExp(`(${this.escapeRegExp(word)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
      });
      
      item.innerHTML = highlightedText;
    });
  }

  // 정규식 특수문자 이스케이프
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 검색 초기화
  clearSearch() {
    this.searchInput.value = '';
    this.performSearch('');
    this.searchInput.focus();
  }

  // 검색어 설정
  setSearchQuery(query) {
    this.searchInput.value = query;
    this.performSearch(query);
  }

  // 검색 기록 추가
  addToHistory(query) {
    if (!query || query.length < 2) return;

    // 중복 제거
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }

    // 맨 앞에 추가
    this.searchHistory.unshift(query);

    // 최대 크기 제한
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }

    // 로컬 스토리지에 저장
    this.saveSearchHistory();
  }

  // 검색 기록 저장
  saveSearchHistory() {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('검색 기록 저장 실패:', error);
    }
  }

  // 검색 기록 로드
  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('검색 기록 로드 실패:', error);
      this.searchHistory = [];
    }
  }

  // 검색 기록 반환
  getSearchHistory() {
    return [...this.searchHistory];
  }

  // 검색 기록 삭제
  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
  }

  // 고급 검색 기능들
  
  // 파일명 기반 스마트 검색
  smartSearch(query) {
    if (!query) return [];

    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const files = window.fileManager.getCurrentFiles();
    const results = [];

    files.forEach(file => {
      const fileName = file.Filename.toLowerCase();
      let score = 0;
      let matchedWords = 0;

      words.forEach(word => {
        if (fileName.includes(word)) {
          matchedWords++;
          
          // 정확한 단어 매치에 더 높은 점수
          if (fileName.includes(' ' + word + ' ') || fileName.startsWith(word + ' ') || fileName.endsWith(' ' + word)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      });

      // 모든 단어가 매치되는 경우만 결과에 포함
      if (matchedWords === words.length) {
        results.push({ file, score, matchedWords });
      }
    });

    // 점수순으로 정렬
    results.sort((a, b) => b.score - a.score);
    
    return results.map(result => result.file);
  }

  // 파일 형식별 검색
  searchByExtension(extension) {
    const files = window.fileManager.getCurrentFiles();
    return files.filter(file => {
      const fileExt = file.Filename.split('.').pop().toLowerCase();
      return fileExt === extension.toLowerCase().replace('.', '');
    });
  }

  // 날짜 범위 검색
  searchByDateRange(startDate, endDate) {
    const files = window.fileManager.getCurrentFiles();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return files.filter(file => {
      const addDate = new Date(file.Addtime);
      return addDate >= start && addDate <= end;
    });
  }

  // 평점 기반 검색
  searchByRating(minRating) {
    const files = window.fileManager.getCurrentFiles();
    return files.filter(file => {
      const rating = file.Eval ? file.Eval.length : 0;
      return rating >= minRating;
    });
  }

  // 검색 제안 생성
  generateSearchSuggestions(query) {
    if (!query || query.length < 2) return [];

    const files = window.fileManager.getCurrentFiles();
    const suggestions = new Set();
    const queryLower = query.toLowerCase();

    files.forEach(file => {
      const fileName = file.Filename.toLowerCase();
      
      // 파일명에서 검색어로 시작하는 단어들 찾기
      const words = fileName.split(/\W+/);
      words.forEach(word => {
        if (word.startsWith(queryLower) && word.length > queryLower.length) {
          suggestions.add(word);
        }
      });
    });

    return Array.from(suggestions).slice(0, 10);
  }

  // 검색 통계 반환
  getSearchStats() {
    const currentFiles = window.fileManager.getCurrentFiles();
    const totalFiles = window.fileManager.allFiles.video.length + window.fileManager.allFiles.file.length;
    
    return {
      totalFiles,
      displayedFiles: currentFiles.length,
      currentQuery: this.searchInput ? this.searchInput.value : '',
      historyCount: this.searchHistory.length
    };
  }
}

// CSS 추가 (검색 하이라이트용)
const searchStyles = `
<style>
.search-highlight {
  background: #ffeb3b;
  color: #333;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: bold;
}
</style>
`;

// 스타일 추가
if (!document.querySelector('#search-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'search-styles';
  styleElement.innerHTML = searchStyles;
  document.head.appendChild(styleElement.querySelector('style'));
}

// 전역 변수로 내보내기
window.SearchEngine = SearchEngine;