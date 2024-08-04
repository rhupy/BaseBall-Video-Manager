using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

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
        public string[] selectedExtensions => tabIndex == 0 ? extensionsMedia : extensionsFils;

        public string CurrentFilesPath => tabIndex == 0 ? media_FilesPath : file_FilesPath;

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
            tabIndex = index;
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
            List<FileEntry> existingFiles = LoadFiles(tabIndex);
            List<FileEntry> updatedFiles = existingFiles.ToList();

            List<DirectoryEntry> directories = LoadLibraries();
            HashSet<string> allFoundFiles = new HashSet<string>();

            foreach (var directory in directories)
            {
                DirectoryInfo dirInfo = new DirectoryInfo(directory.Path);
                var fileInfos = dirInfo.GetFiles("*.*", SearchOption.AllDirectories)
                    .Where(f => selectedExtensions.Contains(f.Extension.ToLower()));

                foreach (var fileInfo in fileInfos)
                {
                    allFoundFiles.Add(fileInfo.FullName);
                    var existingFile = existingFiles.FirstOrDefault(fe => fe.Fullpath == fileInfo.FullName);

                    if (existingFile == null)
                    {
                        updatedFiles.Add(new FileEntry
                        {
                            Filename = fileInfo.Name,
                            Lasttime = "",
                            Addtime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                            Fullpath = fileInfo.FullName,
                            Eval = "",
                            Desc = ""
                        });
                    }
                    progressBar++;
                }
            }

            updatedFiles = updatedFiles.Where(fe => allFoundFiles.Contains(fe.Fullpath)).ToList();

            SaveFiles(updatedFiles, tabIndex);
        }

        public List<FileEntry> LoadFiles(int tabIndex)
        {
            string filePath = tabIndex == 0 ? media_FilesPath : file_FilesPath;
            if (File.Exists(filePath))
            {
                string json = File.ReadAllText(filePath);
                return JsonConvert.DeserializeObject<List<FileEntry>>(json);
            }
            return new List<FileEntry>();
        }

        public void SaveFiles(List<FileEntry> files, int tabIndex)
        {
            string filePath = tabIndex == 0 ? media_FilesPath : file_FilesPath;
            string json = JsonConvert.SerializeObject(files, Formatting.Indented);
            File.WriteAllText(filePath, json);
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