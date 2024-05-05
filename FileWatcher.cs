using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BaseBall_Video_Manager
{
    public class FileWatcher
    {
        private string[] extensions = { ".avi", ".mp4", ".mov", ".wmv", ".avchd", ".flv", ".f4v", ".swf", ".mkv", ".mpeg2", ".ts", ".tp" };

        public void StartWatching(string path)
        {
            FileSystemWatcher watcher = new FileSystemWatcher
            {
                Path = path,
                NotifyFilter = NotifyFilters.LastAccess | NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName,
                Filter = "*.*"  // 모든 파일을 감지하고, 이벤트 핸들러에서 확장자를 확인합니다.
            };

            watcher.Created += OnChanged;
            watcher.Deleted += OnChanged;
            watcher.Changed += OnChanged;
            watcher.EnableRaisingEvents = true;
        }

        private void OnChanged(object sender, FileSystemEventArgs e)
        {
            string fileExtension = Path.GetExtension(e.FullPath).ToLower();
            if (Array.Exists(extensions, ext => ext == fileExtension))
            {
                // 파일이 지정된 확장자 중 하나와 일치할 때 처리 로직
                Console.WriteLine($"Detected {e.ChangeType} on file: {e.FullPath}");
            }
        }
    }
}
