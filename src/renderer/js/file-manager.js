// 고성능 파일 매니저 클래스
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
  }

  // 초기화
  async init() {
    try {
      this.dataPath = await window.electronAPI.invoke("get-data-path");
      await this.loadAllFiles();
      this.buildSearchIndex();
      Utils.updateStatus("파일 로딩 완료");
    } catch (error) {
      console.error("FileManager 초기화 실패:", error);
      Utils.updateStatus("초기화 실패");
    }
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

  // 자동 동기화 (앱 시작시)
  async autoSync() {
    return await this.refreshFiles(true);
  }

  // 파일 새로고침 (디렉토리 스캔)
  async refreshFiles(isAutoSync = false) {
    if (this.isLoading) return;

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
      this.updateLastAccessTime(filePath);
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
  updateRating(filePath, rating) {
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

  // 설명 업데이트
  updateDescription(filePath, description) {
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

  // 중복 제거 및 정리
  async cleanup() {
    if (this.isLoading) return;

    this.isLoading = true;
    Utils.updateStatus("중복 제거 및 정리 중...");

    try {
      for (const type of ["video", "file"]) {
        // 중복 제거 (Fullpath 기준)
        const uniqueFiles = [];
        const seenPaths = new Set();

        for (const file of this.allFiles[type]) {
          if (!seenPaths.has(file.Fullpath)) {
            seenPaths.add(file.Fullpath);
            uniqueFiles.push(file);
          }
        }

        this.allFiles[type] = uniqueFiles;
        await this.saveFileData(type);
      }

      this.filteredFiles.video = [...this.allFiles.video];
      this.filteredFiles.file = [...this.allFiles.file];

      this.buildSearchIndex();
      this.updateUI();

      Utils.updateStatus("정리 완료");
    } catch (error) {
      console.error("정리 실패:", error);
      Utils.updateStatus("정리 실패");
    } finally {
      this.isLoading = false;
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
