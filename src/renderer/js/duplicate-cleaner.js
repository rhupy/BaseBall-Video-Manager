// 중복 일괄정리: 중복 보기에 표시된 묶음마다 하나만 남기고 나머지를 삭제
// 실행 전에 무엇을 남기고 지울지 미리보기로 보여 주고, 확인을 받은 뒤에만 삭제한다.
class DuplicateCleaner {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.plan = null;
    this.isRunning = false;

    this.modal = document.getElementById("dedupe-modal");
    this.keywordsInput = document.getElementById("dedupe-keywords");
    this.trashCheckbox = document.getElementById("dedupe-trash");
    this.summary = document.getElementById("dedupe-summary");
    this.preview = document.getElementById("dedupe-preview");
    this.runButton = document.getElementById("dedupe-run");

    this.keywordsInput.value = localStorage.getItem("app-dedupe-keywords") || "";
    this.trashCheckbox.checked = localStorage.getItem("app-dedupe-trash") !== "false";

    document.getElementById("dedupe-open").addEventListener("click", () => this.open());
    document.getElementById("dedupe-close").addEventListener("click", () => this.close());
    document.getElementById("dedupe-cancel").addEventListener("click", () => this.close());
    this.runButton.addEventListener("click", () => this.run());
    this.keywordsInput.addEventListener("input", () => this.refreshPlan());
    this.trashCheckbox.addEventListener("change", () => this.renderSummary());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.modal.classList.contains("hidden")) this.close();
    });
  }

  getKeywords() {
    return this.keywordsInput.value
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean);
  }

  open() {
    if (!this.fileManager.duplicateMode) return;
    this.modal.classList.remove("hidden");
    this.refreshPlan();
    this.keywordsInput.focus();
  }

  close() {
    if (this.isRunning) return;
    this.modal.classList.add("hidden");
  }

  // 현재 화면에 표시된 묶음(탭 + 검색어 적용)을 대상으로 계획 수립
  refreshPlan() {
    const groups = this.fileManager.getDuplicateGroups();
    this.plan = DuplicateFinder.planAutoRemove(groups, { keywords: this.getKeywords() });
    this.renderSummary();
    this.renderPreview();
  }

  getRemoveList() {
    return this.plan ? this.plan.actions.flatMap((action) => action.remove) : [];
  }

  renderSummary() {
    const removeList = this.getRemoveList();
    const totalBytes = removeList.reduce((sum, file) => sum + (file.Size || 0), 0);
    const skipped = this.plan.skipped.length;
    const method = this.trashCheckbox.checked ? "휴지통으로 이동" : "완전 삭제 (복구 불가)";

    this.summary.innerHTML =
      `<strong>${this.plan.actions.length}</strong>개 묶음에서 ` +
      `<strong>${removeList.length}</strong>개 파일 삭제 예정 ` +
      `(${Utils.formatSizeGB(totalBytes) || "0.00GB"}) · ${method}` +
      `<br>삭제 후 비게 되는 폴더는 함께 삭제됩니다.` +
      (skipped > 0 ? `<br><span class="dedupe-skip-note">건너뛰는 묶음 ${skipped}개 (아래 목록 끝에 표시, 직접 확인 필요)</span>` : "");
    this.summary.classList.toggle("danger", !this.trashCheckbox.checked);
    this.runButton.disabled = removeList.length === 0;
  }

  renderPreview() {
    const MAX_GROUPS = 500; // 화면에 그릴 최대 묶음 수 (삭제 자체는 전체 대상)
    const escape = (text) => Utils.escapeHtml(text || "");
    const row = (file, kept) =>
      `<div class="dedupe-row ${kept ? "keep" : "remove"}">` +
      `<span class="dedupe-mark">${kept ? "남김" : "삭제"}</span>` +
      `<span class="dedupe-name" title="${escape(file.Fullpath)}">${escape(file.Filename)}</span>` +
      `<span class="dedupe-size">${Utils.formatSizeGB(file.Size) || "-"}</span>` +
      `</div>`;

    const parts = [];
    this.plan.actions.slice(0, MAX_GROUPS).forEach((action) => {
      parts.push(
        `<div class="dedupe-group">` +
          `<div class="dedupe-group-title">${escape(action.label)}<span>${escape(action.reason)}</span></div>` +
          row(action.keep, true) +
          action.remove.map((file) => row(file, false)).join("") +
          `</div>`
      );
    });
    if (this.plan.actions.length > MAX_GROUPS) {
      parts.push(`<div class="dedupe-more">… 외 ${this.plan.actions.length - MAX_GROUPS}개 묶음 (같은 규칙으로 처리)</div>`);
    }

    this.plan.skipped.slice(0, MAX_GROUPS).forEach((group) => {
      parts.push(
        `<div class="dedupe-group skipped">` +
          `<div class="dedupe-group-title">${escape(group.label)}<span>건너뜀: ${escape(group.reason)}</span></div>` +
          group.files
            .map(
              (file) =>
                `<div class="dedupe-row"><span class="dedupe-mark">유지</span>` +
                `<span class="dedupe-name" title="${escape(file.Fullpath)}">${escape(file.Filename)}</span>` +
                `<span class="dedupe-size">${Utils.formatSizeGB(file.Size) || "-"}</span></div>`
            )
            .join("") +
          `</div>`
      );
    });

    this.preview.innerHTML =
      parts.join("") || `<div class="dedupe-more">정리할 중복 묶음이 없습니다.</div>`;
    this.preview.scrollTop = 0;
  }

  async run() {
    if (this.isRunning || !this.plan) return;

    const removeList = this.getRemoveList();
    if (removeList.length === 0) return;

    const useTrash = this.trashCheckbox.checked;
    const confirmed = confirm(
      `${this.plan.actions.length}개 묶음에서 ${removeList.length}개 파일을 ` +
        (useTrash ? "휴지통으로 보냅니다." : "완전히 삭제합니다.\n\n⚠️ 복구할 수 없습니다.") +
        "\n\n계속하시겠습니까?"
    );
    if (!confirmed) return;

    localStorage.setItem("app-dedupe-keywords", this.keywordsInput.value);
    localStorage.setItem("app-dedupe-trash", String(useTrash));

    this.isRunning = true;
    this.runButton.disabled = true;

    const deleted = new Set();
    const failures = [];
    let removedFolderCount = 0;

    try {
      const CHUNK = 10;
      for (let start = 0; start < removeList.length; start += CHUNK) {
        const chunk = removeList.slice(start, start + CHUNK);
        this.summary.textContent = `삭제 중... ${start} / ${removeList.length}`;

        const results = await window.electronAPI.invoke(
          "delete-files",
          chunk.map((file) => file.Fullpath),
          useTrash
        );
        results.forEach((result, i) => {
          if (result.success) {
            deleted.add(chunk[i]);
            removedFolderCount += (result.removedFolders || []).length;
          }
          else failures.push({ file: chunk[i], error: result.error });
        });
      }

      // 지워진 파일의 평점은 더 높으면 남긴 파일에 반영, 메모/실행시각은 남긴 파일에 없을 때만 옮김
      for (const action of this.plan.actions) {
        const gone = action.remove.filter((file) => deleted.has(file));
        if (gone.length === 0) continue;
        const keep = action.keep;
        // 평점은 묶음에서 가장 높은 값을 남긴 파일에 유지
        keep.Eval = gone.reduce(
          (best, f) => ((f.Eval || "").length > best.length ? f.Eval : best),
          keep.Eval || ""
        );
        if (!keep.Desc) keep.Desc = (gone.find((f) => f.Desc) || {}).Desc || "";
        if (!keep.Lasttime) {
          keep.Lasttime = gone.map((f) => f.Lasttime || "").sort().pop() || "";
        }
      }

      await this.fileManager.removeFiles(deleted);
    } catch (error) {
      console.error("중복 일괄정리 실패:", error);
      alert("중복 일괄정리 중 오류가 발생했습니다: " + error.message);
    } finally {
      this.isRunning = false;
    }

    let message = `중복 일괄정리 완료 - ${deleted.size}개 삭제`;
    if (removedFolderCount > 0) message += `, 빈 폴더 ${removedFolderCount}개 삭제`;
    if (failures.length > 0) message += `, ${failures.length}개 실패`;
    Utils.updateStatus(message);

    if (failures.length > 0) {
      alert(
        `${failures.length}개 파일을 삭제하지 못했습니다.\n\n` +
          failures.slice(0, 5).map((f) => `${f.file.Filename}\n  → ${f.error}`).join("\n") +
          (failures.length > 5 ? `\n… 외 ${failures.length - 5}개` : "") +
          (useTrash ? "\n\n휴지통을 쓸 수 없는 드라이브(네트워크 등)라면 '휴지통으로 보내기'를 해제해야 합니다." : "")
      );
      this.refreshPlan();
    } else {
      this.modal.classList.add("hidden");
    }
  }
}

window.DuplicateCleaner = DuplicateCleaner;
