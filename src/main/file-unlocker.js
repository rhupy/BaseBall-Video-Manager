// 파일을 잡고 있는 프로그램(동영상 플레이어 등)을 찾아 정상 종료시키는 모듈 (Windows 전용)
// - Windows Restart Manager로 해당 파일을 열고 있는 프로세스를 조회
// - 창이 있는 일반 프로그램에만 "창 닫기"를 요청 (강제 종료는 하지 않음)
// - 탐색기, 서비스, 시스템 프로세스, 이 앱 자신은 건드리지 않음
const { spawn } = require("child_process");

// PowerShell 스크립트 (대상 경로는 환경 변수로 전달해 따옴표 문제를 피함)
const SCRIPT = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class BvmRestartManager
{
    [StructLayout(LayoutKind.Sequential)]
    struct RM_UNIQUE_PROCESS
    {
        public int dwProcessId;
        public System.Runtime.InteropServices.ComTypes.FILETIME ProcessStartTime;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct RM_PROCESS_INFO
    {
        public RM_UNIQUE_PROCESS Process;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string strAppName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string strServiceShortName;
        public int ApplicationType;
        public uint AppStatus;
        public uint TSSessionId;
        [MarshalAs(UnmanagedType.Bool)] public bool bRestartable;
    }

    [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)]
    static extern int RmStartSession(out uint handle, int flags, string key);

    [DllImport("rstrtmgr.dll")]
    static extern int RmEndSession(uint handle);

    [DllImport("rstrtmgr.dll", CharSet = CharSet.Unicode)]
    static extern int RmRegisterResources(uint handle, uint nFiles, string[] files, uint nApps, IntPtr apps, uint nServices, string[] services);

    [DllImport("rstrtmgr.dll")]
    static extern int RmGetList(uint handle, out uint needed, ref uint count, [In, Out] RM_PROCESS_INFO[] info, ref uint reasons);

    // 결과: "pid|type" 목록 (type 1 = 창이 있는 프로그램, 2 = 보조 창)
    public static List<string> Find(string path)
    {
        var result = new List<string>();
        uint handle;
        if (RmStartSession(out handle, 0, Guid.NewGuid().ToString()) != 0) return result;
        try
        {
            if (RmRegisterResources(handle, 1, new[] { path }, 0, IntPtr.Zero, 0, null) != 0) return result;
            uint needed = 0, count = 0, reasons = 0;
            int status = RmGetList(handle, out needed, ref count, null, ref reasons);
            if (status != 234 || needed == 0) return result; // 234 = ERROR_MORE_DATA
            var info = new RM_PROCESS_INFO[needed];
            count = needed;
            if (RmGetList(handle, out needed, ref count, info, ref reasons) != 0) return result;
            for (int i = 0; i < count; i++)
            {
                result.Add(info[i].Process.dwProcessId + "|" + info[i].ApplicationType);
            }
        }
        finally
        {
            RmEndSession(handle);
        }
        return result;
    }
}
"@

$target = $env:BVM_UNLOCK_TARGET
$selfPid = [int]$env:BVM_UNLOCK_SELF
$results = @()

foreach ($entry in [BvmRestartManager]::Find($target)) {
    $parts = $entry.Split('|')
    $lockPid = [int]$parts[0]
    $type = [int]$parts[1]
    $item = @{ pid = $lockPid; type = $type; name = ''; closed = $false; skipped = '' }
    try {
        $process = Get-Process -Id $lockPid -ErrorAction Stop
        $item.name = $process.ProcessName
        if ($lockPid -eq $selfPid -or $process.ProcessName -like 'Baseball Video Manager*') {
            $item.skipped = 'self'
        } elseif ($type -ne 1 -and $type -ne 2) {
            $item.skipped = 'not-an-app'
        } elseif ($process.MainWindowHandle -eq 0) {
            $item.skipped = 'no-window'
        } else {
            [void]$process.CloseMainWindow()
            $item.closed = $process.WaitForExit(6000)
            if (-not $item.closed) { $item.skipped = 'did-not-exit' }
        }
    } catch {
        $item.skipped = 'error: ' + $_.Exception.Message
    }
    $results += $item
}

ConvertTo-Json -InputObject @($results) -Compress
`;

// filePath를 잡고 있는 프로그램을 찾아 창 닫기를 요청
// 반환: [{ pid, name, closed, skipped }] — 잠근 프로그램이 없으면 빈 배열
function closeLockingApps(filePath, timeoutMs = 20000) {
  if (process.platform !== "win32") return Promise.resolve([]);

  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const encoded = Buffer.from(SCRIPT, "utf16le").toString("base64");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
      {
        windowsHide: true,
        env: {
          ...process.env,
          BVM_UNLOCK_TARGET: filePath,
          BVM_UNLOCK_SELF: String(process.pid),
        },
      }
    );

    const timer = setTimeout(() => {
      child.kill();
      finish([]);
    }, timeoutMs);

    child.stdout.on("data", (data) => (output += data.toString("utf8")));
    child.stderr.on("data", (data) => console.warn("[unlocker]", data.toString("utf8").trim()));
    child.on("error", () => finish([]));
    child.on("close", () => {
      try {
        const start = output.indexOf("[");
        finish(start === -1 ? [] : JSON.parse(output.substring(start)));
      } catch (error) {
        console.warn("[unlocker] 결과 해석 실패:", error.message);
        finish([]);
      }
    });
  });
}

module.exports = { closeLockingApps };
