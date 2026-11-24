// 중복 파일 감지
// 다음 중 하나라도 같으면 같은 묶음으로 본다 (조건이 이어지면 한 묶음으로 합쳐짐):
//   1) 파일명에서 추출한 품번 (예: SONE-974, sone00974, hhd800.com@SONE-974-C → 모두 SONE-974)
//      단, 품번 뒤 분할 번호(_1, -2, cd2, -A)가 다르면 나뉜 파일이므로 묶지 않는다
//   2) 품번이 없는 파일끼리: 정리한 파일명 (대소문자/구분자/"(1)"·"복사본" 무시, 확장자 무시)
//   3) 바이트 단위까지 같은 용량 (이름이 전혀 달라도 같은 파일일 가능성이 높음)
// 예외:
//   - 묶음의 파일이 전부 같은 폴더에 있으면 중복으로 보지 않는다 (서로 다른 폴더에 걸쳐 있어야 함)
//   - 1.mp4, 02.mp4, video.mp4처럼 대충 지은 이름은 이름이 같아도 묶지 않는다 (용량이 같으면 묶임)
// 삭제는 사용자가 직접 하므로, 놓치는 것보다 넓게 묶는 쪽을 택한다.
class DuplicateFinder {
  // 품번 접두어로 보지 않을 단어 (코덱, 해상도, 카메라 파일명, 사이트 접두어 등)
  static IGNORED_PREFIXES = new Set([
    "MP", "AVC", "HEVC", "AAC", "AC", "DTS", "DD", "FLAC", "HDR", "HD", "FHD", "UHD", "QHD", "SD",
    "BD", "DVD", "CD", "DISC", "DISK", "PART", "PT", "EP", "VOL", "VER", "WEB", "FPS", "BIT", "KBPS",
    "CH", "IMG", "DSC", "VID", "MOV", "PXL", "GOPR", "MVI", "HHD", "COM", "NET", "WWW", "TOP", "NO",
    // 날짜형 번호 뒤에 붙는 사이트명 (061022-001-carib-1080p)
    "CARIB", "CARIBPR", "PONDO", "PON", "PACO", "MURA", "HEY",
    // 일반 단어
    "SEASON", "SCENE", "TRACK", "VIDEO", "MOVIE", "CLIP", "FILE", "TITLE", "DAY", "TAKE", "CAM",
    "REC", "GAME", "ROUND", "WEEK", "PAGE", "STEP", "TEST", "DEMO", "SAMPLE",
  ]);

  // 이름만으로는 중복이라 보기 어려운 흔한 이름 (뒤에 숫자가 붙은 것 포함: video1, clip 02)
  static GENERIC_NAMES = new Set([
    "video", "movie", "clip", "new", "untitled", "output", "out", "sample", "test", "temp", "tmp",
    "file", "record", "recording", "capture", "download", "영상", "동영상", "비디오", "새 파일",
    "제목 없음", "무제", "녹화", "캡처",
  ]);

  // 대충 지은 이름인지: 숫자뿐이거나, 3글자 이하이거나, 흔한 단어(+숫자)
  static isTrivialName(normalizedName) {
    const name = normalizedName.trim();
    if (name.length <= 3) return true;
    if (/^[\d\s]+$/.test(name)) return true;
    const withoutNumber = name.replace(/[\s]*\d+$/, "").trim();
    return DuplicateFinder.GENERIC_NAMES.has(withoutNumber);
  }

