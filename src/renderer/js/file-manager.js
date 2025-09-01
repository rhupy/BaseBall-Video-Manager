// 고성능 파일 매니저 클래스 (Windows Search + 실시간 감시 통합)
class FileManager {
  constructor() {
    this.currentTab = "video";
    this.allFiles = {
      video: [],
      file: [],
    };
    this.filteredFiles = {
      video: [],
      file: [],
    };
    this.searchIndex = new Map();
    this.isLoading = false;
    this.useHybridSystem = true; // 새로운 하이브리드 시스템 사용 여부
    this.isHybridInitialized = false; // 하이브리드 시스템 초기화 상태
  }

  // 초기화
  async init() {
    try {
      this.dataPath = await window.electronAPI.invoke("get-data-path");
      
      if (this.useHybridSystem) {
        // 하이브리드 시스템 우선 시도
        const success = await this.initHybridSystem();
        if (success) {
          this.isHybridInitialized = true;
          Utils.updateStatus("고성능 시스템으로 파일 로딩 완료");
          return;
        } else {
          console.warn("하이브리드 시스템 초기화 실패, 기존 시스템으로 폴백");
          this.useHybridSystem = false;
        }
      }
      
      // 기존 시스템으로 폴백
      await this.loadAllFiles();
      this.buildSearchIndex();
      Utils.updateStatus("파일 로딩 완료");
    } catch (error) {
      console.error("FileManager 초기화 실패:", error);
      Utils.updateStatus("초기화 실패");
    }
  }

