// 가상 스크롤링 구현 - 대용량 데이터 성능 최적화
class VirtualScroll {
  constructor(container, itemHeight = 45) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.data = [];
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.scrollTop = 0;
    this.containerHeight = 0;

    // DOM 요소들
    this.viewport = null;
    this.content = null;

    this.init();
  }

  init() {
    // 가상 스크롤 컨테이너 설정
    this.container.style.position = "relative";
    this.container.style.overflow = "auto";
    this.container.style.height = "100%";

    // 뷰포트 생성
    this.viewport = document.createElement("div");
    this.viewport.style.position = "relative";
    this.viewport.style.overflow = "hidden";
    this.viewport.style.height = "100%";

    // 콘텐츠 컨테이너 생성
    this.content = document.createElement("div");
    this.content.style.position = "absolute";
    this.content.style.top = "0";
    this.content.style.left = "0";
    this.content.style.right = "0";

    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);

    // 스크롤 이벤트 리스너
    this.container.addEventListener(
      "scroll",
      Utils.throttle(() => {
        this.handleScroll();
      }, CONSTANTS.SCROLL_THROTTLE)
    );

    // 리사이즈 이벤트 리스너
    window.addEventListener(
      "resize",
      Utils.debounce(() => {
        this.updateLayout();
      }, 100)
    );

    this.updateLayout();
  }

  // 데이터 업데이트
  updateData(newData) {
    this.data = newData || [];
    this.updateLayout();
    this.render();
  }

  // 레이아웃 업데이트
  updateLayout() {
    this.containerHeight = this.container.clientHeight;
    const visibleItemCount =
      Math.ceil(this.containerHeight / this.itemHeight) + 5; // 버퍼 추가

    this.visibleEnd = Math.min(
      this.visibleStart + visibleItemCount,
      this.data.length
    );

    // 전체 높이 설정
    const totalHeight = this.data.length * this.itemHeight;
    this.viewport.style.height = `${totalHeight}px`;
  }

  // 스크롤 핸들링
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    const newVisibleStart = Math.floor(this.scrollTop / this.itemHeight);

    if (newVisibleStart !== this.visibleStart) {
      this.visibleStart = newVisibleStart;
      this.updateLayout();
      this.render();
    }
  }

  // 가상 스크롤 렌더링
  render() {
    if (!this.data.length) {
      this.content.innerHTML = '<div class="no-files">파일이 없습니다.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    // 상단 오프셋 설정
    this.content.style.transform = `translateY(${
      this.visibleStart * this.itemHeight
    }px)`;

    // 보이는 항목들만 렌더링
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      if (i >= this.data.length) break;

      const item = this.data[i];
      const element = this.createItemElement(item, i);
      fragment.appendChild(element);
    }

    this.content.innerHTML = "";
    this.content.appendChild(fragment);
    
    // 최근 실행 파일 강조 효과 업데이트
    this.updateRecentlyExecutedHighlight();
  }

  // 개별 아이템 엘리먼트 생성
  createItemElement(file, index) {
    const item = document.createElement("div");
    item.className = "file-item";
    item.style.height = `${this.itemHeight}px`;
    item.dataset.index = index;
    item.dataset.fullpath = file.Fullpath;

    // 마지막 실행 파일 강조 표시
    if (window.app && window.app.lastExecutedFile === file.Fullpath) {
      item.classList.add("recently-executed");
    }

    const fileName = Utils.escapeHtml(file.Filename);
    const lastTime = Utils.formatDate(file.Lasttime);
    const addTime = Utils.formatDate(file.Addtime);
    const rating = Utils.generateStarRating(file.Eval);
    const description = Utils.escapeHtml(file.Desc || "");

    item.innerHTML = `
      <div class="file-item-content">
        <div class="file-main">
          <div class="file-name" title="${fileName}">${fileName}</div>
          <div class="file-actions">
            <div class="file-times">
              <span class="add-time" title="${window.i18n ? window.i18n.t('addTime') : '추가 시각'}">${window.i18n ? window.i18n.t('addTime') : '추가시각:'} ${addTime}</span>
              ${
                lastTime
                  ? `<span class="last-time" title="${window.i18n ? window.i18n.t('lastTime') : '마지막 실행 시각'}"><strong>${window.i18n ? window.i18n.t('lastTime') : '실행시각:'} ${lastTime}</strong></span>`
                  : ""
              }
            </div>
            <button class="btn-action btn-play" title="실행">▶</button>
            <button class="btn-action btn-folder" title="폴더 열기">📁</button>
            <button class="btn-action btn-delete" title="삭제">🗑</button>
            <div class="file-rating" data-fullpath="${file.Fullpath}">
              ${rating}
            </div>
          </div>
        </div>
        ${
          description
            ? `<div class="file-description">${description}</div>`
            : ""
        }
      </div>
    `;

    // 이벤트 리스너 추가
    this.attachItemEventListeners(item, file);

    return item;
  }

  // 아이템 이벤트 리스너 추가
  attachItemEventListeners(item, file) {
    // 실행 버튼
    const playBtn = item.querySelector(".btn-play");
    playBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      
      // 이전에 강조된 파일 제거
      this.clearRecentlyExecuted();
      
      // 현재 파일을 마지막 실행 파일로 설정
      if (window.app) {
        window.app.lastExecutedFile = file.Fullpath;
      }
      
      // 현재 항목에 강조 표시
      item.classList.add("recently-executed");
      
      // 파일 실행
      await window.fileManager.executeFile(file.Fullpath);
      
      // 실행 시간 업데이트를 위해 UI 새로고침 (실시간)
      setTimeout(() => {
        this.updateFileTimeDisplay(file.Fullpath);
      }, 100);
    });

    // 폴더 열기 버튼
    const folderBtn = item.querySelector(".btn-folder");
    folderBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.fileManager.openFolder(file.Fullpath);
    });

    // 삭제 버튼 (실제 파일 삭제)
    const deleteBtn = item.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      if (
        confirm("파일을 삭제하시겠습니까?\n\n⚠️ 실제 파일이 완전히 삭제됩니다.")
      ) {
        this.deleteFile(file.Fullpath);
      }
    });

    // 별점 클릭 이벤트
    const stars = item.querySelectorAll(".star");
    stars.forEach((star, index) => {
      star.addEventListener("click", (e) => {
        e.stopPropagation();
        const clickedRating = index + 1;

        // 현재 활성화된 별의 개수로 현재 평점 확인
        const activeStars = item.querySelectorAll(".star.active");
        const currentRating = activeStars.length;

        // 현재 평점과 클릭한 평점이 같으면 0점으로 설정, 다르면 클릭한 평점으로 설정
        const newRating = currentRating === clickedRating ? 0 : clickedRating;

        // 파일 객체의 Eval 값도 업데이트
        file.Eval = newRating > 0 ? "★".repeat(newRating) : "";

        window.fileManager.updateRating(file.Fullpath, newRating);
        this.updateStarRating(item, newRating);
      });

      // 별점에서 더블클릭 이벤트 전파 차단
      star.addEventListener("dblclick", (e) => {
        e.stopPropagation();
      });
    });

    // 더블클릭으로 실행
    item.addEventListener("dblclick", () => {
      window.fileManager.executeFile(file.Fullpath);
    });

    // 우클릭 컨텍스트 메뉴 (향후 구현)
    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // 컨텍스트 메뉴 표시 로직
    });
  }

  // 별점 업데이트
  updateStarRating(item, rating) {
    const stars = item.querySelectorAll(".star");
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add("active");
      } else {
        star.classList.remove("active");
      }
    });
  }

  // 파일 삭제 (실제 파일 + JSON 동시 삭제)
  async deleteFile(fullpath) {
    try {
      // 실제 파일 시스템에서 삭제
      const deleteResult = await window.electronAPI.invoke(
        "delete-file",
        fullpath
      );
      if (!deleteResult.success) {
        alert("파일 삭제 실패: " + deleteResult.error);
        return;
      }

      Utils.updateStatus("파일이 삭제되었습니다.");

      // JSON 데이터에서도 즉시 제거
      for (const type of ["video", "file"]) {
        const index = window.fileManager.allFiles[type].findIndex(
          (f) => f.Fullpath === fullpath
        );
        if (index !== -1) {
          window.fileManager.allFiles[type].splice(index, 1);
          window.fileManager.saveFileData(type);
          break;
        }
      }

      // 필터링된 데이터에서도 제거
      for (const type of ["video", "file"]) {
        const index = window.fileManager.filteredFiles[type].findIndex(
          (f) => f.Fullpath === fullpath
        );
        if (index !== -1) {
          window.fileManager.filteredFiles[type].splice(index, 1);
          break;
        }
      }

      // UI 업데이트
      window.fileManager.updateUI();
    } catch (error) {
      console.error("파일 삭제 실패:", error);
      alert("파일 삭제에 실패했습니다.");
    }
  }

  // 특정 아이템으로 스크롤
  scrollToItem(index) {
    const targetScrollTop = index * this.itemHeight;
    this.container.scrollTop = targetScrollTop;
  }

  // 현재 보이는 범위 반환
  getVisibleRange() {
    return {
      start: this.visibleStart,
      end: this.visibleEnd,
      total: this.data.length,
    };
  }

  // 이전에 강조된 파일 제거
  clearRecentlyExecuted() {
    const previouslyExecuted = this.container.querySelectorAll('.recently-executed');
    previouslyExecuted.forEach(item => {
      item.classList.remove('recently-executed');
    });
  }

  // 특정 파일의 실행 시간 표시 업데이트
  updateFileTimeDisplay(filePath) {
    try {
      // 현재 보이는 파일 항목들에서 해당 파일 찾기
      const fileItems = this.container.querySelectorAll('.file-item');
      
      for (const item of fileItems) {
        if (item.dataset.fullpath === filePath) {
          // 파일 매니저에서 최신 데이터 가져오기
          const updatedFile = this.findFileInManager(filePath);
          if (updatedFile && updatedFile.Lasttime) {
            const lastTimeSpan = item.querySelector('.last-time');
            const timesContainer = item.querySelector('.file-times');
            
            const formattedTime = Utils.formatDate(updatedFile.Lasttime);
            
            if (lastTimeSpan) {
              // 기존 실행시각 업데이트
              lastTimeSpan.innerHTML = `<strong>${window.i18n ? window.i18n.t('lastTime') : '실행시각:'} ${formattedTime}</strong>`;
            } else {
              // 새로운 실행시각 추가
              const newLastTimeSpan = document.createElement('span');
              newLastTimeSpan.className = 'last-time';
              newLastTimeSpan.title = '마지막 실행 시각';
              newLastTimeSpan.innerHTML = `<strong>${window.i18n ? window.i18n.t('lastTime') : '실행시각:'} ${formattedTime}</strong>`;
              timesContainer.appendChild(newLastTimeSpan);
            }
            
            // 업데이트 애니메이션 효과
            const timeElement = item.querySelector('.last-time');
            if (timeElement) {
              timeElement.classList.add('updating');
              
              setTimeout(() => {
                timeElement.classList.remove('updating');
              }, 1500);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.warn('실행 시간 표시 업데이트 실패:', error);
    }
  }

  // 파일 매니저에서 파일 정보 찾기
  findFileInManager(filePath) {
    try {
      const allFiles = [
        ...window.fileManager.allFiles.video,
        ...window.fileManager.allFiles.file
      ];
      
      return allFiles.find(file => file.Fullpath === filePath);
    } catch (error) {
      console.warn('파일 정보 조회 실패:', error);
      return null;
    }
  }

  // 최근 실행 파일 강조 효과 업데이트
  updateRecentlyExecutedHighlight() {
    if (window.app && window.app.lastExecutedFile) {
      const lastExecutedPath = window.app.lastExecutedFile;
      const fileItems = this.container.querySelectorAll('.file-item');
      
      fileItems.forEach(item => {
        if (item.dataset.fullpath === lastExecutedPath) {
          item.classList.add('recently-executed');
        } else {
          item.classList.remove('recently-executed');
        }
      });
    }
  }

  // 리소스 정리
  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

// 전역 변수로 내보내기
window.VirtualScroll = VirtualScroll;
