using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.Common;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;
using System.Xml.Linq;
using Formatting = Newtonsoft.Json.Formatting;

namespace BaseBall_Video_Manager
{
    public partial class MainForm : Form
    {
        #region variable
        string[] exts = new[] { ".avi", ".mp4", ".mov", ".wmv", ".avchd", ".flv", ".f4v", ".swf", ".mkv", ".mpeg2", ".ts", ".tp" };
        DataTable dt_file = new DataTable();
        DataTable dt_lib = new DataTable();
        List<Dictionary<string, object>> dataListLib;
        List<Dictionary<string, object>> dataList;

        string jsonFilePathFiles = "data\\files.json";
        string jsonFilePathLib = "data\\lib.json";
        #region ProgressBar
        async void ProgressBarPlus()
        {
            try
            {
                this.progressBar1.Value = this.progressBar1.Maximum >= this.progressBar1.Value + 1 ? this.progressBar1.Value + 1 : this.progressBar1.Value;
            }
            catch { }
        }
        #endregion

        #region StatusBar
        private string StatusText
        {
            set { this.label_status.Text = value; }
        }
        private int StatusCount
        {
            get => Convert.ToInt32(toolStripStatusLabel_totalcount.Text);
            set
            {
                this.toolStripStatusLabel_totalcount.Text = value.ToString();
                this.progressBar1.Maximum = Convert.ToInt32(value.ToString());
            }
        }
        #endregion

        string SearchTextBox
        {
            get { return this.textBox1.Text; }
        }
        #endregion



