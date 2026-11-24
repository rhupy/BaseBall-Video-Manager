#!/usr/bin/env bash
# WSL에서 Windows 테스트 빌드를 만들고 Windows 로컬 폴더로 복사한다.
# (\\wsl.localhost 경로에서는 Electron이 실행되지 않으므로 로컬 드라이브로 복사해야 함)
#
# 사용법: npm run build:win-test [-- <복사할 경로>]
#   기본 경로: <Windows 사용자 폴더>/Downloads/BaseballVideoManager-test
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${1:-}"
if [ -z "$DEST" ]; then
  WIN_HOME="$(cd /mnt/c && cmd.exe /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')"
  DEST="$(wslpath "$WIN_HOME")/Downloads/BaseballVideoManager-test"
fi

# 실행 중이면 파일이 잠겨 복사가 깨지므로 먼저 확인
RUNNING="$(cd /mnt/c && tasklist.exe 2>/dev/null || true)"
if echo "$RUNNING" | grep -i "Baseball Video Manager" >/dev/null; then
  echo "앱이 실행 중입니다. 종료한 뒤 다시 실행해 주세요." >&2
  exit 1
fi

# wine 없이 빌드하기 위해 exe 아이콘/버전 정보 편집은 건너뜀
npx electron-builder --win --dir -c.win.signAndEditExecutable=false


rm -rf "$DEST"
cp -r dist/win-unpacked "$DEST"
echo "완료: $(wslpath -w "$DEST")\\Baseball Video Manager.exe"