  // 파일이 들어 있는 폴더 (비교용, 대소문자/구분자 무시). 경로를 모르면 null
  static folderOf(file) {
    const fullpath = file && file.Fullpath ? String(file.Fullpath) : "";
    const cut = Math.max(fullpath.lastIndexOf("\\"), fullpath.lastIndexOf("/"));
    return cut > 0 ? fullpath.substring(0, cut).replace(/\//g, "\\").toLowerCase() : null;
  }

  // 같은 용량으로 묶을 최소 크기 (작은 파일은 우연히 같을 수 있음)
  static MIN_SIZE_FOR_MATCH = 1024 * 1024;

  static stripExtension(filename) {
    const name = String(filename || "");
    const lastDot = name.lastIndexOf(".");
    return lastDot > 0 ? name.substring(0, lastDot) : name;
  }

  static formatCode(prefix, digits) {
    const number = String(parseInt(digits, 10));
    return `${prefix.toUpperCase()}-${number.padStart(3, "0")}`;
  }

  // 파일명(확장자 제외)에서 품번과 그 끝 위치를 찾음. 없으면 null
  static locateCode(name) {
    // FC2 계열: FC2-PPV-1234567, FC2PPV 1234567, FC2-1234567
    const fc2 = name.match(/FC2[-_ ]?(?:PPV)?[-_ ]?(\d{5,8})(?!\d)/i);
    if (fc2) return { code: `FC2-PPV-${fc2[1]}`, end: fc2.index + fc2[0].length };

    // 날짜형 번호 (061022-001, 010123_001): 뒤에 사이트명/화질이 붙어도 이 번호가 영상을 구분함
    const dated = name.match(/(?<!\d)(\d{6})[-_](\d{2,4})(?!\d)/);
    if (dated) return { code: `${dated[1]}-${dated[2]}`, end: dated.index + dated[0].length };

    // 숫자 바로 뒤에 p/i/k가 오면 화질 표기(1080p, 2160p, 4k)이므로 품번으로 보지 않음
    const pick = (regex) => {
      for (const match of name.matchAll(regex)) {
        if (!DuplicateFinder.IGNORED_PREFIXES.has(match[1].toUpperCase())) {
          return {
            code: DuplicateFinder.formatCode(match[1], match[2]),
            end: match.index + match[0].length,
          };
        }
      }
      return null;
    };

    // 1순위: 하이픈이 있는 형태 (ABC-123). 앞에 사이트명 등이 붙어 있어도 이쪽을 우선
    // 2순위: 하이픈 없이 붙은 형태 (ABC123, abc00123, ABC_123). 오탐을 줄이려고 숫자 3자리 이상만
    return (
      pick(/(?<![A-Za-z])([A-Za-z]{2,6})-(\d{2,5})(?!\d|[pPiIkK](?![A-Za-z]))/g) ||
      pick(/(?<![A-Za-z])([A-Za-z]{2,6})_?(\d{3,5})(?!\d|[pPiIkK](?![A-Za-z]))/g)
    );
  }

  // 파일명에서 품번 추출. 없으면 null
  static extractCode(filename) {
    const found = DuplicateFinder.locateCode(DuplicateFinder.stripExtension(filename));
    return found ? found.code : null;
  }

  // 품번 바로 뒤의 분할 번호 (FC2-PPV-2887491_1 → "1", SONE-974-2 → "2", ABC-123 cd2 → "2", ABC-123-A → "A")
  // 같은 품번이라도 분할 번호가 다르면 서로 다른 영상(나뉜 파일)으로 본다.
  // -C는 자막판 표기로 쓰이는 경우가 많아 분할로 보지 않는다. 없으면 null
  static extractPart(filename) {
    const name = DuplicateFinder.stripExtension(filename);
    const found = DuplicateFinder.locateCode(name);
    if (!found) return null;

    const rest = name.substring(found.end);
    const numbered = rest.match(/^[-_ ]?(?:(?:cd|part|pt|disc|disk)[-_ ]?)?(\d{1,2})(?![\dA-Za-z])/i);
    if (numbered) return String(parseInt(numbered[1], 10));

    const lettered = rest.match(/^[-_ ]([ABDabd])(?![A-Za-z0-9])/);
    if (lettered) return lettered[1].toUpperCase();

    const worded = name.match(/(?<![A-Za-z])(?:cd|part|pt|disc|disk)[-_ ]?(\d{1,2})(?!\d)/i);
    if (worded) return String(parseInt(worded[1], 10));

    return null;
  }

  // 품번이 없는 파일의 이름 비교용 키
  static normalizeName(filename) {
    return DuplicateFinder.stripExtension(filename)
      .toLowerCase()
      .replace(/\s*\(\d+\)\s*$/, "") // "이름 (1)"
      .replace(/\s*-?\s*(복사본|copy)(\s*\(\d+\))?\s*$/i, "") // "이름 - 복사본", "이름 copy"
      .replace(/[\s._\-]+/g, " ")
      .trim();
  }

  // files에서 중복 묶음을 찾아 반환: [{ label, files: [...] }] (label 이름순, 묶음 안은 파일명순)
  static findGroups(files) {
    const parent = files.map((_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    const codes = new Array(files.length);
    const names = new Array(files.length);
    const firstByKey = new Map();
    const link = (key, index) => {
      if (firstByKey.has(key)) union(firstByKey.get(key), index);
      else firstByKey.set(key, index);
    };

    files.forEach((file, i) => {
      // 품번 + 분할 번호가 모두 같아야 같은 영상 (FC2-PPV-2887491_1 과 _2 는 별개)
      const code = DuplicateFinder.extractCode(file.Filename);
      const part = code ? DuplicateFinder.extractPart(file.Filename) : null;
      codes[i] = code ? (part ? `${code}_${part}` : code) : null;
      if (codes[i]) {
        link(`code:${codes[i]}`, i);
      } else {
        names[i] = DuplicateFinder.normalizeName(file.Filename);
        if (names[i] && !DuplicateFinder.isTrivialName(names[i])) link(`name:${names[i]}`, i);
      }
      if (typeof file.Size === "number" && file.Size >= DuplicateFinder.MIN_SIZE_FOR_MATCH) {
        link(`size:${file.Size}`, i);
      }
    });

    const members = new Map(); // 대표 인덱스 → 구성원 인덱스 목록
    files.forEach((_, i) => {
      const root = find(i);
      if (!members.has(root)) members.set(root, []);
      members.get(root).push(i);
    });

    const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
    const groups = [];

    for (const indices of members.values()) {
      if (indices.length < 2) continue;

      // 전부 같은 폴더에 있으면 중복으로 보지 않음
      const folders = indices.map((i) => DuplicateFinder.folderOf(files[i]));
      if (!folders.includes(null) && new Set(folders).size < 2) continue;

      // 묶음 이름: 품번 → 공통 파일명 → 같은 용량
      const groupCodes = [...new Set(indices.map((i) => codes[i]).filter(Boolean))].sort();
      const groupNames = new Set(indices.map((i) => names[i]));
      let label;
      if (groupCodes.length > 0) {
        label = groupCodes.join(", ");
      } else if (groupNames.size === 1) {
        // "(1)", "복사본"이 붙지 않은 가장 짧은 이름을 대표로
        label = indices
          .map((i) => DuplicateFinder.stripExtension(files[i].Filename))
          .reduce((shortest, name) => (name.length < shortest.length ? name : shortest));
      } else {
        label = `같은 용량 ${Utils.formatSizeGB(files[indices[0]].Size)}`;
      }

      const groupFiles = indices
        .map((i) => files[i])
        .sort((a, b) => collator.compare(a.Filename || "", b.Filename || ""));
      groups.push({ label, files: groupFiles });
    }

    groups.sort((a, b) => collator.compare(a.label, b.label));
    return groups;
  }

  // 분할 파일 표시 추출 (cd1, part2, ABC-123-A, ABC-123-2 등). 없으면 null
  static partMarker(filename) {
    const name = DuplicateFinder.stripExtension(filename);

    const worded = name.match(/(?<![A-Za-z])(?:cd|part|pt|disc|disk)[-_ ]?(\d{1,2})(?!\d)/i);
    if (worded) return String(parseInt(worded[1], 10));

    const suffixed = name.match(
      /[A-Za-z]{2,6}[-_]?\d{2,5}[-_ ]([A-Da-d]|[1-9])(?![A-Za-z0-9])/
    );
    if (suffixed) return suffixed[1].toUpperCase();

    return null;
  }

  // 자동 제거 계획 수립 (실제 삭제는 하지 않음)
  //   groups:   findGroups() 결과
  //   keywords: 우선 단어 목록 (앞에 있을수록 우선). 이 단어가 파일명에 들어 있으면 용량과 관계없이 남김
  // 규칙:
  //   1) 우선 단어가 들어간 파일이 있으면 그 파일들 중에서, 없으면 전체에서
  //   2) 용량이 가장 큰 파일 하나를 남기고 나머지를 제거 대상으로 함
  // 판단할 수 없거나 위험한 묶음은 건너뜀(skipped):
  //   - 서로 다른 분할 표시(A/B, cd1/cd2)가 있는 묶음 → 중복이 아니라 나뉜 영상일 수 있음
  //   - 용량을 모르는 파일이 후보에 있는 묶음
  // 반환: { actions: [{ label, keep, remove: [...], reason }], skipped: [{ label, files, reason }] }
  static planAutoRemove(groups, { keywords = [] } = {}) {
    const words = keywords.map((word) => word.trim().toLowerCase()).filter(Boolean);
    const actions = [];
    const skipped = [];

    const hasMeta = (file) => (file.Eval ? 1 : 0) + (file.Desc ? 1 : 0);

    for (const group of groups) {
      const markers = new Set(
        group.files.map((file) => DuplicateFinder.partMarker(file.Filename)).filter(Boolean)
      );
      if (markers.size >= 2) {
        skipped.push({ label: group.label, files: group.files, reason: "분할 파일로 보임" });
        continue;
      }

      // 우선 단어: 목록 앞쪽 단어부터, 들어 있는 파일이 하나라도 있으면 그 파일들만 후보
      let candidates = group.files;
      let matchedWord = null;
      for (const word of words) {
        const matched = group.files.filter((file) =>
          (file.Filename || "").toLowerCase().includes(word)
        );
        if (matched.length > 0) {
          candidates = matched;
          matchedWord = word;
          break;
        }
      }

      let keep;
      if (candidates.length === 1) {
        keep = candidates[0];
      } else if (candidates.some((file) => typeof file.Size !== "number")) {
        skipped.push({ label: group.label, files: group.files, reason: "용량 정보 없음" });
        continue;
      } else {
        // 용량 큰 순 → 평점/메모가 있는 쪽 → 먼저 추가된 쪽 → 파일명
        keep = [...candidates].sort(
          (a, b) =>
            b.Size - a.Size ||
            hasMeta(b) - hasMeta(a) ||
            String(a.Addtime || "").localeCompare(String(b.Addtime || "")) ||
            String(a.Filename || "").localeCompare(String(b.Filename || ""))
        )[0];
      }

      actions.push({
        label: group.label,
        keep,
        remove: group.files.filter((file) => file !== keep),
        reason: matchedWord
          ? candidates.length === 1
            ? `단어 "${matchedWord}"`
            : `단어 "${matchedWord}" 중 최대 용량`
          : "최대 용량",
      });
    }

    return { actions, skipped };
  }
}

window.DuplicateFinder = DuplicateFinder;
