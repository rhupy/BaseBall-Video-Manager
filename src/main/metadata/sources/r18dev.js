// 출처 어댑터: R18.dev (가입 없이 품번으로 JSON 조회)
//
// 어댑터 규약 (새 출처를 추가할 때 이 형태를 따른다):
//   id, name, description   식별자와 설정 화면 표시용 문구
//   defaultEnabled          처음 설치 시 켜 둘지
//   minInterval             요청 사이 최소 간격(ms)
//   imageHosts              이 출처가 돌려주는 이미지의 호스트 (내려받기 허용 목록)
//   configFields            설정 화면에서 입력받을 값 [{ key, label, secret }]
//   lookup(code, ctx)       품번 조회 → 정보 객체 | null(없음). 일시적 오류는 예외를 던진다
//   check(ctx)              서비스가 살아 있는지 확인 → { ok, message }
//   listWorks(actress, ctx) (선택) 배우의 전체 작품 목록 → [{ code, title, releaseDate, cover }]
//   ctx = { fetchJson(url), wait(ms), config }
//   fetchJson은 404면 null, 그 외 오류는 예외 (429는 error.retryAfter에 대기 초가 담김)
const API_BASE = "https://r18.dev/videos/vod/movies/detail/-";
const LIST_BASE = "https://r18.dev/videos/vod/movies/list2/json";
const ACTRESS_IMAGE_BASE = "https://pics.dmm.co.jp/mono/actjpgs/";
const CHECK_CODE = "SSIS-001"; // 상태 확인용으로 조회할 품번

