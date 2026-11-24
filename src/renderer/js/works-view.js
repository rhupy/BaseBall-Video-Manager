// 배우 정보 화면: 그 배우의 전체 작품을 커버 격자로 표시
// - 최신작이 위, 오래된 작품일수록 아래
// - 보유한 작품에는 체크 표시
// - 목록은 출처에서 한 번 받아 저장해 두고(7일 보관), "다시 가져오기"로 갱신
class WorksView {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("works-view");
    this.filter = "all"; // all | owned | missing
    this.actress = null;
    this.result = null;
    this.requestId = 0;

    this.observer = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (!item.isIntersecting) continue;
          this.observer.unobserve(item.target);
          window.metadataManager.setImage(item.target, item.target.dataset.url);
        }
      },
      { root: this.container, rootMargin: "400px" }
    );

    this.container.addEventListener("click", (e) => {
      const chip = e.target.closest(".works-chip");
      if (chip) {
        this.filter = chip.dataset.filter;
        this.render();
        return;
      }
      if (e.target.closest(".works-refresh")) this.load(this.actress, true);
    });
  }

  show() {
    this.container.classList.remove("hidden");
  }

  hide() {
    this.container.classList.add("hidden");
  }

  // 보유한 영상의 품번 → 파일 목록
  ownedCodes() {
    const manager = window.metadataManager;
    const owned = new Map();
    for (const file of this.app.fileManager.allFiles.video) {
      const code = manager.codeOf(file);
      if (!code) continue;
      if (!owned.has(code)) owned.set(code, []);
      owned.get(code).push(file);
    }
    return owned;
  }

  async load(actress, refresh = false) {
    this.actress = actress;
    const requestId = ++this.requestId;

    if (!actress || !actress.id) {
      this.result = { success: false, error: "이 배우는 출처의 배우 번호가 없어 작품 목록을 가져올 수 없습니다." };
      this.render();
      return;
    }

    if (refresh || !this.result || this.result.actressId !== String(actress.id)) {
      this.result = null;
      this.container.innerHTML =
        `<div class="actress-empty">작품 목록을 가져오는 중입니다...<br>` +
        `<span>출처의 요청 제한 때문에 작품이 많은 배우는 수십 초가 걸릴 수 있습니다.</span></div>`;
    }

    const result = await window.electronAPI.invoke(
      "meta-actress-works",
      { id: actress.id, name: actress.name },
      refresh
    );
    if (requestId !== this.requestId) return; // 그 사이 다른 배우로 이동함
    this.result = result;
    this.render();
  }

  render() {
    const escape = (text) => Utils.escapeHtml(text || "");
    this.observer.disconnect();

    if (!this.result) return;
    if (!this.result.success) {
      this.container.innerHTML =
        `<div class="actress-empty">작품 목록을 가져오지 못했습니다.<br><span>${escape(this.result.error)}</span><br>` +
        (this.actress && this.actress.id ? `<button class="works-refresh">다시 시도</button>` : "") +
        `</div>`;
      Utils.updateFileCount(0);
      return;
    }

    const owned = this.ownedCodes();
    const works = this.result.works || [];
    const ownedCount = works.filter((work) => owned.has(work.code)).length;
    const visible = works.filter((work) => {
      if (this.filter === "owned") return owned.has(work.code);
      if (this.filter === "missing") return !owned.has(work.code);
      return true;
    });

    const chip = (id, label, count) =>
      `<button class="works-chip${this.filter === id ? " active" : ""}" data-filter="${id}">${label} ${count}</button>`;
    const fetched = this.result.fetchedAt ? Utils.formatDateCompact(this.result.fetchedAt) : "";

    const toolbar =
      `<div class="works-toolbar">` +
      chip("all", "전체", works.length) +
      chip("owned", "보유", ownedCount) +
      chip("missing", "미보유", works.length - ownedCount) +
      `<span class="works-note">최신작이 위 · ${escape(fetched)} 기준` +
      (this.result.stale ? ` · <span class="meta-error">갱신 실패(${escape(this.result.error)}), 저장된 목록 표시</span>` : "") +
      `</span>` +
      `<button class="works-refresh" title="출처에서 목록을 다시 받아옵니다">다시 가져오기</button>` +
      `</div>`;

    const cards = visible
      .map((work) => {
        const files = owned.get(work.code);
        const tooltip = files
          ? `${work.title}\n\n보유 파일:\n${files.map((file) => file.Filename).join("\n")}`
          : work.title;
        return (
          `<div class="work-card${files ? " owned" : ""}" title="${escape(tooltip)}">` +
          `<div class="work-cover">` +
          (work.cover ? `<img data-url="${escape(work.cover)}" alt="" />` : "") +
          (files ? `<span class="work-owned" title="보유 중">✓</span>` : "") +
          `</div>` +
          `<div class="work-code">${escape(work.code)}<span>${escape(work.releaseDate)}</span></div>` +
          `<div class="work-title">${escape(work.title)}</div>` +
          `</div>`
        );
      })
      .join("");

    this.container.innerHTML =
      toolbar +
      (cards
        ? `<div class="works-grid">${cards}</div>`
        : `<div class="actress-empty">해당하는 작품이 없습니다.</div>`);

    this.container.querySelectorAll("img[data-url]").forEach((img) => this.observer.observe(img));
    Utils.updateFileCount(visible.length);
  }
}

window.WorksView = WorksView;
