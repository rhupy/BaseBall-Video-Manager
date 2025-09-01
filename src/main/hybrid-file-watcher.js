// 실시간 파일 감시 + Windows Search 조합 시스템
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const { EventEmitter } = require('events');
const WindowsSearchScanner = require('./windows-search-scanner');
const WindowsMetadataManager = require('./windows-metadata-manager');

class HybridFileWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.libraryPaths = options.libraryPaths || [];
    this.videoExtensions = options.videoExtensions || ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp', '.webm'];
    this.archiveExtensions = options.archiveExtensions || ['.zip', '.7z', '.ezc', '.alzip', '.001', '.zpaq', '.rar'];
    
    this.cache = new Map(); // 파일 캐시 (빠른 조회용)
    this.watchers = new Map(); // chokidar 감시자들
    this.debounceTimers = new Map(); // 디바운싱 타이머
    this.isInitialized = false;
    
    this.searchScanner = new WindowsSearchScanner();
    this.metadataManager = new WindowsMetadataManager();
    
    // 성능 통계
    this.stats = {
      totalFiles: 0,
      lastScanTime: null,
      scanDuration: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  // 초기화 (Windows Search API로 빠른 초기 스캔)
  async initialize() {
    if (this.isInitialized) {
      return this.getFilesFromCache();
    }

    console.log('하이브리드 파일 감시 시스템 초기화 시작...');
    const startTime = Date.now();
    
    try {
      // 1단계: Windows Search API로 초기 스캔
      await this.performInitialScan();
      
      // 2단계: 실시간 감시 시작
      this.startRealTimeWatching();
      
      this.isInitialized = true;
      this.stats.lastScanTime = new Date();
      this.stats.scanDuration = Date.now() - startTime;
      
      console.log(`초기화 완료: ${this.stats.totalFiles}개 파일, ${this.stats.scanDuration}ms`);
      
      this.emit('initialized', {
        totalFiles: this.stats.totalFiles,
        duration: this.stats.scanDuration
      });
      
      return this.getFilesFromCache();
      
    } catch (error) {
      console.error('초기화 실패:', error.message);
      
      // 폴백: 기존 방식으로 스캔
      console.log('폴백 스캔 시작...');
      await this.performFallbackScan();
      
      this.isInitialized = true;
      this.startRealTimeWatching();
      
      return this.getFilesFromCache();
    }
  }

  // Windows Search API를 이용한 초기 스캔
  async performInitialScan() {
    try {
      console.log('Windows Search API로 초기 스캔 중...');
      
      // 비디오 파일과 압축 파일을 병렬로 스캔
      const [videoFiles, archiveFiles] = await Promise.all([
        this.searchScanner.scanVideoFiles(this.libraryPaths, this.videoExtensions),
        this.searchScanner.scanArchiveFiles(this.libraryPaths, this.archiveExtensions)
      ]);

      // 캐시에 저장
      await this.populateCache('video', videoFiles);
      await this.populateCache('file', archiveFiles);
      
      console.log(`Windows Search 완료: 비디오 ${videoFiles.length}개, 압축 ${archiveFiles.length}개`);
      
    } catch (error) {
      console.warn('Windows Search 실패:', error.message);
      throw error; // 폴백으로 넘어가도록 에러 재발생
    }
  }

  // 폴백 스캔 (기존 방식)
  async performFallbackScan() {
    console.log('폴백 스캔 시작...');
    
    for (const libraryPath of this.libraryPaths) {
      try {
        await this.scanDirectory(libraryPath);
      } catch (error) {
        console.warn(`디렉토리 스캔 실패: ${libraryPath}`, error.message);
      }
    }
  }

  // 디렉토리 재귀 스캔
  async scanDirectory(dirPath) {
    const queue = [dirPath];
    const videoFiles = [];
    const archiveFiles = [];

    while (queue.length > 0) {
      const currentPath = queue.shift();
      
      try {
        if (!(await fs.pathExists(currentPath))) continue;
        
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            queue.push(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            
            if (this.videoExtensions.includes(ext)) {
              const stats = await fs.stat(fullPath);
              videoFiles.push({
                Filename: entry.name,
                Fullpath: fullPath,
                Size: stats.size,
                Modified: stats.mtime.toISOString()
              });
            } else if (this.archiveExtensions.includes(ext)) {
              const stats = await fs.stat(fullPath);
              archiveFiles.push({
                Filename: entry.name,
                Fullpath: fullPath,
                Size: stats.size,
                Modified: stats.mtime.toISOString()
              });
            }
          }
        }
      } catch (error) {
        // 접근 불가능한 디렉토리는 건너뛰기
        continue;
      }
    }

    // 캐시에 추가
    await this.populateCache('video', videoFiles);
    await this.populateCache('file', archiveFiles);
  }

  // 캐시에 파일 정보 저장
  async populateCache(type, files) {
    for (const file of files) {
      const cacheKey = `${type}:${file.Fullpath}`;
      
      // Windows 메타데이터와 병합
      try {
        const metadata = await this.metadataManager.getMetadata(file.Fullpath);
        
        this.cache.set(cacheKey, {
          ...file,
          type: type,
          // JSON 호환 형식으로 변환
          Addtime: file.Addtime || new Date().toISOString().replace('T', ' ').substring(0, 19),
          Lasttime: metadata.LastPlayed ? new Date(metadata.LastPlayed).toISOString().replace('T', ' ').substring(0, 19) : '',
          Eval: metadata.CustomRating > 0 ? '★'.repeat(metadata.CustomRating) : '',
          Desc: metadata.Description || '',
          PlayCount: metadata.PlayCount || 0,
          lastModified: new Date(file.Modified).getTime()
        });
        
      } catch (error) {
        // 메타데이터 조회 실패시 기본값으로 저장
        this.cache.set(cacheKey, {
          ...file,
          type: type,
          Addtime: file.Addtime || new Date().toISOString().replace('T', ' ').substring(0, 19),
          Lasttime: '',
          Eval: '',
          Desc: '',
          PlayCount: 0,
          lastModified: new Date(file.Modified).getTime()
        });
      }
    }

    this.stats.totalFiles = this.cache.size;
  }

  // 실시간 파일 감시 시작
  startRealTimeWatching() {
    console.log('실시간 파일 감시 시작...');
    
    this.libraryPaths.forEach(libraryPath => {
      const watcher = chokidar.watch(libraryPath, {
        ignored: [
          /(^|[\/\\])\../, // 숨김 파일
          /node_modules/, // node_modules
          /\$RECYCLE\.BIN/, // 휴지통
          /System Volume Information/ // 시스템 폴더
        ],
        persistent: true,
        ignoreInitial: true, // 초기 스캔은 이미 완료
        usePolling: false, // 성능 최적화
        interval: 1000, // 폴링 간격 (네트워크 드라이브용)
        binaryInterval: 3000,
        followSymlinks: false,
        depth: 10, // 최대 깊이 제한
        awaitWriteFinish: {
          stabilityThreshold: 2000, // 파일 쓰기 완료 대기
          pollInterval: 100
        }
      });

      // 파일 추가 감지
      watcher.on('add', (filePath) => {
        this.debounceFileChange(filePath, 'add');
      });

      // 파일 삭제 감지
      watcher.on('unlink', (filePath) => {
        this.handleFileDelete(filePath);
      });

      // 파일 변경 감지
      watcher.on('change', (filePath) => {
        this.debounceFileChange(filePath, 'change');
      });

      // 디렉토리 추가 감지
      watcher.on('addDir', (dirPath) => {
        console.log(`새 디렉토리 감지: ${dirPath}`);
      });

      // 디렉토리 삭제 감지
      watcher.on('unlinkDir', (dirPath) => {
        this.handleDirectoryDelete(dirPath);
      });

      // 에러 처리
      watcher.on('error', (error) => {
        console.error(`파일 감시 에러 (${libraryPath}):`, error.message);
      });

      // 준비 완료
      watcher.on('ready', () => {
        console.log(`실시간 감시 준비 완료: ${libraryPath}`);
      });

      this.watchers.set(libraryPath, watcher);
    });
  }

  // 디바운싱을 통한 파일 변경 처리
  debounceFileChange(filePath, action) {
    const key = `${filePath}:${action}`;
    
    // 기존 타이머가 있으면 취소
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    // 새 타이머 설정 (300ms 디바운싱)
    this.debounceTimers.set(key, setTimeout(async () => {
      await this.handleFileChange(filePath, action);
      this.debounceTimers.delete(key);
    }, 300));
  }

  // 파일 변경 처리
  async handleFileChange(filePath, action) {
    const ext = path.extname(filePath).toLowerCase();
    let fileType = null;
    
    if (this.videoExtensions.includes(ext)) {
      fileType = 'video';
    } else if (this.archiveExtensions.includes(ext)) {
      fileType = 'file';
    } else {
      return; // 관심 없는 파일 형식
    }

    try {
      // 파일 정보 조회
      const stats = await fs.stat(filePath);
      const metadata = await this.metadataManager.getMetadata(filePath);
      
      const fileInfo = {
        Filename: path.basename(filePath),
        Fullpath: filePath,
        Size: stats.size,
        Modified: stats.mtime.toISOString(),
        type: fileType,
        Addtime: action === 'add' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : undefined,
        Lasttime: metadata.LastPlayed ? new Date(metadata.LastPlayed).toISOString().replace('T', ' ').substring(0, 19) : '',
        Eval: metadata.CustomRating > 0 ? '★'.repeat(metadata.CustomRating) : '',
        Desc: metadata.Description || '',
        PlayCount: metadata.PlayCount || 0,
        lastModified: stats.mtime.getTime()
      };

      const cacheKey = `${fileType}:${filePath}`;
      
      if (action === 'add') {
        this.cache.set(cacheKey, fileInfo);
        console.log(`파일 추가 감지: ${path.basename(filePath)}`);
        
        this.emit('file-added', {
          type: fileType,
          file: fileInfo
        });
      } else if (action === 'change') {
        const existing = this.cache.get(cacheKey);
        if (existing) {
          // 기존 메타데이터 보존하고 파일 정보만 업데이트
          const updatedInfo = {
            ...existing,
            Size: fileInfo.Size,
            Modified: fileInfo.Modified,
            lastModified: fileInfo.lastModified
          };
          
          this.cache.set(cacheKey, updatedInfo);
          console.log(`파일 변경 감지: ${path.basename(filePath)}`);
          
          this.emit('file-changed', {
            type: fileType,
            file: updatedInfo
          });
        }
      }

      this.stats.totalFiles = this.cache.size;
      
    } catch (error) {
      console.warn(`파일 처리 실패 (${action}): ${filePath}`, error.message);
    }
  }

  // 파일 삭제 처리
  handleFileDelete(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let fileType = null;
    
    if (this.videoExtensions.includes(ext)) {
      fileType = 'video';
    } else if (this.archiveExtensions.includes(ext)) {
      fileType = 'file';
    } else {
      return;
    }

    const cacheKey = `${fileType}:${filePath}`;
    const deletedFile = this.cache.get(cacheKey);
    
    if (deletedFile) {
      this.cache.delete(cacheKey);
      this.stats.totalFiles = this.cache.size;
      
      console.log(`파일 삭제 감지: ${path.basename(filePath)}`);
      
      this.emit('file-deleted', {
        type: fileType,
        file: deletedFile
      });
    }
  }

  // 디렉토리 삭제 처리 (하위 모든 파일 제거)
  handleDirectoryDelete(dirPath) {
    let deletedCount = 0;
    
    for (const [cacheKey, fileInfo] of this.cache.entries()) {
      if (fileInfo.Fullpath.startsWith(dirPath)) {
        this.cache.delete(cacheKey);
        deletedCount++;
        
        this.emit('file-deleted', {
          type: fileInfo.type,
          file: fileInfo
        });
      }
    }
    
    if (deletedCount > 0) {
      this.stats.totalFiles = this.cache.size;
      console.log(`디렉토리 삭제로 ${deletedCount}개 파일 제거: ${dirPath}`);
    }
  }

  // 캐시에서 파일 목록 조회
  getFilesFromCache(filter = {}) {
    const videoFiles = [];
    const archiveFiles = [];
    
    for (const [cacheKey, fileInfo] of this.cache.entries()) {
      if (fileInfo.type === 'video') {
        videoFiles.push(fileInfo);
      } else if (fileInfo.type === 'file') {
        archiveFiles.push(fileInfo);
      }
    }

    // 필터링
    let filteredVideo = videoFiles;
    let filteredArchive = archiveFiles;

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredVideo = videoFiles.filter(f => f.Filename.toLowerCase().includes(searchLower));
      filteredArchive = archiveFiles.filter(f => f.Filename.toLowerCase().includes(searchLower));
    }

    if (filter.minRating) {
      filteredVideo = filteredVideo.filter(f => (f.Eval ? f.Eval.length : 0) >= filter.minRating);
      filteredArchive = filteredArchive.filter(f => (f.Eval ? f.Eval.length : 0) >= filter.minRating);
    }

    return {
      video: filteredVideo,
      file: filteredArchive,
      stats: this.stats
    };
  }

  // 파일 메타데이터 업데이트
  async updateFileMetadata(filePath, updates) {
    try {
      // Windows 메타데이터 업데이트
      if (updates.rating !== undefined) {
        await this.metadataManager.setFileRating(filePath, updates.rating);
      }
      
      if (updates.description !== undefined) {
        await this.metadataManager.setDescription(filePath, updates.description);
      }
      
      if (updates.lastPlayed !== undefined) {
        await this.metadataManager.setLastPlayed(filePath, updates.lastPlayed);
      }
      
      // 캐시 업데이트
      const ext = path.extname(filePath).toLowerCase();
      const fileType = this.videoExtensions.includes(ext) ? 'video' : 'file';
      const cacheKey = `${fileType}:${filePath}`;
      
      const cachedFile = this.cache.get(cacheKey);
      if (cachedFile) {
        const updatedFile = { ...cachedFile };
        
        if (updates.rating !== undefined) {
          updatedFile.Eval = updates.rating > 0 ? '★'.repeat(updates.rating) : '';
        }
        
        if (updates.description !== undefined) {
          updatedFile.Desc = updates.description;
        }
        
        if (updates.lastPlayed !== undefined) {
          updatedFile.Lasttime = new Date(updates.lastPlayed).toISOString().replace('T', ' ').substring(0, 19);
        }
        
        this.cache.set(cacheKey, updatedFile);
        
        this.emit('metadata-updated', {
          type: fileType,
          file: updatedFile,
          updates
        });
      }
      
      return true;
    } catch (error) {
      console.error('메타데이터 업데이트 실패:', error.message);
      return false;
    }
  }

  // 파일 실행 시 호출
  async executeFile(filePath) {
    try {
      const now = new Date();
      const playCount = await this.metadataManager.incrementPlayCount(filePath);
      await this.metadataManager.setLastPlayed(filePath, now);
      
      // 캐시 업데이트
      const ext = path.extname(filePath).toLowerCase();
      const fileType = this.videoExtensions.includes(ext) ? 'video' : 'file';
      const cacheKey = `${fileType}:${filePath}`;
      
      const cachedFile = this.cache.get(cacheKey);
      if (cachedFile) {
        cachedFile.Lasttime = now.toISOString().replace('T', ' ').substring(0, 19);
        cachedFile.PlayCount = playCount;
        this.cache.set(cacheKey, cachedFile);
      }
      
      return true;
    } catch (error) {
      console.error('실행 기록 업데이트 실패:', error.message);
      return false;
    }
  }

  // 감시 중지
  stopWatching() {
    for (const [libraryPath, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(`파일 감시 중지: ${libraryPath}`);
    }
    
    this.watchers.clear();
    
    // 디바운싱 타이머 정리
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  // 통계 정보 조회
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      watcherCount: this.watchers.size,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = HybridFileWatcher;