module.exports = {
  id: "r18dev",
  name: "R18.dev",
  description: "가입 없이 품번으로 조회. 제목, 출시일, 배우(사진 포함), 커버 제공. FC2·날짜형 번호는 미지원",
  defaultEnabled: true,
  minInterval: 2000,
  imageHosts: ["pics.dmm.co.jp", "awsimgsrc.dmm.co.jp"],
  configFields: [],

  async lookup(code, ctx) {
    const summary = await ctx.fetchJson(`${API_BASE}/dvd_id=${encodeURIComponent(code)}/json`);
    if (!summary) return null;

    // 상세 정보(배우 번호/사진, 일본어 이름 등)
    // 상세가 없으면(404) 요약만으로 돌려주고, 요청 제한 등 일시적 오류면 예외를 던져
    // 반쪽짜리 정보가 저장되지 않게 한다 (나중에 다시 시도됨)
    let detail = null;
    if (summary.content_id) {
      await ctx.wait(this.minInterval);
      detail = await ctx.fetchJson(
        `${API_BASE}/combined=${encodeURIComponent(summary.content_id)}/json`
      );
    }

    const actresses = detail
      ? (detail.actresses || []).map((actress) => ({
          id: actress.id,
          name: actress.name_romaji || actress.name_kanji || "",
          nameJa: actress.name_kanji || "",
          image: actress.image_url ? ACTRESS_IMAGE_BASE + actress.image_url : "",
        }))
      : (summary.actresses || []).map((actress) => ({
          name: actress.name || "",
          nameJa: "",
          image: "",
        }));

    const jacket = (summary.images && summary.images.jacket_image) || {};
    const cover =
      (detail && (detail.jacket_thumb_url || detail.jacket_full_url)) ||
      [jacket.large2, jacket.large].find(
        (url) => typeof url === "string" && url.trim().startsWith("http")
      ) ||
      "";

    return {
      title: (detail && (detail.title_ja || detail.title_en)) || summary.title || "",
      titleEn: (detail && detail.title_en) || summary.title || "",
      releaseDate: (detail && detail.release_date) || summary.release_date || "",
      runtime: (detail && detail.runtime_mins) || summary.runtime_minutes || 0,
      maker:
        (detail && (detail.maker_name_ja || detail.maker_name_en)) ||
        (summary.maker && summary.maker.name) ||
        "",
      actresses,
      cover: String(cover).trim(),
    };
  },

  // 배우의 전체 작품 목록 (한 페이지 100개씩, 요청 제한에 걸리면 기다렸다가 재시도)
  async listWorks(actress, ctx) {
    if (!actress || !actress.id) return null;

    const rows = [];
    let total = Infinity;
    for (let page = 1; rows.length < total && page <= 30; page++) {
      if (page > 1) await ctx.wait(this.minInterval);

      let data = null;
      for (let attempt = 0; ; attempt++) {
        try {
          data = await ctx.fetchJson(
            `${LIST_BASE}?id=${encodeURIComponent(actress.id)}&type=actress&page=${page}`
          );
          break;
        } catch (error) {
          if (attempt >= 3) throw error;
          await ctx.wait(Math.min(60, Math.max(15, error.retryAfter || 0)) * 1000);
        }
      }

      const results = (data && data.results) || [];
      if (results.length === 0) break;
      total = Number(data.total_results) || rows.length + results.length;
      rows.push(...results);
    }

    return module.exports.normalizeWorks(rows);
  },

  // 목록 정리: 같은 작품의 여러 판본(블루레이, 묶음, 한정판 등)을 하나로 합치고 품번을 붙임
  //   content_id 예: snos525, snos00525, 9snos525, k9snos525, tkoae320 → SNOS-525 / OAE-320
  normalizeWorks(rows) {
    const byCode = new Map();

    for (const row of rows) {
      const contentId = String(row.content_id || "").toLowerCase();
      const match = contentId.match(/([a-z]+)0*(\d{2,6})[a-z]?$/);
      if (!match) continue;

      const entry = {
        letters: match[1],
        number: match[2],
        idLength: contentId.length,
        title: row.title_ja || row.title_en || "",
        releaseDate: row.release_date || "",
        cover: row.jacket_thumb_url || "",
      };
      const key = `${entry.letters}-${entry.number}`;
      const existing = byCode.get(key);
      if (!existing) {
        byCode.set(key, entry);
      } else {
        // 가장 이른 출시일을 쓰고, 제목/커버는 기본판(가장 짧은 id) 것을 사용
        if (entry.releaseDate && (!existing.releaseDate || entry.releaseDate < existing.releaseDate)) {
          existing.releaseDate = entry.releaseDate;
        }
        if (entry.idLength < existing.idLength) {
          existing.idLength = entry.idLength;
          existing.title = entry.title || existing.title;
          existing.cover = entry.cover || existing.cover;
        }
      }
    }

    // 접두어가 붙은 판본 합치기: 같은 번호에서 "tkoae"가 "oae"로 끝나면 oae 쪽으로 합침
    const entries = [...byCode.values()];
    const merged = entries.filter((entry) => {
      const base = entries.find(
        (other) =>
          other !== entry &&
          other.number === entry.number &&
          other.letters.length < entry.letters.length &&
          entry.letters.endsWith(other.letters)
      );
      if (!base) return true;
      if (entry.releaseDate && (!base.releaseDate || entry.releaseDate < base.releaseDate)) {
        base.releaseDate = entry.releaseDate;
      }
      return false;
    });

    return merged
      .map((entry) => ({
        code: `${entry.letters.toUpperCase()}-${String(parseInt(entry.number, 10)).padStart(3, "0")}`,
        title: entry.title,
        releaseDate: entry.releaseDate,
        cover: entry.cover,
      }))
      .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || "") || a.code.localeCompare(b.code));
  },

  async check(ctx) {
    // 캐시된 응답이 아니라 서버에 실제로 다녀온 결과로 판단
    const summary = await ctx.fetchJson(`${API_BASE}/dvd_id=${CHECK_CODE}/json`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (summary && summary.content_id) return { ok: true, message: "정상" };
    return { ok: false, message: "응답은 왔지만 확인용 품번을 찾지 못함" };
  },
};
