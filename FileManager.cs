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

        public async Task UpdateFiles(IProgress<int> progress)
        {
            List<FileEntry> existingFiles = LoadFiles(tabIndex);
            List<FileEntry> updatedFiles = existingFiles.ToList();

            List<DirectoryEntry> directories = LoadLibraries();
            HashSet<string> allFoundFiles = new HashSet<string>();

            int totalFiles = 0;
            int processedFiles = 0;

            foreach (var directory in directories)
            {
                totalFiles += Directory.GetFiles(directory.Path, "*.*", SearchOption.AllDirectories)
                    .Count(f => selectedExtensions.Contains(Path.GetExtension(f).ToLower()));
            }

            await Task.Run(() =>
            {
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

                        processedFiles++;
                        if (processedFiles % 10 == 0 || processedFiles == totalFiles)
                        {
                            progress.Report((int)((float)processedFiles / totalFiles * 100));
                        }
                    }
                }
            });

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

        public List<FileEntry> RemoveEmptyFolders(List<FileEntry> files, Action<int> progressCallback = null)
        {
            HashSet<string> allDirectories = new HashSet<string>();
            List<DirectoryEntry> libraries = LoadLibraries();

            // 라이브러리의 모든 디렉토리를 가져옵니다.
            foreach (var library in libraries)
            {
                allDirectories.UnionWith(Directory.GetDirectories(library.Path, "*", SearchOption.AllDirectories));
            }

            List<string> emptyDirectories = new List<string>();
            int totalDirectories = allDirectories.Count;
            int processedDirectories = 0;

            foreach (string dir in allDirectories.OrderByDescending(d => d.Length))
            {
                if (Directory.Exists(dir) && IsDirectoryEmpty(dir))
                {
                    emptyDirectories.Add(dir);
                    try
                    {
                        Directory.Delete(dir, false);
                        Console.WriteLine($"Deleted empty directory: {dir}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to delete directory: {dir}. Error: {ex.Message}");
                    }
                }
                processedDirectories++;
                progressCallback?.Invoke((int)((float)processedDirectories / totalDirectories * 100));
            }

            return files.Where(f => !emptyDirectories.Contains(Path.GetDirectoryName(f.Fullpath))).ToList();
        }

        private bool IsDirectoryEmpty(string path)
        {
            return !Directory.EnumerateFileSystemEntries(path).Any(
                entry => !IsHiddenOrSystem(entry) &&
                         (File.Exists(entry) ||
                         (Directory.Exists(entry) && !IsDirectoryEmpty(entry)))
            );
        }

        private bool IsHiddenOrSystem(string path)
        {
            FileAttributes attr = File.GetAttributes(path);
            return (attr & FileAttributes.Hidden) == FileAttributes.Hidden ||
                   (attr & FileAttributes.System) == FileAttributes.System;
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