        public MainForm()
        {
            InitializeComponent();
            return;
            try
            {
                // 기존 데이터 리스트로 변환
                dataListLib = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePathLib));
                dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePathFiles));

                // DB 로부터 라이브러리 정보 가져오기 : json 읽어
                GetLibraries();
                GetFiles();
                // 파일상태 점검하여 추가하기 : 점검해서 json 업데이트
                GetNewFiles();
                // 그리드 생성
                SetGrid();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        #region Method
        private void ExeFile(string path)
        {
            using (Process proc = new Process())
            {
                bool pathExists = File.Exists(path);
                if (!pathExists) throw new ArgumentException("Path doesnt exist");

                var p = new Process();
                p.StartInfo = new ProcessStartInfo(@$"{path}")
                {
                    UseShellExecute = true
                };
                p.Start();
            }
        }
        private void GetLibraries()
        {
            dt_lib = select(dataListLib, 1); // key : path
        }
        private void GetFiles()
        {
            dt_file = select(dataList, 5); // key : fullpath
            StatusCount = dt_file.Rows.Count;
        }

        async void GetNewFiles()
        {
            this.progressBar1.Value = 0;

            // 비교 결과 목록
            DataTable dt_diff = new DataTable();
            dt_diff.InitDataTable();

            // 실제 파일 목록
            DataTable dt_real = new DataTable();
            dt_real.InitDataTable();

            // 전 파일 리스트
            List<string> list_real = new List<string>();

            // 현재 시간
            string nowTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            // 실제 파일 전 목록 생성
            foreach (DataRow dr in dt_lib.Rows)
            {
                try
                {
                    string path = dr["path"].ToString();
                    //string path = "X:\\Filejo";
                    DirectoryInfo di = new DirectoryInfo(path);
                    // 1. 최상위 폴더에서 검색하여 추가
                    List<string> list_fileNames = Directory.GetFiles(path, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                    list_real.AddRange(list_fileNames);

                    // 2. 하위 폴더에서 검색하여 추가
                    List<string> dirNames = Directory.GetDirectories(path).ToList<string>();
                    foreach (string dirName in dirNames)
                    {
                        List<string> filenames_indir = Directory.GetFiles(dirName, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                        list_real.AddRange(filenames_indir);
                    }
                }
                catch (Exception ex)
                {
                    continue;
                }
            }

            // 생성된 전 파일 목록을 검사하여 추가
            dt_diff.Columns.Add("result");
            foreach (string file in list_real)
            {
                ProgressBarPlus();
                int pathExists = dt_file.AsEnumerable().Where(r => r.Field<string>("fullpath").Equals(file)).Count();
                // 이미 존재하는 경우 유지
                if (pathExists == 1)
                    continue;
                else
                    INSERT_SINGLE(jsonFilePathFiles, file, nowTime, Path.GetFullPath(file));
            }
            // 재조회
            GetFiles();

        }
        async void SetDelFiles()
        {
            this.progressBar1.Value = 0;

            // 비교 결과 목록
            DataTable dt_diff = new DataTable();
            dt_diff.InitDataTable();

            // 실제 파일 목록
            DataTable dt_real = new DataTable();
            dt_real.InitDataTable();

            // 전 파일 리스트
            List<string> list_real = new List<string>();

            // 현재 시간
            string nowTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            // DB에서 가지고온 목록으로 부터 확인하여 제거
            foreach (DataRow row in dt_file.Rows)
            {
                ProgressBarPlus();
                string fullpath = row["fullpath"].ToString();
                bool pathExists = File.Exists(fullpath);
                // 이미 존재하는 경우 유지
                if (pathExists)
                    continue;
                RemoveDataFromJson(jsonFilePathFiles, fullpath);
            }
            // 재조회
            GetFiles();
        }
        public void RemoveDataFromJson(string jsonFilePath, string fullpath)
        {
            try
            {
                // 해당 fullpath를 가진 데이터 찾아서 삭제
                var dataToRemove = dataList.FirstOrDefault(data => data.ContainsKey("fullpath") && data["fullpath"].ToString() == fullpath);
                if (dataToRemove != null)
                {
                    dataList.Remove(dataToRemove);
                    Console.WriteLine("데이터 삭제 완료");
                }
                else
                {
                    Console.WriteLine("해당 fullpath를 가진 데이터가 없습니다.");
                }

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePath, updatedJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
            }
        }

        private void SetGrid()
        {
            this.dataGridView1.DataSource = dt_file;
        }


        // 파일의 실행 + 업데이트
        private void FileExe(string fullPath, int row)
        {
            fullPath = $@"{Path.GetFullPath(fullPath)}".Replace("\\", "/").Replace("/", "\\");
            dataGridView1.CurrentCell = null;
            ExeFile(fullPath);
            string now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            dataGridView1.Rows[row].Cells["lasttime"].Value = now;
            UpdateLastTimeInJson(jsonFilePathFiles, fullPath);
        }

        public void UpdateLastTimeInJson(string jsonFilePath, string fullpath)
        {
            try
            {
                // 해당 fullpath를 가진 데이터 찾아서 lasttime을 현재 시간으로 업데이트
                var dataToUpdate = dataList.FirstOrDefault(data => data.ContainsKey("fullpath") && data["fullpath"].ToString() == fullpath);
                if (dataToUpdate != null)
                {
                    dataToUpdate["lasttime"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                    Console.WriteLine("lasttime이 현재 시간으로 업데이트되었습니다.");
                }
                else
                {
                    Console.WriteLine("해당 fullpath를 가진 데이터가 없습니다.");
                }

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePath, updatedJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
            }
        }

        // 파일의 평가 + 업데이트
        private void FileEval(string fullpath, string colHeaderName, int row)
        {
            int star = Convert.ToInt16(colHeaderName);
            if (dataGridView1.Rows[row].Cells["eval"].Value.ToString().Length == star)
                return;
            string eval = string.Empty;
            for (int i = 0; i < star; i++)
            {
                eval += "★";
            }
            dataGridView1.Rows[row].Cells["eval"].Value = eval;
            UpdateEvalByFullpath(fullpath, eval);
        }
        public void UpdateEvalByFullpath(string fullpath, string newEval)
        {
            try
            {
                // 해당 fullpath를 가진 데이터 찾아서 eval 값을 업데이트
                var dataToUpdate = dataList.FirstOrDefault(data => data.ContainsKey("fullpath") && data["fullpath"].ToString() == fullpath);
                if (dataToUpdate != null)
                {
                    dataToUpdate["eval"] = newEval;
                    Console.WriteLine("eval 값이 업데이트되었습니다.");
                }
                else
                {
                    Console.WriteLine("해당 fullpath를 가진 데이터가 없습니다.");
                }

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePathFiles, updatedJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
            }
        }

        // 파일의 메모 + 업데이트
        private void FileMemo(string fullpath, string desc)
        {
            UpdateDescByFullpath(fullpath, desc);
        }

        public void UpdateDescByFullpath(string fullpath, string desc)
        {
            try
            {
                // 해당 fullpath를 가진 데이터 찾아서 eval 값을 업데이트
                var dataToUpdate = dataList.FirstOrDefault(data => data.ContainsKey("fullpath") && data["fullpath"].ToString() == fullpath);
                if (dataToUpdate != null)
                {
                    dataToUpdate["desc"] = desc;
                    Console.WriteLine("eval 값이 업데이트되었습니다.");
                }
                else
                {
                    Console.WriteLine("해당 fullpath를 가진 데이터가 없습니다.");
                }

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePathFiles, updatedJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
            }
        }


        // 파일의 경로 열기
        private void FilePathOpen(int row)
        {
            var p = new Process();
            p.StartInfo = new ProcessStartInfo(@$"{Path.GetDirectoryName(dataGridView1.Rows[row].Cells["fullpath"].Value.ToString())}")
            {
                UseShellExecute = true
            };
            p.Start();
        }
        //그리드 조회
        private void Search()
        {
            dataGridView1.Visible = true;
            if (SearchTextBox.Trim() != String.Empty)
            {
                try
                {
                    DataTable dt = dt_file.AsEnumerable()
                .Where(r => r.Field<string>("filename").ToUpper().Contains(SearchTextBox.ToUpper()) == true)
                .CopyToDataTable();
                    dataGridView1.DataSource = dt;
                    StatusCount = this.dataGridView1.Rows.Count;
                }
                catch
                {
                    dataGridView1.Visible = false;
                }
            }
            else
            {
                dataGridView1.DataSource = dt_file;
                StatusCount = dt_file.Rows.Count;
            }
        }
        #endregion

        #region Event Handler
        // lib 버튼
        private void button_lib_Click(object sender, EventArgs e)
        {
            Library libform = new Library();
            libform.ShowDialog();
            if (libform.DialogResult == DialogResult.OK)
            {
                GetLibraries();
                GetFiles();
                SetGrid();
                StatusCount = this.dataGridView1.Rows.Count;
            }
        }
        // 신규 파일 찾아서 추가하기 버튼
        private void button_refresh_Click(object sender, EventArgs e)
        {
            GetNewFiles();
            SetGrid();
        }
        // 사라진 파일 제거하기 버튼
        private void button1_Click_1(object sender, EventArgs e)
        {
            SetDelFiles();
            SetGrid();
        }
        private void button1_Click(object sender, EventArgs e)
        {
            List<int> del_list = new List<int>();
            for (int row = 0; row < this.dataGridView1.Rows.Count; row++)
            {
                if (dataGridView1.Rows[row].Selected)
                {
                    del_list.Add(row);
                }
            }
            for (int row = del_list.Count - 1; row >= 0; row--)
            {
                string fullpath = dataGridView1.Rows[del_list[row]].Cells["fullpath"].Value.ToString();
                //파일삭제
                new System.IO.FileInfo(fullpath).Delete();
                RemoveDataByFullpath(jsonFilePathFiles, fullpath);
                //그리드 삭제
                dataGridView1.Rows.RemoveAt(del_list[row]);
            }
            StatusCount = this.dataGridView1.Rows.Count;
        }
        public void RemoveDataByFullpath(string jsonFilePath, string fullpath)
        {
            try
            {
                // 해당 fullpath를 가진 데이터 찾아서 삭제
                var dataToRemove = dataList.FirstOrDefault(data => data.ContainsKey("fullpath") && data["fullpath"].ToString() == fullpath);
                if (dataToRemove != null)
                {
                    dataList.Remove(dataToRemove);
                    Console.WriteLine("데이터가 삭제되었습니다.");
                }
                else
                {
                    Console.WriteLine("해당 fullpath를 가진 데이터가 없습니다.");
                }

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePath, updatedJson);
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
            }
        }


        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == -1 || e.RowIndex == -1)
                return;

            int x = e.ColumnIndex;
            int y = e.RowIndex;
            string colName = this.dataGridView1.Columns[x].Name;

            switch (colName)
            {
                case "exe":
                    FileExe(this.dataGridView1.Rows[y].Cells["fullpath"].Value.ToString(), y);
                    this.dataGridView1.Rows[y].Selected = true;
                    break;
                case "score0":
                case "score1":
                case "score2":
                case "score3":
                case "score4":
                case "score5":
                    string colHeaderName = this.dataGridView1.Columns[x].HeaderText;
                    FileEval(this.dataGridView1.Rows[y].Cells["fullpath"].Value.ToString(), colHeaderName, y);
                    break;
                case "openpath":
                    FilePathOpen(y);
                    break;
            }
            return;
        }
        private void dataGridView1_CellDoubleClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex != -1 && e.RowIndex != -1)
            {
                FileExe(this.dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(), e.RowIndex);
                dataGridView1.CurrentCell = dataGridView1.Rows[e.RowIndex].Cells[0];
            }
        }
        private void dataGridView1_CellEndEdit(object sender, DataGridViewCellEventArgs e)
        {
            int x = e.ColumnIndex;
            int y = e.RowIndex;

            if (dataGridView1.Rows[y].Cells["desc"] == null || x != dataGridView1.Columns["desc"].Index)
                return;

            string colName = this.dataGridView1.Columns[x].Name;

            switch (colName)
            {
                case "desc":
                    FileMemo(jsonFilePathFiles, dataGridView1.Rows[y].Cells["desc"].Value.ToString().ToStr());
                    break;
            }
            return;
        }
        private void textBox1_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                Search();
            }
        }
        #endregion

        #region DataBase
        //select 쿼리 수행 -> DataTable 리턴
        public DataTable select(List<Dictionary<string, object>> data_, int keyCol_Index)
        {
            try
            {
                // DataTable 생성
                DataTable dataTable = new DataTable();

                // 첫 번째 행을 기준으로 컬럼 생성
                if (data_.Count > 0)
                {
                    foreach (string key in data_[keyCol_Index].Keys)
                    {
                        dataTable.Columns.Add(key, typeof(object));
                    }

                    // 데이터 추가
                    foreach (Dictionary<string, object> data in data_)
                    {
                        DataRow row = dataTable.NewRow();
                        foreach (KeyValuePair<string, object> entry in data)
                        {
                            row[entry.Key] = entry.Value;
                        }
                        dataTable.Rows.Add(row);
                    }
                }

                return dataTable;
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
                MessageBox.Show("오류 발생: " + ex.Message);
                return null;
            }
        }
        // 파일 한개 추가하기
        public void INSERT_SINGLE(string jsonFilePath, string filename, string addtime, string fullpath)
        {
            try
            {
                // 새 데이터 생성 및 추가
                Dictionary<string, object> newData = new Dictionary<string, object>();
                newData["filename"] = Path.GetFileName(filename);
                newData["addtime"] = addtime;
                newData["fullpath"] = fullpath;
                newData["lasttime"] = ""; // 기본값으로 빈 문자열 삽입
                //newData["exe"] = ""; // 기본값으로 빈 문자열 삽입
                newData["eval"] = ""; // 기본값으로 빈 문자열 삽입
                newData["desc"] = ""; // 기본값으로 빈 문자열 삽입

                // 데이터 리스트에 새 데이터 추가
                dataList.Add(newData);

                // 수정된 데이터를 JSON 형식으로 변환하여 파일에 쓰기
                string updatedJson = JsonConvert.SerializeObject(dataList, Formatting.Indented);
                File.WriteAllText(jsonFilePath, updatedJson);

                Console.WriteLine("데이터 추가 완료");
            }
            catch (Exception ex)
            {
                Console.WriteLine("오류 발생: " + ex.Message);
                MessageBox.Show(ex.Message);
            }
        }
        #endregion


        private void button4_Click(object sender, EventArgs e)
        {
            //readXml();
            //createJson();
        }

        private void button5_Click(object sender, EventArgs e)
        {
            try
            {
                // 기존 데이터 리스트로 변환
                dataListLib = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePathLib));
                dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePathFiles));

                // DB 로부터 라이브러리 정보 가져오기 : json 읽어
                GetLibraries();
                GetFiles();
                // 파일상태 점검하여 추가하기 : 점검해서 json 업데이트
                GetNewFiles();
                // 그리드 생성
                SetGrid();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
    }
}