  // 하이브리드 시스템 초기화 (Windows Search + 실시간 감시)
  async initHybridSystem() {
    try {
      this.isLoading = true;
      Utils.updateStatus("고성능 시스템으로 파일 스캔 중...");

      // 라이브러리 경로 로드
      const libraryResult = await window.electronAPI.invoke(
        "load-json-file",
        `${this.dataPath}/lib.json`
      );
      if (!libraryResult.success) {
        throw new Error("라이브러리 파일을 읽을 수 없습니다.");
      }

      const libraries = libraryResult.data || [];
      const libraryPaths = libraries.map(lib => lib.path);

      if (libraryPaths.length === 0) {
        throw new Error("라이브러리 경로가 설정되지 않았습니다.");
      }

      // 하이브리드 파일 감시 시스템 초기화
      const result = await window.electronAPI.invoke("hybrid-system-init", libraryPaths);
      
      if (!result.success) {
        throw new Error(result.error || "하이브리드 시스템 초기화 실패");
      }

      // 데이터를 기존 형식으로 변환하여 호환성 유지
      this.allFiles.video = result.data.video || [];
      this.allFiles.file = result.data.file || [];
      this.filteredFiles.video = [...this.allFiles.video];
      this.filteredFiles.file = [...this.allFiles.file];

      // 검색 인덱스 구축 (하이브리드 시스템에서도 빠른 검색을 위해)
      this.buildSearchIndex();

      // 실시간 업데이트 이벤트 리스너 등록
      this.setupHybridEventListeners();

      // JSON 파일과 동기화 (백업 목적)
      await this.syncWithJsonFiles();

      this.updateUI();

      console.log(`하이브리드 시스템 초기화 완료: 비디오 ${this.allFiles.video.length}개, 압축 ${this.allFiles.file.length}개`);
      console.log(`스캔 소요 시간: ${result.stats?.scanDuration || 0}ms`);

      return true;
    } catch (error) {
      console.error("하이브리드 시스템 초기화 실패:", error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // 하이브리드 시스템 실시간 이벤트 리스너 설정
  setupHybridEventListeners() {
    // 파일 추가 이벤트
    window.electronAPI.on('hybrid-file-added', (event, data) => {
      console.log('파일 추가됨:', data.file.Filename);
      
      this.allFiles[data.type].unshift(data.file); // 최신 파일을 맨 앞에 추가
      
      // 현재 필터에 맞으면 표시 목록에도 추가
      if (this.passesCurrentFilter(data.file)) {
        this.filteredFiles[data.type].unshift(data.file);
      }
      
      // 검색 인덱스 업데이트
      this.addToSearchIndex(data.file, data.type);
      
      // UI 업데이트
      if (data.type === this.currentTab) {
        this.updateUI();
      }
    });

    // 파일 삭제 이벤트
    window.electronAPI.on('hybrid-file-deleted', (event, data) => {
      console.log('파일 삭제됨:', data.file.Filename);
      
      // 전체 목록에서 제거
      const allIndex = this.allFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (allIndex !== -1) {
        this.allFiles[data.type].splice(allIndex, 1);
      }
      
      // 필터된 목록에서 제거
      const filteredIndex = this.filteredFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (filteredIndex !== -1) {
        this.filteredFiles[data.type].splice(filteredIndex, 1);
      }
      
      // 검색 인덱스에서 제거
      this.removeFromSearchIndex(data.file, data.type);
      
      // UI 업데이트
      if (data.type === this.currentTab) {
        this.updateUI();
      }
    });

    // 파일 변경 이벤트
    window.electronAPI.on('hybrid-file-changed', (event, data) => {
      console.log('파일 변경됨:', data.file.Filename);
      
      // 전체 목록 업데이트
      const allIndex = this.allFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (allIndex !== -1) {
        this.allFiles[data.type][allIndex] = data.file;
      }
      
      // 필터된 목록 업데이트
      const filteredIndex = this.filteredFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (filteredIndex !== -1) {
        this.filteredFiles[data.type][filteredIndex] = data.file;
      }
      
      // UI 업데이트
      if (data.type === this.currentTab) {
        this.updateUI();
      }
    });

    // 메타데이터 업데이트 이벤트
    window.electronAPI.on('hybrid-metadata-updated', (event, data) => {
      console.log('메타데이터 업데이트됨:', data.file.Filename);
      
      // 메타데이터만 업데이트하므로 파일 변경과 같은 처리
      const allIndex = this.allFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (allIndex !== -1) {
        this.allFiles[data.type][allIndex] = { ...this.allFiles[data.type][allIndex], ...data.file };
      }
      
      const filteredIndex = this.filteredFiles[data.type].findIndex(f => f.Fullpath === data.file.Fullpath);
      if (filteredIndex !== -1) {
        this.filteredFiles[data.type][filteredIndex] = { ...this.filteredFiles[data.type][filteredIndex], ...data.file };
      }
      
      // UI 업데이트
      if (data.type === this.currentTab) {
        this.updateUI();
      }
    });
  }

  // JSON 파일과 동기화 (백업 목적)
  async syncWithJsonFiles() {
    try {
      // 비디오 파일 JSON 저장
      const mediaFilePath = `${this.dataPath}/media/files.json`;
      await window.electronAPI.invoke("save-json-file", mediaFilePath, this.allFiles.video);

      // 압축 파일 JSON 저장
      const fileFilePath = `${this.dataPath}/file/files.json`;
      await window.electronAPI.invoke("save-json-file", fileFilePath, this.allFiles.file);

      console.log("JSON 파일 동기화 완료");
    } catch (error) {
      console.warn("JSON 파일 동기화 실패:", error.message);
    }
  }

  // 현재 필터 조건을 통과하는지 확인
  passesCurrentFilter(file) {
    // 현재 검색어가 있으면 검색어 조건 확인
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
      const searchLower = searchInput.value.toLowerCase();
      if (!file.Filename.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // 다른 필터 조건들도 여기에 추가 가능
    return true;
  }

  // 검색 인덱스에 파일 추가
  addToSearchIndex(file, type) {
    const words = file.Filename.toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 0);
      
    words.forEach((word) => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, { video: [], file: [] });
      }
      
      // 중복 방지를 위해 기존에 없는 경우만 추가
      const typeArray = this.searchIndex.get(word)[type];
      const existingIndex = typeArray.findIndex(idx => 
        this.allFiles[type][idx]?.Fullpath === file.Fullpath
      );
      
      if (existingIndex === -1) {
        const newIndex = this.allFiles[type].findIndex(f => f.Fullpath === file.Fullpath);
        if (newIndex !== -1) {
          typeArray.push(newIndex);
        }
      }
    });
  }

