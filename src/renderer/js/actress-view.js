// 배우 보기: 배우 썸네일 카드를 격자로 표시
// - 좋아요한 배우가 먼저, 그다음 보유 영상이 많은 순
// - 카드를 누르면 그 배우의 영상 목록(행 그리드)으로 이동
class ActressView {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("actress-view");
    this.entries = [];
    this.visible = false;

    // 화면에 들어온 카드만 이미지를 불러옴
    this.observer = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (!item.isIntersecting) continue;
          this.observer.unobserve(item.target);
          window.metadataManager.setImage(item.target, item.target.dataset.url);
        }
      },
      { root: this.container, rootMargin: "300px" }
    );

    this.container.addEventListener("click", (e) => {
      const card = e.target.closest(".actress-card");
      if (!card) return;

      if (e.target.closest(".actress-like")) {
        this.toggleLike(card.dataset.key);
      } else {
        this.app.navigate({ view: "list", actress: card.dataset.key });
      }
    });
  }

  async toggleLike(key) {
    await window.metadataManager.toggleLike(key);
    this.render({ keepScroll: true });
  }

  show() {
    this.visible = true;
    this.container.classList.remove("hidden");
  }

  hide() {
    this.visible = false;
    this.container.classList.add("hidden");
  }

  // 현재 조건(배우 검색어)에 맞는 배우 목록
  collect() {
    const manager = window.metadataManager;
    const fileManager = this.app.fileManager;
    const index = manager.buildActressIndex(fileManager.allFiles.video);
    const words = fileManager.getActressWords();

    let actresses = index.actresses;
    if (words.length > 0) {
      actresses = actresses.filter((entry) => MetadataManager.nameMatches(entry, words));
    }

    const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
    actresses.sort(
      (a, b) =>
        Number(b.liked) - Number(a.liked) ||
        b.files.length - a.files.length ||
        collator.compare(a.name, b.name)
    );

    return { actresses, unassigned: words.length > 0 ? [] : index.unassigned, total: index.actresses.length };
  }

  render({ keepScroll = false } = {}) {
    const scrollTop = keepScroll ? this.container.scrollTop : 0;
    const { actresses, unassigned, total } = this.collect();
    const escape = (text) => Utils.escapeHtml(text || "");
    this.observer.disconnect();

    const cards = actresses.map((entry) => {
      const initial = escape((entry.name || "?").trim().charAt(0).toUpperCase());
      return (
        `<div class="actress-card${entry.liked ? " liked" : ""}" data-key="${escape(entry.key)}" title="${escape(entry.name)} ${escape(entry.nameJa)}">` +
        `<div class="actress-photo"><span class="actress-initial">${initial}</span>` +
        (entry.image ? `<img data-url="${escape(entry.image)}" alt="" />` : "") +
        `<button class="actress-like" title="좋아요">♥</button>` +
        `<span class="actress-count">${entry.files.length}</span></div>` +
        `<div class="actress-name">${escape(entry.name)}</div>` +
        `<div class="actress-sub">${escape(entry.nameJa)}</div>` +
        `</div>`
      );
    });

    if (unassigned.length > 0) {
      cards.push(
        `<div class="actress-card unassigned" data-key="${MetadataManager.UNASSIGNED}" title="배우 정보가 없는 영상">` +
          `<div class="actress-photo"><span class="actress-initial">?</span>` +
          `<span class="actress-count">${unassigned.length}</span></div>` +
          `<div class="actress-name">미분류</div>` +
          `<div class="actress-sub">배우 정보 없음</div>` +
          `</div>`
      );
    }

    if (actresses.length === 0 && total === 0) {
      this.container.innerHTML =
        `<div class="actress-empty">아직 배우 정보가 없습니다.<br>` +
        `품번이 있는 영상의 정보를 백그라운드에서 수집하는 중이며, 수집되는 대로 여기에 표시됩니다.<br>` +
        `<span>상단의 "영상 정보" 버튼에서 수집 상태와 출처를 확인할 수 있습니다.</span></div>` +
        (cards.length > 0 ? `<div class="actress-grid">${cards.join("")}</div>` : "");
    } else if (cards.length === 0) {
      this.container.innerHTML = `<div class="actress-empty">검색어에 맞는 배우가 없습니다.</div>`;
    } else {
      this.container.innerHTML = `<div class="actress-grid">${cards.join("")}</div>`;
    }

    this.container.querySelectorAll("img[data-url]").forEach((img) => this.observer.observe(img));
    this.container.scrollTop = scrollTop;
    Utils.updateFileCount(actresses.length);
    this.entries = actresses;
  }

  // 키로 배우 정보 찾기 (목록 화면 상단 표시용)
  find(key) {
    if (key === MetadataManager.UNASSIGNED) {
      return { key, name: "미분류", nameJa: "배우 정보 없음", image: "", liked: false };
    }
    const index = window.metadataManager.buildActressIndex(this.app.fileManager.allFiles.video);
    return index.actresses.find((entry) => entry.key === key) || null;
  }
}

window.ActressView = ActressView;
