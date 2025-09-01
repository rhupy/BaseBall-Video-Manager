// Windows 메타데이터 관리자 (NTFS ADS + Windows 속성 활용)
const { spawn } = require('child_process');
const fs = require('fs-extra');

class WindowsMetadataManager {
  constructor() {
    this.isWindowsSystem = process.platform === 'win32';
  }

  // 파일 평점 설정 (Windows 속성 + ADS)
  async setFileRating(filePath, rating) {
    if (!this.isWindowsSystem) {
      console.warn('Windows 전용 기능입니다.');
      return false;
    }

    try {
      // 1. Windows 기본 속성에 평점 설정 (탐색기에서 보임)
      const ratingValue = Math.max(0, Math.min(5, rating)) * 20; // 0-5 → 0-100 변환
      
      const windowsRatingScript = `
        try {
          $file = Get-Item "${filePath.replace(/\\/g, '\\\\')}" -ErrorAction Stop
          
          # Windows Shell을 통한 평점 설정
          $shell = New-Object -ComObject Shell.Application
          $folder = $shell.NameSpace($file.DirectoryName)
          $item = $folder.ParseName($file.Name)
          
          # Rating 속성 설정 (속성 인덱스 18)
          $folder.GetDetailsOf($item, 18) = ${ratingValue}
          
          Write-Output "windows_rating_set"
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      // 2. ADS에 커스텀 메타데이터 저장
      const adsScript = `
        try {
          $adsPath = "${filePath.replace(/\\/g, '\\\\')}:myapp_rating"
          "${rating}" | Out-File -FilePath $adsPath -Encoding UTF8 -NoNewline -Force
          Write-Output "ads_rating_set"
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      // 병렬 실행
      await Promise.all([
        this.runPowerShell(windowsRatingScript),
        this.runPowerShell(adsScript)
      ]);

      return true;
    } catch (error) {
      console.warn('평점 설정 실패:', error.message);
      return false;
    }
  }

  // 마지막 재생 시간 설정
  async setLastPlayed(filePath, timestamp) {
    if (!this.isWindowsSystem) return false;

    try {
      const isoTimestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
      
      const script = `
        try {
          $adsPath = "${filePath.replace(/\\/g, '\\\\')}:myapp_lastplayed"
          "${isoTimestamp}" | Out-File -FilePath $adsPath -Encoding UTF8 -NoNewline -Force
          Write-Output "lastplayed_set"
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      await this.runPowerShell(script);
      return true;
    } catch (error) {
      console.warn('마지막 재생 시간 설정 실패:', error.message);
      return false;
    }
  }

  // 재생 횟수 증가
  async incrementPlayCount(filePath) {
    if (!this.isWindowsSystem) return false;

    try {
      const script = `
        try {
          $adsPath = "${filePath.replace(/\\/g, '\\\\')}:myapp_playcount"
          
          # 기존 값 읽기
          $currentCount = 0
          if (Test-Path $adsPath) {
            try {
              $currentCount = [int](Get-Content $adsPath -Raw)
            } catch {
              $currentCount = 0
            }
          }
          
          # 증가 후 저장
          $newCount = $currentCount + 1
          "$newCount" | Out-File -FilePath $adsPath -Encoding UTF8 -NoNewline -Force
          Write-Output $newCount
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      const result = await this.runPowerShell(script);
      return parseInt(result.trim()) || 1;
    } catch (error) {
      console.warn('재생 횟수 증가 실패:', error.message);
      return 1;
    }
  }

  // 설명 설정
  async setDescription(filePath, description) {
    if (!this.isWindowsSystem) return false;

    try {
      const script = `
        try {
          $adsPath = "${filePath.replace(/\\/g, '\\\\')}:myapp_description"
          "${description.replace(/"/g, '""')}" | Out-File -FilePath $adsPath -Encoding UTF8 -NoNewline -Force
          Write-Output "description_set"
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      await this.runPowerShell(script);
      return true;
    } catch (error) {
      console.warn('설명 설정 실패:', error.message);
      return false;
    }
  }

  // 파일 메타데이터 전체 조회
  async getMetadata(filePath) {
    if (!this.isWindowsSystem) {
      return {};
    }

    try {
      const script = `
        try {
          $result = @{}
          $basePath = "${filePath.replace(/\\/g, '\\\\')}"
          
          # ADS에서 커스텀 평점 읽기
          try {
            $ratingPath = "$basePath:myapp_rating"
            if (Test-Path $ratingPath) {
              $result.CustomRating = [int](Get-Content $ratingPath -Raw)
            } else {
              $result.CustomRating = 0
            }
          } catch {
            $result.CustomRating = 0
          }
          
          # ADS에서 마지막 재생 시간 읽기
          try {
            $lastPlayedPath = "$basePath:myapp_lastplayed"
            if (Test-Path $lastPlayedPath) {
              $result.LastPlayed = Get-Content $lastPlayedPath -Raw
            } else {
              $result.LastPlayed = ""
            }
          } catch {
            $result.LastPlayed = ""
          }
          
          # ADS에서 재생 횟수 읽기
          try {
            $playCountPath = "$basePath:myapp_playcount"
            if (Test-Path $playCountPath) {
              $result.PlayCount = [int](Get-Content $playCountPath -Raw)
            } else {
              $result.PlayCount = 0
            }
          } catch {
            $result.PlayCount = 0
          }
          
          # ADS에서 설명 읽기
          try {
            $descPath = "$basePath:myapp_description"
            if (Test-Path $descPath) {
              $result.Description = Get-Content $descPath -Raw
            } else {
              $result.Description = ""
            }
          } catch {
            $result.Description = ""
          }
          
          # Windows 기본 평점 읽기 (참고용)
          try {
            $file = Get-Item $basePath -ErrorAction Stop
            $shell = New-Object -ComObject Shell.Application
            $folder = $shell.NameSpace($file.DirectoryName)
            $item = $folder.ParseName($file.Name)
            $windowsRating = $folder.GetDetailsOf($item, 18)
            if ($windowsRating -and $windowsRating -ne "") {
              $result.WindowsRating = [int]($windowsRating / 20) # 0-100 → 0-5 변환
            } else {
              $result.WindowsRating = 0
            }
          } catch {
            $result.WindowsRating = 0
          }
          
          $result | ConvertTo-Json -Depth 2
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      const result = await this.runPowerShell(script);
      return JSON.parse(result || '{}');
    } catch (error) {
      console.warn('메타데이터 조회 실패:', filePath, error.message);
      return {};
    }
  }

  // 배치로 여러 파일의 메타데이터 조회 (성능 최적화)
  async getBatchMetadata(filePaths) {
    if (!this.isWindowsSystem || filePaths.length === 0) {
      return {};
    }

    try {
      // 파일 경로를 PowerShell 배열로 변환
      const pathsArray = filePaths
        .map(p => `"${p.replace(/\\/g, '\\\\')}"`)
        .join(', ');

      const script = `
        try {
          $filePaths = @(${pathsArray})
          $results = @{}
          
          foreach ($filePath in $filePaths) {
            try {
              $metadata = @{}
              
              # ADS 메타데이터 읽기
              $ratingPath = "$filePath:myapp_rating"
              $lastPlayedPath = "$filePath:myapp_lastplayed"
              $playCountPath = "$filePath:myapp_playcount"
              $descPath = "$filePath:myapp_description"
              
              $metadata.CustomRating = if (Test-Path $ratingPath) { [int](Get-Content $ratingPath -Raw) } else { 0 }
              $metadata.LastPlayed = if (Test-Path $lastPlayedPath) { Get-Content $lastPlayedPath -Raw } else { "" }
              $metadata.PlayCount = if (Test-Path $playCountPath) { [int](Get-Content $playCountPath -Raw) } else { 0 }
              $metadata.Description = if (Test-Path $descPath) { Get-Content $descPath -Raw } else { "" }
              
              $results[$filePath] = $metadata
            } catch {
              # 개별 파일 실패시 빈 객체로 설정
              $results[$filePath] = @{
                CustomRating = 0
                LastPlayed = ""
                PlayCount = 0
                Description = ""
              }
            }
          }
          
          $results | ConvertTo-Json -Depth 3
        } catch {
          Write-Error $_.Exception.Message
        }
      `;

      const result = await this.runPowerShell(script, 30000); // 배치 작업은 더 긴 타임아웃
      return JSON.parse(result || '{}');
    } catch (error) {
      console.warn('배치 메타데이터 조회 실패:', error.message);
      return {};
    }
  }

  // ADS 스트림 존재 여부 확인
  async hasCustomMetadata(filePath) {
    if (!this.isWindowsSystem) return false;

    try {
      const script = `
        try {
          $hasMetadata = $false
          $basePath = "${filePath.replace(/\\/g, '\\\\')}"
          
          $streams = @(
            "$basePath:myapp_rating",
            "$basePath:myapp_lastplayed", 
            "$basePath:myapp_playcount",
            "$basePath:myapp_description"
          )
          
          foreach ($stream in $streams) {
            if (Test-Path $stream) {
              $hasMetadata = $true
              break
            }
          }
          
          Write-Output $hasMetadata
        } catch {
          Write-Output $false
        }
      `;

      const result = await this.runPowerShell(script);
      return result.trim().toLowerCase() === 'true';
    } catch (error) {
      return false;
    }
  }

  // PowerShell 스크립트 실행 (공통 메서드)
  async runPowerShell(script, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', script
      ], {
        windowsHide: true,
        encoding: 'utf8'
      });

      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timer = setTimeout(() => {
        ps.kill();
        reject(new Error('PowerShell timeout'));
      }, timeout);

      ps.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve(output);
        } else {
          const error = errorOutput || `PowerShell exit code: ${code}`;
          reject(new Error(error));
        }
      });

      ps.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  // 메타데이터 정리 (사용하지 않는 ADS 제거)
  async cleanupMetadata(filePath) {
    if (!this.isWindowsSystem) return false;

    try {
      const script = `
        try {
          $basePath = "${filePath.replace(/\\/g, '\\\\')}"
          $removed = 0
          
          $streams = @(
            "$basePath:myapp_rating",
            "$basePath:myapp_lastplayed",
            "$basePath:myapp_playcount", 
            "$basePath:myapp_description"
          )
          
          foreach ($stream in $streams) {
            if (Test-Path $stream) {
              try {
                $content = Get-Content $stream -Raw
                # 빈 내용이거나 기본값이면 제거
                if (-not $content -or $content.Trim() -eq "" -or $content.Trim() -eq "0") {
                  Remove-Item $stream -Force
                  $removed++
                }
              } catch {
                # 제거 실패시 무시
              }
            }
          }
          
          Write-Output $removed
        } catch {
          Write-Output 0
        }
      `;

      const result = await this.runPowerShell(script);
      return parseInt(result.trim()) || 0;
    } catch (error) {
      console.warn('메타데이터 정리 실패:', error.message);
      return 0;
    }
  }
}

module.exports = WindowsMetadataManager;