  // 검색 인덱스에서 파일 제거
  removeFromSearchIndex(file, type) {
    const words = file.Filename.toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 0);
      
    words.forEach((word) => {
      if (this.searchIndex.has(word)) {
        const typeArray = this.searchIndex.get(word)[type];
        const removeIndex = typeArray.findIndex(idx => 
          this.allFiles[type][idx]?.Fullpath === file.Fullpath
        );
        
        if (removeIndex !== -1) {
          typeArray.splice(removeIndex, 1);
        }
        
        // 해당 단어에 대한 파일이 더 이상 없으면 단어 자체 제거
        if (typeArray.length === 0 && this.searchIndex.get(word).video.length === 0) {
          this.searchIndex.delete(word);
        }
      }
    });
  }

  // 모든 파일 로드 (청크 단위로 처리)
  async loadAllFiles() {
    this.isLoading = true;
    Utils.updateStatus("파일을 로드하는 중...");

    try {
      // 병렬로 두 파일 로드
      const [mediaResult, fileResult] = await Promise.all([
        this.loadFileData("video"),
        this.loadFileData("file"),
      ]);

      if (mediaResult.success) {
        this.allFiles.video = mediaResult.data || [];
        this.filteredFiles.video = [...this.allFiles.video];
      }

      if (fileResult.success) {
        this.allFiles.file = fileResult.data || [];
        this.filteredFiles.file = [...this.allFiles.file];
      }

      this.updateUI();
    } finally {
      this.isLoading = false;
    }
  }

  // 개별 파일 데이터 로드
  async loadFileData(type) {
    const fileName = type === "video" ? "media/files.json" : "file/files.json";
    const filePath = `${this.dataPath}/${fileName}`;

    return await window.electronAPI.invoke("load-json-file", filePath);
  }

  // 검색 인덱스 구축 (성능 최적화)
  buildSearchIndex() {
    this.searchIndex.clear();

    const buildIndexForType = (files, type) => {
      files.forEach((file, index) => {
        const words = file.Filename.toLowerCase()
          .split(/\W+/)
          .filter((word) => word.length > 0);
        words.forEach((word) => {
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, { video: [], file: [] });
          }
          this.searchIndex.get(word)[type].push(index);
        });
      });
    };

    buildIndexForType(this.allFiles.video, "video");
    buildIndexForType(this.allFiles.file, "file");
  }

  // 고성능 검색 (하이브리드: 인덱스 기반 + 부분 문자열 검색)
  search(query) {
    if (!query.trim()) {
      this.filteredFiles.video = [...this.allFiles.video];
      this.filteredFiles.file = [...this.allFiles.file];
      this.updateUI();
      return;
    }

    const searchWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const results = { video: new Set(), file: new Set() };

    // 각 타입별로 검색 수행
    for (const type of ["video", "file"]) {
      const files = this.allFiles[type];

      // 첫 번째 단어로 초기 후보군 설정 (인덱스 기반)
      let candidateIndices = new Set();
      const firstWord = searchWords[0];

      // 인덱스에서 첫 번째 단어를 포함하는 단어들 찾기
      let foundInIndex = false;
      for (const [indexedWord, indices] of this.searchIndex.entries()) {
        if (indexedWord.includes(firstWord)) {
          indices[type].forEach((i) => candidateIndices.add(i));
          foundInIndex = true;
        }
      }

      // 인덱스에서 찾지 못했거나 후보가 너무 많으면 전체 검색
      if (!foundInIndex || candidateIndices.size > files.length * 0.5) {
        candidateIndices = new Set(
          Array.from({ length: files.length }, (_, i) => i)
        );
      }

      // 후보군에서 실제 부분 문자열 검색
      for (const i of candidateIndices) {
        const fileName = files[i].Filename.toLowerCase();

        // 모든 검색어가 파일명에 포함되어 있는지 확인
        const matchesAllWords = searchWords.every((word) =>
          fileName.includes(word)
        );

        if (matchesAllWords) {
          results[type].add(i);
        }
      }
    }

    // 결과를 실제 파일 객체로 변환
    this.filteredFiles.video = [...results.video].map(
      (i) => this.allFiles.video[i]
    );
    this.filteredFiles.file = [...results.file].map(
      (i) => this.allFiles.file[i]
    );

    this.updateUI();
  }

  // 하이브리드 시스템 새로고침 (증분 업데이트)
  async hybridRefresh(isAutoSync = false) {
    try {
      this.isLoading = true;
      const statusText = isAutoSync ? "자동 동기화 중..." : "빠른 새로고침 중...";
      Utils.updateStatus(statusText);

      const result = await window.electronAPI.invoke("hybrid-incremental-scan");
      
      if (result.success) {
        // 변경된 파일이 있으면 UI 업데이트는 이벤트 리스너가 자동 처리
        const changeCount = result.addedCount + result.removedCount + result.changedCount;
        
        if (changeCount > 0) {
          console.log(`증분 스캔 완료: ${result.addedCount}개 추가, ${result.removedCount}개 제거, ${result.changedCount}개 변경`);
          Utils.updateStatus(`새로고침 완료 - ${changeCount}개 변경사항 발견`);
        } else {
          Utils.updateStatus("새로고침 완료 - 변경사항 없음");
        }

        // JSON 파일과 동기화
        await this.syncWithJsonFiles();
      } else {
        throw new Error(result.error || "증분 스캔 실패");
      }

    } catch (error) {
      console.error("하이브리드 새로고침 실패:", error);
      Utils.updateStatus("새로고침 실패");
    } finally {
      this.isLoading = false;
    }
  }

  // 자동 동기화 (앱 시작시)
  async autoSync() {
    if (this.isHybridInitialized) {
      // 하이브리드 시스템에서는 실시간 감시가 있으므로 별도의 동기화 불필요
      Utils.updateStatus("실시간 동기화 활성화됨");
      return true;
    } else {
      return await this.refreshFiles(true);
    }
  }

  // 파일 새로고침 (디렉토리 스캔)
  async refreshFiles(isAutoSync = false) {
    if (this.isLoading) return;

    if (this.isHybridInitialized) {
      // 하이브리드 시스템: 증분 스캔으로 변경된 파일만 업데이트
      return await this.hybridRefresh(isAutoSync);
    }

    this.isLoading = true;
    const statusText = isAutoSync
      ? "자동 동기화 중..."
      : "파일을 새로고침하는 중...";
    Utils.updateStatus(statusText);

    try {
      // 라이브러리 경로들 로드
      const libraryResult = await window.electronAPI.invoke(
        "load-json-file",
        `${this.dataPath}/lib.json`
      );
      if (!libraryResult.success) {
        throw new Error("라이브러리 파일을 읽을 수 없습니다.");
      }

      const libraries = libraryResult.data || [];
      const extensions = {
        video: CONSTANTS.EXTENSIONS.VIDEO,
        file: CONSTANTS.EXTENSIONS.FILE,
      };

      // 접속 불가능한 라이브러리 추적
      const inaccessibleLibraries = [];

      // 각 타입별로 파일 스캔
      for (const type of ["video", "file"]) {
        const existingFiles = this.allFiles[type];
        const foundFiles = new Set();
        const newFiles = [];

        let processedPaths = 0;
        const totalPaths = libraries.length;

        // 각 라이브러리 경로 스캔
        for (const library of libraries) {
          Utils.updateProgress(
            processedPaths,
            totalPaths,
            `${library.path} 스캔 중...`
          );

          // 라이브러리 접근 가능 여부 확인
          const libraryExists = await window.electronAPI.invoke(
            "path-exists",
            library.path
          );
          if (!libraryExists) {
            inaccessibleLibraries.push(library);
            processedPaths++;
            continue; // 접근 불가능한 라이브러리는 건드리지 않음
          }

          const scanResult = await window.electronAPI.invoke(
            "scan-directory",
            library.path,
            extensions[type]
          );

          if (scanResult.success) {
            scanResult.files.forEach((scannedFile) => {
              foundFiles.add(scannedFile.fullpath);

              // 기존 파일 찾기
              const existingFile = existingFiles.find(
                (f) => f.Fullpath === scannedFile.fullpath
              );

              if (existingFile) {
                // 기존 파일은 그대로 유지 (평점, 설명 보존)
                newFiles.push(existingFile);
              } else {
                // 새 파일 추가
                newFiles.push({
                  Filename: scannedFile.filename,
                  Fullpath: scannedFile.fullpath,
                  Addtime: new Date()
                    .toISOString()
                    .replace("T", " ")
                    .substring(0, 19),
                  Lasttime: "",
                  Eval: "",
                  Desc: "",
                });
              }
            });

            // 빈 폴더 삭제
            if (!isAutoSync) {
              // 새로고침시에만 빈 폴더 삭제
              await this.removeEmptyFolders(library.path);
            }
          } else {
            inaccessibleLibraries.push(library);
          }

          processedPaths++;
        }

        // 접근 불가능한 라이브러리의 파일들은 격리해서 보존
        const preservedFiles = existingFiles.filter((file) => {
          return inaccessibleLibraries.some((lib) =>
            file.Fullpath.startsWith(lib.path)
          );
        });

        // 최종 파일 목록 = 새로 스캔된 파일들 + 접근 불가 라이브러리 파일들
        this.allFiles[type] = [...newFiles, ...preservedFiles];

        // 추가 시간 역순으로 정렬
        this.allFiles[type].sort(
          (a, b) => new Date(b.Addtime) - new Date(a.Addtime)
        );

        // JSON 파일 저장
        const fileName =
          type === "video" ? "media/files.json" : "file/files.json";
        const filePath = `${this.dataPath}/${fileName}`;
        await window.electronAPI.invoke(
          "save-json-file",
          filePath,
          this.allFiles[type]
        );
      }

      // 필터링된 파일들도 업데이트
      this.filteredFiles.video = [...this.allFiles.video];
      this.filteredFiles.file = [...this.allFiles.file];

      // 검색 인덱스 재구축
      this.buildSearchIndex();
      this.updateUI();

      // 접속 불가능한 라이브러리가 있으면 사용자에게 알림
      if (inaccessibleLibraries.length > 0) {
        const inaccessiblePaths = inaccessibleLibraries.map((lib) => lib.path);
        console.warn("접속 불가능한 라이브러리:", inaccessiblePaths);

        if (!isAutoSync) {
          // 수동 새로고침시에만 알림 표시
          alert(
            `다음 라이브러리에 접속할 수 없습니다:\n\n${inaccessiblePaths.join(
              "\n"
            )}\n\n` +
              "해당 라이브러리의 파일들은 변경되지 않았습니다.\n" +
              "네트워크 연결이나 경로를 확인해 주세요."
          );
        }
      }

      const completedText = isAutoSync ? "동기화 완료" : "새로고침 완료";
      Utils.updateStatus(
        `${completedText} - 비디오: ${this.allFiles.video.length}개, 기타: ${this.allFiles.file.length}개`
      );
    } catch (error) {
      console.error("파일 새로고침 실패:", error);
      Utils.updateStatus("새로고침 실패");
    } finally {
      this.isLoading = false;
    }
  }

  // 파일 실행
  async executeFile(filePath) {
    // 파일 존재 여부 먼저 확인
    const exists = await window.electronAPI.invoke("path-exists", filePath);
    if (!exists) {
      // 확인창 없이 자동으로 JSON에서 제거
      await this.removeFileFromList(filePath);
      Utils.updateStatus(`존재하지 않는 파일을 목록에서 제거했습니다.`);
      return;
    }

    const result = await window.electronAPI.invoke("open-file", filePath);
    if (result.success) {
      // 마지막 실행 시간 업데이트
      if (this.isHybridInitialized) {
        // 하이브리드 시스템: Windows 메타데이터 + 캐시 업데이트
        await window.electronAPI.invoke("hybrid-execute-file", filePath);
      } else {
        // 기존 시스템
        this.updateLastAccessTime(filePath);
      }
    } else {
      alert("파일을 열 수 없습니다: " + result.error);
    }
  }

  // 폴더 열기
  async openFolder(filePath) {
    // 파일 존재 여부 먼저 확인
    const exists = await window.electronAPI.invoke("path-exists", filePath);
    if (!exists) {
      // 확인창 없이 자동으로 JSON에서 제거
      await this.removeFileFromList(filePath);
      Utils.updateStatus(`존재하지 않는 파일을 목록에서 제거했습니다.`);
      return;
    }

    await window.electronAPI.invoke("open-folder", filePath);
  }

  // 마지막 접근 시간 업데이트
  updateLastAccessTime(filePath) {
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    for (const type of ["video", "file"]) {
      const file = this.allFiles[type].find((f) => f.Fullpath === filePath);
      if (file) {
        file.Lasttime = now;

        // UI에도 반영
        const filteredFile = this.filteredFiles[type].find(
          (f) => f.Fullpath === filePath
        );
        if (filteredFile) {
          filteredFile.Lasttime = now;
        }

        this.saveFileData(type);
        break;
      }
    }
  }

  // 평점 업데이트
  async updateRating(filePath, rating) {
    if (this.isHybridInitialized) {
      // 하이브리드 시스템: Windows 메타데이터 + 캐시 자동 업데이트
      const result = await window.electronAPI.invoke("hybrid-update-rating", filePath, rating);
      if (result.success) {
        // 메타데이터 업데이트 이벤트가 자동으로 UI를 업데이트할 것임
        Utils.updateStatus(`평점이 업데이트되었습니다: ${'★'.repeat(rating)}`);
      } else {
        alert("평점 업데이트 실패: " + result.error);
      }
    } else {
      // 기존 시스템
      const ratingStr = rating > 0 ? "★".repeat(rating) : "";

      for (const type of ["video", "file"]) {
        const file = this.allFiles[type].find((f) => f.Fullpath === filePath);
        if (file) {
          file.Eval = ratingStr;

          // UI에도 반영
          const filteredFile = this.filteredFiles[type].find(
            (f) => f.Fullpath === filePath
          );
          if (filteredFile) {
            filteredFile.Eval = ratingStr;
          }

          this.saveFileData(type);
          break;
        }
      }
    }
  }

  // 설명 업데이트
  async updateDescription(filePath, description) {
    if (this.isHybridInitialized) {
      // 하이브리드 시스템: Windows 메타데이터 + 캐시 자동 업데이트
      const result = await window.electronAPI.invoke("hybrid-update-description", filePath, description);
      if (result.success) {
        Utils.updateStatus("설명이 업데이트되었습니다.");
      } else {
        alert("설명 업데이트 실패: " + result.error);
      }
    } else {
      // 기존 시스템
      for (const type of ["video", "file"]) {
        const file = this.allFiles[type].find((f) => f.Fullpath === filePath);
        if (file) {
          file.Desc = description;

          // UI에도 반영
          const filteredFile = this.filteredFiles[type].find(
            (f) => f.Fullpath === filePath
          );
          if (filteredFile) {
            filteredFile.Desc = description;
          }

          this.saveFileData(type);
          break;
        }
      }
    }
  }

  // 파일 데이터 저장
  async saveFileData(type) {
    const fileName = type === "video" ? "media/files.json" : "file/files.json";
    const filePath = `${this.dataPath}/${fileName}`;
    await window.electronAPI.invoke(
      "save-json-file",
      filePath,
      this.allFiles[type]
    );
  }

  // 탭 변경
  switchTab(tab) {
    this.currentTab = tab;
    this.updateUI();
  }

  // 현재 표시할 파일들 반환
  getCurrentFiles() {
    return this.filteredFiles[this.currentTab] || [];
  }

  // UI 업데이트
  updateUI() {
    const files = this.getCurrentFiles();
    Utils.updateFileCount(files.length);

    // 가상 스크롤러에 알림
    if (window.virtualScroll) {
      window.virtualScroll.updateData(files);
    }

    // 확장자 목록 업데이트
    const extensions =
      this.currentTab === "video"
        ? CONSTANTS.EXTENSIONS.VIDEO
        : CONSTANTS.EXTENSIONS.FILE;
    const extensionList = document.getElementById("extension-list");
    extensionList.textContent = `확장자: ${extensions.join(", ")}`;
  }

  // 빈 폴더 제거
  async removeEmptyFolders(libraryPath) {
    try {
      const result = await window.electronAPI.invoke(
        "remove-empty-folders",
        libraryPath
      );
      if (result.success && result.count > 0) {
        console.log(
          `${libraryPath}에서 ${result.count}개의 빈 폴더를 제거했습니다.`
        );
      }
    } catch (error) {
      console.warn("빈 폴더 삭제 실패:", error);
    }
  }

  // 목록에서 파일 제거
  async removeFileFromList(filePath) {
    for (const type of ["video", "file"]) {
      // 전체 목록에서 제거
      const allIndex = this.allFiles[type].findIndex(
        (f) => f.Fullpath === filePath
      );
      if (allIndex !== -1) {
        this.allFiles[type].splice(allIndex, 1);
        await this.saveFileData(type);
      }

      // 필터링된 목록에서도 제거
      const filteredIndex = this.filteredFiles[type].findIndex(
        (f) => f.Fullpath === filePath
      );
      if (filteredIndex !== -1) {
        this.filteredFiles[type].splice(filteredIndex, 1);
      }
    }

    // 검색 인덱스 재구축 및 UI 업데이트
    this.buildSearchIndex();
    this.updateUI();
  }

  // 중복 제거 및 정리 (빈 폴더 삭제 포함)
  async cleanup() {
    if (this.isLoading) return;

    this.isLoading = true;
    Utils.updateStatus("중복 제거 및 정리 중...");

    try {
      let totalDuplicatesRemoved = 0;
      let totalInvalidFilesRemoved = 0;
      let totalEmptyFoldersRemoved = 0;

      if (this.isHybridInitialized) {
        // 하이브리드 시스템: 고급 정리 기능
        await this.hybridCleanup();
      } else {
        // 기존 시스템: 표준 정리
        for (const type of ["video", "file"]) {
          Utils.updateStatus(`${type === "video" ? "비디오" : "압축"} 파일 정리 중...`);
          
          // 1. 존재하지 않는 파일 제거
          const validFiles = [];
          for (const file of this.allFiles[type]) {
            const exists = await window.electronAPI.invoke("path-exists", file.Fullpath);
            if (exists) {
              validFiles.push(file);
            } else {
              totalInvalidFilesRemoved++;
              console.log(`존재하지 않는 파일 제거: ${file.Filename}`);
            }
          }

          // 2. 중복 제거 (Fullpath 기준)
          const uniqueFiles = [];
          const seenPaths = new Set();

          for (const file of validFiles) {
            if (!seenPaths.has(file.Fullpath)) {
              seenPaths.add(file.Fullpath);
              uniqueFiles.push(file);
            } else {
              totalDuplicatesRemoved++;
              console.log(`중복 파일 제거: ${file.Filename}`);
            }
          }

          // 3. 추가 시간 역순 정렬
          uniqueFiles.sort((a, b) => new Date(b.Addtime) - new Date(a.Addtime));

          this.allFiles[type] = uniqueFiles;
          await this.saveFileData(type);
        }

        // 4. 빈 폴더 제거
        Utils.updateStatus("빈 폴더 제거 중...");
        totalEmptyFoldersRemoved = await this.removeAllEmptyFolders();
      }

      // 필터된 파일들 업데이트
      this.filteredFiles.video = [...this.allFiles.video];
      this.filteredFiles.file = [...this.allFiles.file];

      // 검색 인덱스 재구축
      this.buildSearchIndex();
      this.updateUI();

      // 결과 메시지
      let message = "정리 완료";
      const results = [];
      
      if (totalDuplicatesRemoved > 0) {
        results.push(`중복 ${totalDuplicatesRemoved}개 제거`);
      }
      if (totalInvalidFilesRemoved > 0) {
        results.push(`무효 파일 ${totalInvalidFilesRemoved}개 제거`);
      }
      if (totalEmptyFoldersRemoved > 0) {
        results.push(`빈 폴더 ${totalEmptyFoldersRemoved}개 제거`);
      }
      
      if (results.length > 0) {
        message += ` - ${results.join(", ")}`;
      }

      Utils.updateStatus(message);
      console.log(`정리 완료: 비디오 ${this.allFiles.video.length}개, 압축 ${this.allFiles.file.length}개`);

    } catch (error) {
      console.error("정리 실패:", error);
      Utils.updateStatus("정리 실패");
    } finally {
      this.isLoading = false;
    }
  }

  // 하이브리드 시스템 정리
  async hybridCleanup() {
    try {
      Utils.updateStatus("고급 정리 시스템 실행 중...");
      
      const result = await window.electronAPI.invoke("hybrid-advanced-cleanup");
      
      if (result.success) {
        // 결과를 기존 형식으로 변환
        this.allFiles.video = result.data.video || [];
        this.allFiles.file = result.data.file || [];
        
        // JSON 파일과 동기화
        await this.syncWithJsonFiles();
        
        console.log(`하이브리드 정리 완료:`, result.stats);
        
        return result.stats;
      } else {
        throw new Error(result.error || "하이브리드 정리 실패");
      }
    } catch (error) {
      console.warn("하이브리드 정리 실패, 기존 방식으로 폴백:", error.message);
      throw error; // 기존 시스템으로 폴백하도록 에러 재발생
    }
  }

  // 모든 라이브러리 경로의 빈 폴더 제거
  async removeAllEmptyFolders() {
    try {
      // 라이브러리 경로들 로드
      const libraryResult = await window.electronAPI.invoke(
        "load-json-file",
        `${this.dataPath}/lib.json`
      );
      
      if (!libraryResult.success) {
        console.warn("라이브러리 파일을 읽을 수 없습니다.");
        return 0;
      }

      const libraries = libraryResult.data || [];
      let totalRemoved = 0;

      // 각 라이브러리 경로에서 빈 폴더 제거
      for (const library of libraries) {
        try {
          const exists = await window.electronAPI.invoke("path-exists", library.path);
          if (exists) {
            const result = await window.electronAPI.invoke(
              "remove-empty-folders",
              library.path
            );
            
            if (result.success) {
              totalRemoved += result.count || 0;
              console.log(`${library.path}에서 ${result.count}개 빈 폴더 제거`);
            }
          } else {
            console.warn(`라이브러리 경로 접근 불가: ${library.path}`);
          }
        } catch (error) {
          console.warn(`빈 폴더 제거 실패 (${library.path}):`, error.message);
        }
      }

      return totalRemoved;
    } catch (error) {
      console.error("빈 폴더 제거 실패:", error);
      return 0;
    }
  }

  // 파일 정렬
  sortFiles(sortType) {
    const currentFiles = this.filteredFiles[this.currentTab];

    switch (sortType) {
      case "name":
        currentFiles.sort((a, b) => a.Filename.localeCompare(b.Filename, "ko"));
        break;
      case "lasttime":
        currentFiles.sort((a, b) => {
          const timeA = a.Lasttime ? new Date(a.Lasttime).getTime() : 0;
          const timeB = b.Lasttime ? new Date(b.Lasttime).getTime() : 0;
          return timeB - timeA; // 최신순
        });
        break;
      case "rating":
        currentFiles.sort((a, b) => {
          const ratingA = a.Eval ? a.Eval.length : 0;
          const ratingB = b.Eval ? b.Eval.length : 0;
          return ratingB - ratingA; // 높은 평점순
        });
        break;
      case "addtime":
        currentFiles.sort((a, b) => {
          const timeA = a.Addtime ? new Date(a.Addtime).getTime() : 0;
          const timeB = b.Addtime ? new Date(b.Addtime).getTime() : 0;
          return timeB - timeA; // 최신순
        });
        break;
      case "default":
      default:
        // 기본 정렬 (원본 순서 복원)
        this.filteredFiles[this.currentTab] = [
          ...this.allFiles[this.currentTab],
        ];
        break;
    }

    this.updateUI();
  }
}

// 전역 변수로 내보내기
window.FileManager = FileManager;
