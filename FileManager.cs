using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;

namespace BaseBall_Video_Manager
{
    public class FileManager
    {
        string libPath = "data\\lib.json"; // 디렉토리 목록 파일
        string filesPath = "data\\files.json"; // 파일 목록 파일

        public List<DirectoryEntry> LoadLibraries()
        {
            if (File.Exists(libPath))
            {
                string json = File.ReadAllText(libPath);
                return JsonConvert.DeserializeObject<List<DirectoryEntry>>(json);
            }
            return new List<DirectoryEntry>();
        }

        public List<FileEntry> LoadFiles()
        {
            if (File.Exists(filesPath))
            {
                string json = File.ReadAllText(filesPath);
                return JsonConvert.DeserializeObject<List<FileEntry>>(json);
            }
            return new List<FileEntry>();
        }

        public void SaveFiles(List<FileEntry> files)
        {
            string json = JsonConvert.SerializeObject(files, Formatting.Indented);
            File.WriteAllText(filesPath, json);
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
