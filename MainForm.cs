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
        private List<DirectoryEntry> directoryEntries;
        private BindingList<FileEntry> fileEntries1;
        private BindingList<FileEntry> fileEntries2;
        private DataGridView CurrentDataGridView => fileManager.tabIndex == 0 ? dataGridView1 : dataGridView2;

        // 예를 들어, 생성자에서 호출할 경우
        public MainForm()
        {
            InitializeComponent();
            fileManager = new FileManager();
            fileWatcher = new FileWatcher();

            // 두 DataGridView에 대한 이벤트 핸들러 연결
            dataGridView1.CellContentClick += DataGridView_CellContentClick;
            dataGridView2.CellContentClick += DataGridView_CellContentClick;
            dataGridView1.CellDoubleClick += DataGridView_CellDoubleClick;
            dataGridView2.CellDoubleClick += DataGridView_CellDoubleClick;
            dataGridView1.CellEndEdit += DataGridView_CellEndEdit;
            dataGridView2.CellEndEdit += DataGridView_CellEndEdit;

            // LoadFiles 메서드 호출
            _ = LoadFiles();  // 비동기 메서드를 동기적으로 실행하지 않기 위해 _ = 사용

            changeTab(0); // 초기 탭 설정
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            dataGridView1.DataSource = fileEntries1;
            dataGridView2.DataSource = fileEntries2;
            changeTab(0);
        }

        #region Event Handler

        private void button5_Click(object sender, EventArgs e)
        {
            LoadFiles();
        }

        private void button_lib_Click(object sender, EventArgs e)
        {
            library.ShowDialog();
        }

        private async void button_refresh_Click(object sender, EventArgs e)
        {
            // button_refresh.Enabled = false;
            toolStripProgressBar1.Value = 0;
            toolStripProgressBar1.Visible = true;

            var progress = new Progress<int>(value =>
            {
                toolStripProgressBar1.Value = value;
            });

            try
            {
                await fileManager.UpdateFiles(progress);
                await LoadFiles(); // 비동기로 LoadFiles 실행
                this.Invoke((MethodInvoker)delegate {
                    dataGridView1.Refresh();
                    dataGridView2.Refresh();
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"파일 업데이트 중 오류 발생: {ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                button_refresh.Enabled = true;
                toolStripProgressBar1.Visible = false;
            }
        }

        private async Task LoadFiles()
        {
            var entries1 = await Task.Run(() => fileManager.LoadFiles(0));
            var entries2 = await Task.Run(() => fileManager.LoadFiles(1));

            await Task.Run(() => {
                entries1.Sort((x, y) => DateTime.Parse(y.Addtime).CompareTo(DateTime.Parse(x.Addtime)));
                entries2.Sort((x, y) => DateTime.Parse(y.Addtime).CompareTo(DateTime.Parse(x.Addtime)));
            });

            this.Invoke((MethodInvoker)delegate {
                fileEntries1 = new SortableBindingList<FileEntry>(entries1);
                fileEntries2 = new SortableBindingList<FileEntry>(entries2);

                dataGridView1.DataSource = fileEntries1;
                dataGridView2.DataSource = fileEntries2;

                StatusCount = fileEntries1.Count + fileEntries2.Count;
            });
        }

        private void button1_Click(object sender, EventArgs e)
        {
            if (CurrentDataGridView.SelectedRows.Count > 0)
            {
                string fullpath = CurrentDataGridView.SelectedRows[0].Cells["fullpath"].Value.ToString();
                DeleteFileAndData(fullpath);
            }
            else
            {
                MessageBox.Show("삭제할 파일을 선택하세요.", "선택 필요", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private void DeleteFileAndData(string fullpath)
        {
            try
            {
                File.Delete(fullpath);
            }
            catch (IOException ex)
            {
                // 파일 삭제 실패 시 처리
            }

            var currentFileEntries = fileManager.tabIndex == 0 ? fileEntries1 : fileEntries2;
            var fileToRemove = currentFileEntries.FirstOrDefault(f => f.Fullpath == fullpath);
            if (fileToRemove != null)
            {
                currentFileEntries.Remove(fileToRemove);
                fileManager.SaveFiles(currentFileEntries.ToList(), fileManager.tabIndex);
            }
        }

        private async void button4_Click(object sender, EventArgs e)
        {
            button4.Enabled = false;
            toolStripProgressBar1.Value = 0;
            toolStripProgressBar1.Visible = true;

            try
            {
                await Task.Run(() =>
                {
                    // 중복 데이터 삭제
                    string jsonFilePath = fileManager.CurrentFilesPath;
                    List<Dictionary<string, object>> dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePath));
                    Dictionary<string, Dictionary<string, object>> dict = new Dictionary<string, Dictionary<string, object>>();

                    int totalItems = dataList.Count;
                    for (int i = 0; i < dataList.Count; i++)
                    {
                        var data = dataList[i];
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
                            Console.WriteLine("Warning: A record without a 'Fullpath' was found and skipped.");
                        }
                        int progressPercentage = (int)((i + 1) / (float)totalItems * 33);
                        this.Invoke((MethodInvoker)delegate {
                            toolStripProgressBar1.Value = progressPercentage;
                        });
                    }

                    List<Dictionary<string, object>> uniqueDataList = new List<Dictionary<string, object>>(dict.Values);

                    // 중복이 제거된 데이터를 FileEntry 리스트로 변환
                    List<FileEntry> files = uniqueDataList.Select(d => new FileEntry
                    {
                        Filename = d["Filename"].ToString(),
                        Fullpath = d["Fullpath"].ToString(),
                        Lasttime = d["Lasttime"].ToString(),
                        Addtime = d["Addtime"].ToString(),
                        Eval = d["Eval"].ToString(),
                        Desc = d["Desc"].ToString()
                    }).ToList();

                    this.Invoke((MethodInvoker)delegate {
                        toolStripProgressBar1.Value = 33;
                    });

                    // 빈 폴더 제거
                    files = fileManager.RemoveEmptyFolders(files, (progress) =>
                    {
                        this.Invoke((MethodInvoker)delegate {
                            toolStripProgressBar1.Value = 33 + (int)((float)progress / 100 * 33);
                        });
                    });

                    this.Invoke((MethodInvoker)delegate {
                        toolStripProgressBar1.Value = 66;
                    });

                    // 결과 저장
                    string updatedJson = JsonConvert.SerializeObject(files, Formatting.Indented);
                    File.WriteAllText(jsonFilePath, updatedJson);

                    this.Invoke((MethodInvoker)delegate {
                        toolStripProgressBar1.Value = 100;
                    });
                });

                await LoadFiles(); // 업데이트 후 파일 목록 다시 로드
                MessageBox.Show("중복 데이터 및 빈 폴더 제거가 완료되었습니다.", "작업 완료", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"작업 중 오류 발생: {ex.Message}", "오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                button4.Enabled = true;
                toolStripProgressBar1.Visible = false;
            }
        }

        private void DataGridView_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            DataGridView dgv = (DataGridView)sender;
            if (e.ColumnIndex == -1 || e.RowIndex == -1)
                return;
            string colName = dgv.Columns[e.ColumnIndex].Name;

            switch (colName)
            {
                case "exe":
                    try
                    {
                        string fullPath = Path.GetFullPath(dgv.Rows[e.RowIndex].Cells["fullpath"].Value.ToString());
                        ProcessStartInfo startInfo = new ProcessStartInfo
                        {
                            FileName = fullPath,
                            UseShellExecute = true
                        };
                        Process.Start(startInfo);
                        string fileID_ = dgv.Rows[e.RowIndex].Cells["fullpath"].Value.ToString();
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
                    int score = int.Parse(colName.Replace("score", ""));
                    string fileID = dgv.Rows[e.RowIndex].Cells["fullpath"].Value.ToString();
                    UpdateScore(fileID, score);
                    break;
                case "openpath":
                    string directoryPath = Path.GetDirectoryName(dgv.Rows[e.RowIndex].Cells["fullpath"].Value.ToString());
                    System.Diagnostics.Process.Start("explorer.exe", directoryPath);
                    break;
            }
        }

        private void UpdateScore(string fullpath, int score)
        {
            List<FileEntry> entries = fileManager.LoadFiles(fileManager.tabIndex);
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                file.Eval = new string('★', score);
                fileManager.SaveFiles(entries, fileManager.tabIndex);
                UpdateDataGridViewCell(fullpath, file.Eval);
            }
            else
            {
                MessageBox.Show("지정된 경로의 파일을 찾을 수 없습니다.", "파일 미발견", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateLasttime(string fullpath)
        {
            List<FileEntry> entries = fileManager.LoadFiles(fileManager.tabIndex);
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                file.Lasttime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                fileManager.SaveFiles(entries, fileManager.tabIndex);
                UpdateDataGridViewCell1(fullpath, file.Lasttime);
            }
            else
            {
                MessageBox.Show("지정된 경로의 파일을 찾을 수 없습니다.", "파일 미발견", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateDataGridViewCell1(string fullpath, string lasttime)
        {
            foreach (DataGridViewRow row in CurrentDataGridView.Rows)
            {
                if (row.Cells["fullpath"].Value.ToString() == fullpath)
                {
                    row.Cells["Lasttime"].Value = lasttime;
                    break;
                }
            }
        }

        private void UpdateDataGridViewCell(string fullpath, string eval)
        {
            foreach (DataGridViewRow row in CurrentDataGridView.Rows)
            {
                if (row.Cells["fullpath"].Value.ToString() == fullpath)
                {
                    row.Cells["Eval"].Value = eval;
                    break;
                }
            }
        }

        private void DataGridView_CellDoubleClick(object sender, DataGridViewCellEventArgs e)
        {
            DataGridView dgv = (DataGridView)sender;
            if (e.ColumnIndex != -1 && e.RowIndex != -1)
            {
                try
                {
                    // 보이는 첫 번째 열을 찾습니다.
                    int visibleColumnIndex = dgv.Columns.Cast<DataGridViewColumn>()
                                                .Where(c => c.Visible)
                                                .Select(c => c.Index)
                                                .FirstOrDefault();

                    if (visibleColumnIndex != -1)
                    {
                        dgv.CurrentCell = dgv.Rows[e.RowIndex].Cells[visibleColumnIndex];
                    }
                    else
                    {
                        MessageBox.Show("보이는 열이 없습니다.");
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"셀 선택 중 오류 발생: {ex.Message}");
                }
            }
        }

        private void DataGridView_CellEndEdit(object sender, DataGridViewCellEventArgs e)
        {
            DataGridView dgv = (DataGridView)sender;
            int x = e.ColumnIndex;
            int y = e.RowIndex;

            if (dgv.Rows[y].Cells["desc"] == null || x != dgv.Columns["desc"].Index)
                return;

            string colName = dgv.Columns[x].Name;

            switch (colName)
            {
                case "desc":
                    // 여기에 desc 열 편집 관련 로직을 추가할 수 있습니다.
                    break;
            }
        }

        private void textBox1_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.KeyCode == Keys.Enter)
            {
                Search();
            }
        }

        private BindingList<FileEntry> filteredFiles = new BindingList<FileEntry>();

        private void Search()
        {
            string filterText = textBox1.Text.ToLower();
            var currentFileEntries = fileManager.tabIndex == 0 ? fileEntries1 : fileEntries2;
            filteredFiles.Clear();

            if (filterText.Trim().Length == 0)
            {
                CurrentDataGridView.DataSource = currentFileEntries;
                return;
            }

            foreach (var file in currentFileEntries)
            {
                if (file.Filename.ToLower().Contains(filterText))
                {
                    filteredFiles.Add(file);
                }
            }

            CurrentDataGridView.DataSource = filteredFiles;
        }

        private void deleteDup(string path)
        {
            string jsonFilePath = path;
            List<Dictionary<string, object>> dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePath));
            Dictionary<string, Dictionary<string, object>> dict = new Dictionary<string, Dictionary<string, object>>();

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
                    Console.WriteLine("Warning: A record without a 'Fullpath' was found and skipped.");
                }
            }

            List<Dictionary<string, object>> uniqueDataList = new List<Dictionary<string, object>>(dict.Values);
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

            // 현재 탭에 맞는 DataGridView를 새로고침
            if (index == 0)
            {
                dataGridView1.Refresh();
                dataGridView1.DataSource = fileEntries1;
            }
            else
            {
                dataGridView2.Refresh();
                dataGridView2.DataSource = fileEntries2;
            }

            // 현재 탭의 DataGridView에 대한 이벤트 핸들러 재연결
            CurrentDataGridView.CellContentClick -= DataGridView_CellContentClick;
            CurrentDataGridView.CellContentClick += DataGridView_CellContentClick;
            CurrentDataGridView.CellDoubleClick -= DataGridView_CellDoubleClick;
            CurrentDataGridView.CellDoubleClick += DataGridView_CellDoubleClick;
            CurrentDataGridView.CellEndEdit -= DataGridView_CellEndEdit;
            CurrentDataGridView.CellEndEdit += DataGridView_CellEndEdit;
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