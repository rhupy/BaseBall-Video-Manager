// Windows Search API를 활용한 초고속 파일 스캐너
const { spawn } = require('child_process');
const path = require('path');

class WindowsSearchScanner {
  constructor() {
    this.isAvailable = null; // Windows Search 사용 가능 여부 캐시
  }

  // Windows Search 사용 가능 여부 확인
  async checkAvailability() {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      const testScript = `
        $connection = New-Object -ComObject ADODB.Connection
        $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
        $connection.Close()
        Write-Output "available"
      `;

      const result = await this.runPowerShell(testScript, 5000); // 5초 타임아웃
      this.isAvailable = result.trim() === 'available';
    } catch (error) {
      console.warn('Windows Search 사용 불가:', error.message);
      this.isAvailable = false;
    }

    return this.isAvailable;
  }

  // 비디오 파일 스캔 (Windows Search API 사용)
  async scanVideoFiles(libraryPaths, extensions = []) {
    const available = await this.checkAvailability();
    if (!available) {
      throw new Error('Windows Search not available');
    }

    // 기본 비디오 확장자
    const videoExtensions = extensions.length > 0 ? extensions : 
      ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp', '.webm'];

    // Windows Search 쿼리 구성
    const pathConditions = libraryPaths
      .map(p => `System.ItemPathDisplay LIKE '${p.replace(/\\/g, '\\\\')}%'`)
      .join(' OR ');

    const extensionConditions = videoExtensions
      .map(ext => `System.FileExtension = '${ext}'`)
      .join(' OR ');

    const query = `
      SELECT 
        System.ItemPathDisplay,
        System.FileName,
        System.Size,
        System.DateModified,
        System.Rating,
        System.Media.Duration,
        System.Video.FrameWidth,
        System.Video.FrameHeight
      FROM SystemIndex
      WHERE 
        (${pathConditions})
        AND (${extensionConditions})
        AND System.Kind = 'Video'
      ORDER BY System.DateModified DESC
    `;

    const script = `
      $connection = New-Object -ComObject ADODB.Connection
      $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
      
      try {
        $recordset = $connection.Execute(@"
${query}
"@)
        
        $results = @()
        while (-not $recordset.EOF) {
          $fullPath = $recordset.Fields("System.ItemPathDisplay").Value
          $fileName = $recordset.Fields("System.FileName").Value
          
          # 파일이 실제로 존재하는지 확인
          if (Test-Path $fullPath) {
            $results += @{
              Filename = $fileName
              Fullpath = $fullPath
              Size = $recordset.Fields("System.Size").Value
              Modified = $recordset.Fields("System.DateModified").Value
              WindowsRating = $recordset.Fields("System.Rating").Value
              Duration = $recordset.Fields("System.Media.Duration").Value
              FrameWidth = $recordset.Fields("System.Video.FrameWidth").Value
              FrameHeight = $recordset.Fields("System.Video.FrameHeight").Value
            }
          }
          $recordset.MoveNext()
        }
        
        $results | ConvertTo-Json -Depth 2
      } finally {
        $connection.Close()
      }
    `;

    console.log(`Windows Search API로 스캔 시작: ${libraryPaths.length}개 경로`);
    const startTime = Date.now();

    try {
      const result = await this.runPowerShell(script, 30000); // 30초 타임아웃
      const files = this.parseResults(result);
      
      const duration = Date.now() - startTime;
      console.log(`Windows Search 완료: ${files.length}개 파일, ${duration}ms`);
      
      return files;
    } catch (error) {
      console.error('Windows Search 실패:', error.message);
      throw error;
    }
  }

  // 압축 파일 스캔
  async scanArchiveFiles(libraryPaths, extensions = []) {
    const available = await this.checkAvailability();
    if (!available) {
      throw new Error('Windows Search not available');
    }

    const archiveExtensions = extensions.length > 0 ? extensions : 
      ['.zip', '.7z', '.ezc', '.alzip', '.001', '.zpaq', '.rar'];

    const pathConditions = libraryPaths
      .map(p => `System.ItemPathDisplay LIKE '${p.replace(/\\/g, '\\\\')}%'`)
      .join(' OR ');

    const extensionConditions = archiveExtensions
      .map(ext => `System.FileExtension = '${ext}'`)
      .join(' OR ');

    const query = `
      SELECT 
        System.ItemPathDisplay,
        System.FileName,
        System.Size,
        System.DateModified
      FROM SystemIndex
      WHERE 
        (${pathConditions})
        AND (${extensionConditions})
      ORDER BY System.DateModified DESC
    `;

    const script = `
      $connection = New-Object -ComObject ADODB.Connection
      $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
      
      try {
        $recordset = $connection.Execute(@"
${query}
"@)
        
        $results = @()
        while (-not $recordset.EOF) {
          $fullPath = $recordset.Fields("System.ItemPathDisplay").Value
          
          # 파일이 실제로 존재하는지 확인
          if (Test-Path $fullPath) {
            $results += @{
              Filename = $recordset.Fields("System.FileName").Value
              Fullpath = $fullPath
              Size = $recordset.Fields("System.Size").Value
              Modified = $recordset.Fields("System.DateModified").Value
            }
          }
          $recordset.MoveNext()
        }
        
        $results | ConvertTo-Json -Depth 2
      } finally {
        $connection.Close()
      }
    `;

    console.log(`Windows Search API로 압축 파일 스캔 시작`);
    const startTime = Date.now();

    try {
      const result = await this.runPowerShell(script, 30000);
      const files = this.parseResults(result);
      
      const duration = Date.now() - startTime;
      console.log(`압축 파일 스캔 완료: ${files.length}개 파일, ${duration}ms`);
      
      return files;
    } catch (error) {
      console.error('압축 파일 스캔 실패:', error.message);
      throw error;
    }
  }

  // PowerShell 스크립트 실행
  async runPowerShell(script, timeout = 10000) {
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

      // 타임아웃 설정
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

  // 결과 파싱
  parseResults(jsonString) {
    try {
      if (!jsonString || jsonString.trim() === '') {
        return [];
      }

      const parsed = JSON.parse(jsonString);
      
      // 단일 객체를 배열로 변환
      if (!Array.isArray(parsed)) {
        return [parsed];
      }
      
      return parsed;
    } catch (error) {
      console.warn('결과 파싱 실패:', error.message);
      return [];
    }
  }

  // 증분 스캔 (변경된 파일만)
  async scanChangedFiles(libraryPaths, lastScanTime, extensions = []) {
    const available = await this.checkAvailability();
    if (!available) {
      throw new Error('Windows Search not available');
    }

    const videoExtensions = extensions.length > 0 ? extensions : 
      ['.avi', '.mp4', '.mov', '.wmv', '.avchd', '.flv', '.f4v', '.swf', '.mkv', '.mpeg2', '.ts', '.tp', '.webm'];

    const pathConditions = libraryPaths
      .map(p => `System.ItemPathDisplay LIKE '${p.replace(/\\/g, '\\\\')}%'`)
      .join(' OR ');

    const extensionConditions = videoExtensions
      .map(ext => `System.FileExtension = '${ext}'`)
      .join(' OR ');

    // 마지막 스캔 시간 이후 변경된 파일만 조회
    const lastScanTimeFormatted = new Date(lastScanTime).toISOString();

    const query = `
      SELECT 
        System.ItemPathDisplay,
        System.FileName,
        System.Size,
        System.DateModified,
        System.Rating,
        System.Media.Duration
      FROM SystemIndex
      WHERE 
        (${pathConditions})
        AND (${extensionConditions})
        AND System.Kind = 'Video'
        AND System.DateModified >= '${lastScanTimeFormatted}'
      ORDER BY System.DateModified DESC
    `;

    const script = `
      $connection = New-Object -ComObject ADODB.Connection
      $connection.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows'")
      
      try {
        $recordset = $connection.Execute(@"
${query}
"@)
        
        $results = @()
        while (-not $recordset.EOF) {
          $fullPath = $recordset.Fields("System.ItemPathDisplay").Value
          
          if (Test-Path $fullPath) {
            $results += @{
              Filename = $recordset.Fields("System.FileName").Value
              Fullpath = $fullPath
              Size = $recordset.Fields("System.Size").Value
              Modified = $recordset.Fields("System.DateModified").Value
              WindowsRating = $recordset.Fields("System.Rating").Value
              Duration = $recordset.Fields("System.Media.Duration").Value
            }
          }
          $recordset.MoveNext()
        }
        
        $results | ConvertTo-Json -Depth 2
      } finally {
        $connection.Close()
      }
    `;

    try {
      const result = await this.runPowerShell(script, 15000);
      const files = this.parseResults(result);
      
      console.log(`증분 스캔 완료: ${files.length}개 변경된 파일`);
      return files;
    } catch (error) {
      console.error('증분 스캔 실패:', error.message);
      throw error;
    }
  }
}

module.exports = WindowsSearchScanner;