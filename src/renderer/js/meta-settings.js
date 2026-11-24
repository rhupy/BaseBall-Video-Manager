// 영상 정보 설정 창: 자동 수집 켜기/끄기, 출처 선택과 우선순위, 서비스 상태 확인
class MetaSettings {
  constructor() {
    this.modal = document.getElementById("meta-modal");
    this.list = document.getElementById("meta-sources");
    this.autoFetch = document.getElementById("meta-auto-fetch");
    this.statusLine = document.getElementById("meta-progress");
    this.state = null;
    this.checks = {}; // 출처 id → 상태 확인 결과

    document.getElementById("meta-settings-btn").addEventListener("click", () => this.open());
    document.getElementById("meta-close").addEventListener("click", () => this.close());
    document.getElementById("meta-cancel").addEventListener("click", () => this.close());
    document.getElementById("meta-save").addEventListener("click", () => this.save());
    document.getElementById("meta-check").addEventListener("click", () => this.check());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.modal.classList.contains("hidden")) this.close();
    });

    this.list.addEventListener("click", (e) => {
      const row = e.target.closest(".meta-source");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (e.target.closest(".meta-up")) this.move(index, -1);
      if (e.target.closest(".meta-down")) this.move(index, 1);
    });
  }

  async open() {
    this.state = await window.electronAPI.invoke("meta-describe");
    this.checks = {};
    this.render();
    this.modal.classList.remove("hidden");
  }

  close() {
    this.modal.classList.add("hidden");
  }

  // 화면의 입력값을 state에 반영
  collect() {
    this.state.autoFetch = this.autoFetch.checked;
    this.list.querySelectorAll(".meta-source").forEach((row) => {
      const source = this.state.sources[Number(row.dataset.index)];
      source.enabled = row.querySelector(".meta-enabled").checked;
      row.querySelectorAll(".meta-config").forEach((input) => {
        source.config[input.dataset.key] = input.value.trim();
      });
    });
  }

  move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= this.state.sources.length) return;
    this.collect();
    const [moved] = this.state.sources.splice(index, 1);
    this.state.sources.splice(target, 0, moved);
    this.render();
  }

  render() {
    const escape = (text) => Utils.escapeHtml(text || "");
    this.autoFetch.checked = this.state.autoFetch;

    this.list.innerHTML = this.state.sources
      .map((source, index) => {
        const check = this.checks[source.id];
        let badge = `<span class="meta-badge">확인 전</span>`;
        if (check) {
          badge = check.ok
            ? `<span class="meta-badge ok">정상 (${check.ms}ms)</span>`
            : `<span class="meta-badge bad" title="${escape(check.message)}">응답 없음</span>`;
        } else if (source.down) {
          badge = `<span class="meta-badge bad" title="${escape(source.lastError)}">연속 실패로 일시 중지</span>`;
        } else if (source.lastOkAt) {
          badge = `<span class="meta-badge ok">정상</span>`;
        }

        const fields = (source.configFields || [])
          .map(
            (field) =>
              `<label class="meta-field"><span>${escape(field.label)}</span>` +
              `<input class="meta-config" data-key="${escape(field.key)}" type="${field.secret ? "password" : "text"}" ` +
              `value="${escape(source.config[field.key])}" /></label>`
          )
          .join("");

        return (
          `<div class="meta-source" data-index="${index}">` +
          `<div class="meta-source-head">` +
          `<span class="meta-order">${index + 1}</span>` +
          `<label class="meta-source-name"><input type="checkbox" class="meta-enabled" ${source.enabled ? "checked" : ""} />` +
          `<strong>${escape(source.name)}</strong></label>` +
          badge +
          `<span class="meta-move"><button class="meta-up" title="우선순위 올리기" ${index === 0 ? "disabled" : ""}>▲</button>` +
          `<button class="meta-down" title="우선순위 내리기" ${index === this.state.sources.length - 1 ? "disabled" : ""}>▼</button></span>` +
          `</div>` +
          `<div class="meta-source-desc">${escape(source.description)}` +
          (check && !check.ok ? `<br><span class="meta-error">${escape(check.message)}</span>` : "") +
          `</div>` +
          fields +
          `</div>`
        );
      })
      .join("");

    const status = this.state.status || {};
    this.statusLine.textContent =
      `저장된 영상 정보 ${status.known || 0}개` +
      (status.pending > 0 ? ` · 수집 대기 ${status.pending}개` : "") +
      (status.paused ? ` · ${status.message}` : "");
  }

  async check() {
    const button = document.getElementById("meta-check");
    button.disabled = true;
    button.textContent = "확인 중...";
    try {
      // 입력 중인 설정(키 등)으로 확인할 수 있게 먼저 저장
      this.collect();
      await window.electronAPI.invoke("meta-update-settings", this.state);
      const results = await window.electronAPI.invoke("meta-check-sources");
      this.checks = {};
      for (const result of results) this.checks[result.id] = result;
      this.state = await window.electronAPI.invoke("meta-describe");
      this.render();
    } finally {
      button.disabled = false;
      button.textContent = "상태 확인";
    }
  }

  async save() {
    this.collect();
    const result = await window.electronAPI.invoke("meta-update-settings", this.state);
    if (!result.success) {
      alert("설정 저장 실패: " + result.error);
      return;
    }
    this.close();
    Utils.updateStatus("영상 정보 설정이 저장되었습니다.");

    // 출처를 켰다면 아직 정보가 없는 영상 수집 시작
    if (window.fileManager && window.metadataManager) {
      window.metadataManager.requestMissing(window.fileManager.allFiles.video);
    }
  }
}

window.MetaSettings = MetaSettings;
