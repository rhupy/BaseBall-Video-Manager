using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;

namespace BaseBall_Video_Manager
{
    public class FileManager
    {
        string libPath = @"data\\lib.json";
        string media_FilesPath = @"data\\media\files.json";
        string file_FilesPath = @"data\\file\files.json";
        private static string[] extensionsMedia = { ".avi", ".mp4", ".mov", ".wmv", ".avchd", ".flv", ".f4v", ".swf", ".mkv", ".mpeg2", ".ts", ".tp" };
        private static string[] extensionsFils = { ".zip", ".7z", ".ezc", ".alzip", ".001", ".zpaq" };
        public int tabIndex = 0;
        public string[] selectedExtensions = extensionsMedia;

        // for 하단 상태 창
        public string fileListString()
        {
            string r = "검색 확장자 : ";
            foreach (string ext in selectedExtensions)
            {
                r = r + ext + "  ";
            }
            return r;
        }
        public void changeExtension(int index)
        {
            if (index == 0)
            {
                selectedExtensions = extensionsMedia;
            }
            if (index == 1)
            {
                selectedExtensions = extensionsFils;
            }
        }

        public List<DirectoryEntry> LoadLibraries()
        {
            if (File.Exists(libPath))
            {
                string json = File.ReadAllText(libPath);
                return JsonConvert.DeserializeObject<List<DirectoryEntry>>(json);
            }
            return new List<DirectoryEntry>();
        }

        public void UpdateFiles(int progressBar)
        {
            progressBar = 0;
            List<FileEntry> existingFiles = LoadFiles(); // 기존 파일 목록 로드
            List<FileEntry> updatedFiles = existingFiles.ToList(); // 기존 파일 목록을 업데이트 목록에 복사

            List<DirectoryEntry> directories = LoadLibraries();
            HashSet<string> allFoundFiles = new HashSet<string>();

            foreach (var directory in directories)
            {
                DirectoryInfo dirInfo = new DirectoryInfo(directory.Path);
                var fileInfos = dirInfo.GetFiles("*.*", SearchOption.AllDirectories)
                    .Where(f => extensionsMedia.Contains(f.Extension.ToLower()));

                foreach (var fileInfo in fileInfos)
                {
                    allFoundFiles.Add(fileInfo.FullName); // 실제 존재하는 파일 경로 추가
                    var existingFile = existingFiles.FirstOrDefault(fe => fe.Fullpath == fileInfo.FullName);

                    if (existingFile == null)
                    {
                        // 새로운 파일만 추가
                        updatedFiles.Add(new FileEntry
                        {
                            Filename = fileInfo.Name,
                            Lasttime = "",
                            Addtime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                            Fullpath = fileInfo.FullName,
                            Eval = "", // 초기 평가
                            Desc = ""  // 초기 설명
                        });
                    }
                    progressBar++;
                }
            }

            // 실제로 존재하지 않는 파일은 목록에서 제거
            updatedFiles = updatedFiles.Where(fe => allFoundFiles.Contains(fe.Fullpath)).ToList();

            SaveFiles(updatedFiles); // 업데이트된 파일 목록 저장
        }


        public List<FileEntry> LoadFiles()
        {
            if (File.Exists(media_FilesPath))
            {
                string json = File.ReadAllText(media_FilesPath);
                return JsonConvert.DeserializeObject<List<FileEntry>>(json);
            }
            return new List<FileEntry>();
        }

        public void SaveFiles(List<FileEntry> files)
        {
            string json = JsonConvert.SerializeObject(files, Formatting.Indented);
            File.WriteAllText(media_FilesPath, json);
        }
    }

    public class DirectoryEntry
    {
        public int Idx { get; set; }
        public string Path { get; set; }
    }

    public class FileEntry
    {
        public string Filename { get; set; }
        public string Lasttime { get; set; }
        public string Addtime { get; set; }
        public string Eval { get; set; }
        public string Desc { get; set; }
        public string Fullpath { get; set; }
    }
}