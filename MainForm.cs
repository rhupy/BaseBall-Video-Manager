using Newtonsoft.Json;
using System;
using System.Collections;
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
        #region ProgressBar
        async void ProgressBarPlus()
        {
            try
            {
                this.toolStripProgressBar1.Value = this.toolStripProgressBar1.Maximum >= this.toolStripProgressBar1.Value + 1 ? this.toolStripProgressBar1.Value + 1 : this.toolStripProgressBar1.Value;
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
                this.toolStripProgressBar1.Maximum = Convert.ToInt32(value.ToString());
            }
        }
        #endregion
        string SearchTextBox
        {
            get { return this.textBox1.Text; }
        }
        #endregion

        private Library library = new Library();
        private FileManager fileManager;
        private FileWatcher fileWatcher;
        private List<DirectoryEntry> directoryEntries; // 디렉토리 목록을 저장하기 위한 리스트
        private BindingList<FileEntry> fileEntries;

        public MainForm()
        {
            InitializeComponent();
            fileManager = new FileManager();
            fileWatcher = new FileWatcher();
            LoadFiles();  // 파일 목록을 로드하고 정렬하여 그리드에 표시
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            dataGridView1.DataSource = fileEntries;
            changeTab(0);
        }

        private void LoadFiles()
        {
            var entries = fileManager.LoadFiles();  // 파일 목록 로드
            entries.Sort((x, y) => DateTime.Parse(y.Addtime).CompareTo(DateTime.Parse(x.Addtime)));// addtime을 기준으로 내림차순 정렬

            // SortableBindingList로 변경
            fileEntries = new SortableBindingList<FileEntry>(entries);

            // DataGridView에 바인딩
            dataGridView1.DataSource = fileEntries;

            //fileEntries = new BindingList<FileEntry>(entries);
            //dataGridView1.DataSource = fileEntries;
            StatusCount = fileEntries.Count();
        }

        #region Event Handler

        // 스타트
        private void button5_Click(object sender, EventArgs e)
        {
            LoadFiles();  // 파일 목록을 로드하고 정렬하여 그리드에 표시
        }
        // lib 버튼
        private void button_lib_Click(object sender, EventArgs e)
        {
            library.ShowDialog();
        }
        // 추가검색
        private void button_refresh_Click(object sender, EventArgs e)
        {

            fileManager.UpdateFiles(this.toolStripProgressBar1.Value);  // 파일 목록을 로드하고 정렬하여 그리드에 표시
        }
        // 삭제 버튼
        private void button1_Click(object sender, EventArgs e)
        {
            // 데이터 그리드 뷰에서 현재 선택된 행의 파일 경로를 가져옵니다.
            if (dataGridView1.SelectedRows.Count > 0)
            {
                string fullpath = dataGridView1.SelectedRows[0].Cells["fullpath"].Value.ToString();
                DeleteFileAndData(fullpath);
            }
            else
            {
                MessageBox.Show("삭제할 파일을 선택하세요.", "선택 필요", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        private void DeleteFileAndData(string fullpath)
        {
            // 파일 시스템에서 파일을 삭제합니다.
            try
            {
                File.Delete(fullpath);
            }
            catch (IOException ex)
            {
                var fileToRemove_ = fileEntries.FirstOrDefault(f => f.Fullpath == fullpath);
                if (fileToRemove_ != null)
                {
                    fileEntries.Remove(fileToRemove_);
                }
                //MessageBox.Show($"파일 삭제 중 오류가 발생했습니다: {ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // 데이터 바인딩 리스트에서 해당 파일 정보를 삭제합니다.
            var fileToRemove = fileEntries.FirstOrDefault(f => f.Fullpath == fullpath);
            if (fileToRemove != null)
            {
                fileEntries.Remove(fileToRemove);
            }
        }
        // 기타 버튼
        private void button4_Click(object sender, EventArgs e)
        {
            deleteDup("data\\files.json");
        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == -1 || e.RowIndex == -1)
                return;
            string colName = this.dataGridView1.Columns[e.ColumnIndex].Name;
            // 그리드안의 각 버튼을 클릭했을때의 로직
            switch (colName)
            {
                case "exe":
                    try
                    {
                        // explorer를 사용하여 파일을 실행
                        // 파일 직접 실행
                        string fullPath = Path.GetFullPath(dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString());
                        ProcessStartInfo startInfo = new ProcessStartInfo
                        {
                            FileName = fullPath,
                            UseShellExecute = true  // 셸을 사용하여 파일 실행
                        };
                        Process.Start(startInfo);
                        string fileID_ = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // 파일 ID
                        UpdateLasttime(fileID_);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"파일을 열 수 없습니다: {ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                    break;
                case "score0":
                case "score1":
                case "score2":
                case "score3":
                case "score4":
                case "score5":
                    int score = int.Parse(colName.Replace("score", "")); // "scoreX"에서 X 추출
                    string fileID = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // 파일 ID
                    UpdateScore(fileID, score); // 점수 업데이트 함수
                    break;
                case "openpath":
                    string directoryPath = Path.GetDirectoryName(dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString());
                    System.Diagnostics.Process.Start("explorer.exe", directoryPath);
                    break;
            }
            return;
        }

        private void UpdateScore(string fullpath, int score)
        {
            // 파일 목록을 로드합니다.
            List<FileEntry> entries = fileManager.LoadFiles();
            // 해당 경로를 가진 파일을 찾습니다.
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                // 점수(score)만큼 별을 문자열로 생성합니다.
                file.Eval = new string('★', score);
                // 변경사항을 파일에 저장합니다.
                fileManager.SaveFiles(entries);

                // 데이터 그리드 뷰에서 해당 파일의 Eval 컬럼을 업데이트합니다.
                UpdateDataGridViewCell(fullpath, file.Eval);
            }
            else
            {
                // 파일을 찾을 수 없는 경우 경고 메시지를 표시합니다.
                MessageBox.Show("지정된 경로의 파일을 찾을 수 없습니다.", "파일 미발견", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateLasttime(string fullpath)
        {
            // 파일 목록을 로드합니다.
            List<FileEntry> entries = fileManager.LoadFiles();
            // 해당 경로를 가진 파일을 찾습니다.
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                // 점수(score)만큼 별을 문자열로 생성합니다.
                file.Lasttime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                // 변경사항을 파일에 저장합니다.
                fileManager.SaveFiles(entries);

                // 데이터 그리드 뷰에서 해당 파일의 Eval 컬럼을 업데이트합니다.
                UpdateDataGridViewCell1(fullpath, file.Lasttime);
            }
            else
            {
                // 파일을 찾을 수 없는 경우 경고 메시지를 표시합니다.
                MessageBox.Show("지정된 경로의 파일을 찾을 수 없습니다.", "파일 미발견", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateDataGridViewCell1(string fullpath, string lasttime)
        {
            foreach (DataGridViewRow row in dataGridView1.Rows)
            {
                if (row.Cells["fullpath"].Value.ToString() == fullpath)
                {
                    row.Cells["Lasttime"].Value = lasttime;  // Eval 컬럼이 별 평가를 표시하는 컬럼이라고 가정
                    break;
                }
            }
        }
        private void UpdateDataGridViewCell(string fullpath, string eval)
        {
            foreach (DataGridViewRow row in dataGridView1.Rows)
            {
                if (row.Cells["fullpath"].Value.ToString() == fullpath)
                {
                    row.Cells["Eval"].Value = eval;  // Eval 컬럼이 별 평가를 표시하는 컬럼이라고 가정
                    break;
                }
            }
        }



        private void dataGridView1_CellDoubleClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex != -1 && e.RowIndex != -1)
            {
                //FileExe(this.dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(), e.RowIndex);
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
                    //FileMemo(jsonFilePathFiles, dataGridView1.Rows[y].Cells["desc"].Value.ToString().ToStr());
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

        private BindingList<FileEntry> filteredFiles = new BindingList<FileEntry>(); // 필터링된 파일 목록

        private void Search()
        {
            string filterText = textBox1.Text.ToLower(); // 대소문자를 구분하지 않기 위해 소문자로 변환
            filteredFiles.Clear(); // 이전 검색 결과를 클리어
            if (filterText.Trim().Length == 0)
            {
                dataGridView1.DataSource = fileEntries; // DataGridView에 바인딩
                return;
            }

            foreach (var file in fileEntries)
            {
                if (file.Filename.ToLower().Contains(filterText))
                {
                    filteredFiles.Add(file); // 필터 조건에 맞는 파일만 추가
                }
            }

            dataGridView1.DataSource = filteredFiles; // DataGridView에 바인딩
        }

        private void deleteDup(string path)
        {
            string jsonFilePath = path;

            // JSON 파일을 읽고, 리스트의 딕셔너리로 역직렬화합니다.
            List<Dictionary<string, object>> dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePath));

            // "fullpath" 값을 키로 사용하는 딕셔너리를 생성합니다.
            Dictionary<string, Dictionary<string, object>> dict = new Dictionary<string, Dictionary<string, object>>();

            // 리스트에서 데이터를 가져와 딕셔너리를 채웁니다.
            foreach (var data in dataList)
            {
                if (data.ContainsKey("Fullpath"))
                {
                    string fullpath = data["Fullpath"].ToString();
                    if (!dict.ContainsKey(fullpath))
                    {
                        dict.Add(fullpath, data);
                    }
                }
                else
                {
                    // "fullpath" 키가 없는 데이터에 대한 처리 (예: 로깅 또는 오류 메시지 출력)
                    Console.WriteLine("Warning: A record without a 'Fullpath' was found and skipped.");
                }
            }

            // 딕셔너리를 다시 딕셔너리의 리스트로 변환합니다.
            List<Dictionary<string, object>> uniqueDataList = new List<Dictionary<string, object>>(dict.Values);

            // 리스트의 딕셔너리를 JSON 형식으로 직렬화하고 파일에 기록합니다.
            string updatedJson = JsonConvert.SerializeObject(uniqueDataList, Formatting.Indented);
            File.WriteAllText(jsonFilePath, updatedJson);

            Console.WriteLine("Duplicate entries with the same fullpath removed successfully.");
        }

        #endregion


        private void tabControl1_SelectedIndexChanged(object sender, EventArgs e)
        {
            changeTab(tabControl1.SelectedIndex);
        }
        private void changeTab(int index)
        {
            fileManager.tabIndex = index;
            fileManager.changeExtension(index);
            toolStripStatusLabel2.Text = fileManager.fileListString();
        }
    }


    public class SortableBindingList<T> : BindingList<T> where T : class
    {
        private ListSortDirection sortDirection;
        private PropertyDescriptor sortProperty;
        private bool isSorted;

        protected override bool SupportsSortingCore => true;
        protected override bool IsSortedCore => this.isSorted;
        protected override ListSortDirection SortDirectionCore => this.sortDirection;
        protected override PropertyDescriptor SortPropertyCore => this.sortProperty;

        // 추가된 생성자
        public SortableBindingList(IList<T> list) : base(list)
        {
        }

        protected override void ApplySortCore(PropertyDescriptor prop, ListSortDirection direction)
        {
            var itemList = this.Items as List<T>;
            if (itemList != null)
            {
                var comparer = new CustomComparer<T>(prop, direction);
                itemList.Sort(comparer);
                this.sortProperty = prop;
                this.sortDirection = direction;
                this.isSorted = true;

                this.OnListChanged(new ListChangedEventArgs(ListChangedType.Reset, -1));
            }
        }

        private class CustomComparer<K> : IComparer<K> where K : class
        {
            private PropertyDescriptor propertyDescriptor;
            private ListSortDirection sortDirection;

            public CustomComparer(PropertyDescriptor prop, ListSortDirection direction)
            {
                this.propertyDescriptor = prop;
                this.sortDirection = direction;
            }

            public int Compare(K x, K y)
            {
                var xValue = propertyDescriptor.GetValue(x);
                var yValue = propertyDescriptor.GetValue(y);
                if (sortDirection == ListSortDirection.Ascending)
                {
                    return Comparer.Default.Compare(xValue, yValue);
                }
                else
                {
                    return Comparer.Default.Compare(yValue, xValue);
                }
            }
        }
    }
}
