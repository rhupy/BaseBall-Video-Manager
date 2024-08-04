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
        private List<DirectoryEntry> directoryEntries; // ���丮 ����� �����ϱ� ���� ����Ʈ
        private BindingList<FileEntry> fileEntries;

        public MainForm()
        {
            InitializeComponent();
            fileManager = new FileManager();
            fileWatcher = new FileWatcher();
            LoadFiles();  // ���� ����� �ε��ϰ� �����Ͽ� �׸��忡 ǥ��
        }

        private void MainForm_Load(object sender, EventArgs e)
        {
            dataGridView1.DataSource = fileEntries;
            changeTab(0);
        }

        private void LoadFiles()
        {
            var entries = fileManager.LoadFiles();  // ���� ��� �ε�
            entries.Sort((x, y) => DateTime.Parse(y.Addtime).CompareTo(DateTime.Parse(x.Addtime)));// addtime�� �������� �������� ����

            // SortableBindingList�� ����
            fileEntries = new SortableBindingList<FileEntry>(entries);

            // DataGridView�� ���ε�
            dataGridView1.DataSource = fileEntries;

            //fileEntries = new BindingList<FileEntry>(entries);
            //dataGridView1.DataSource = fileEntries;
            StatusCount = fileEntries.Count();
        }

        #region Event Handler

        // ��ŸƮ
        private void button5_Click(object sender, EventArgs e)
        {
            LoadFiles();  // ���� ����� �ε��ϰ� �����Ͽ� �׸��忡 ǥ��
        }
        // lib ��ư
        private void button_lib_Click(object sender, EventArgs e)
        {
            library.ShowDialog();
        }
        // �߰��˻�
        private void button_refresh_Click(object sender, EventArgs e)
        {

            fileManager.UpdateFiles(this.toolStripProgressBar1.Value);  // ���� ����� �ε��ϰ� �����Ͽ� �׸��忡 ǥ��
        }
        // ���� ��ư
        private void button1_Click(object sender, EventArgs e)
        {
            // ������ �׸��� �信�� ���� ���õ� ���� ���� ��θ� �����ɴϴ�.
            if (dataGridView1.SelectedRows.Count > 0)
            {
                string fullpath = dataGridView1.SelectedRows[0].Cells["fullpath"].Value.ToString();
                DeleteFileAndData(fullpath);
            }
            else
            {
                MessageBox.Show("������ ������ �����ϼ���.", "���� �ʿ�", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        private void DeleteFileAndData(string fullpath)
        {
            // ���� �ý��ۿ��� ������ �����մϴ�.
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
                //MessageBox.Show($"���� ���� �� ������ �߻��߽��ϴ�: {ex.Message}", "����", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // ������ ���ε� ����Ʈ���� �ش� ���� ������ �����մϴ�.
            var fileToRemove = fileEntries.FirstOrDefault(f => f.Fullpath == fullpath);
            if (fileToRemove != null)
            {
                fileEntries.Remove(fileToRemove);
            }
        }
        // ��Ÿ ��ư
        private void button4_Click(object sender, EventArgs e)
        {
            deleteDup("data\\files.json");
        }

        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == -1 || e.RowIndex == -1)
                return;
            string colName = this.dataGridView1.Columns[e.ColumnIndex].Name;
            // �׸������ �� ��ư�� Ŭ���������� ����
            switch (colName)
            {
                case "exe":
                    try
                    {
                        // explorer�� ����Ͽ� ������ ����
                        // ���� ���� ����
                        string fullPath = Path.GetFullPath(dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString());
                        ProcessStartInfo startInfo = new ProcessStartInfo
                        {
                            FileName = fullPath,
                            UseShellExecute = true  // ���� ����Ͽ� ���� ����
                        };
                        Process.Start(startInfo);
                        string fileID_ = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // ���� ID
                        UpdateLasttime(fileID_);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show($"������ �� �� �����ϴ�: {ex.Message}", "����", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                    break;
                case "score0":
                case "score1":
                case "score2":
                case "score3":
                case "score4":
                case "score5":
                    int score = int.Parse(colName.Replace("score", "")); // "scoreX"���� X ����
                    string fileID = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // ���� ID
                    UpdateScore(fileID, score); // ���� ������Ʈ �Լ�
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
            // ���� ����� �ε��մϴ�.
            List<FileEntry> entries = fileManager.LoadFiles();
            // �ش� ��θ� ���� ������ ã���ϴ�.
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                // ����(score)��ŭ ���� ���ڿ��� �����մϴ�.
                file.Eval = new string('��', score);
                // ��������� ���Ͽ� �����մϴ�.
                fileManager.SaveFiles(entries);

                // ������ �׸��� �信�� �ش� ������ Eval �÷��� ������Ʈ�մϴ�.
                UpdateDataGridViewCell(fullpath, file.Eval);
            }
            else
            {
                // ������ ã�� �� ���� ��� ��� �޽����� ǥ���մϴ�.
                MessageBox.Show("������ ����� ������ ã�� �� �����ϴ�.", "���� �̹߰�", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateLasttime(string fullpath)
        {
            // ���� ����� �ε��մϴ�.
            List<FileEntry> entries = fileManager.LoadFiles();
            // �ش� ��θ� ���� ������ ã���ϴ�.
            var file = entries.Find(f => f.Fullpath == fullpath);
            if (file != null)
            {
                // ����(score)��ŭ ���� ���ڿ��� �����մϴ�.
                file.Lasttime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                // ��������� ���Ͽ� �����մϴ�.
                fileManager.SaveFiles(entries);

                // ������ �׸��� �信�� �ش� ������ Eval �÷��� ������Ʈ�մϴ�.
                UpdateDataGridViewCell1(fullpath, file.Lasttime);
            }
            else
            {
                // ������ ã�� �� ���� ��� ��� �޽����� ǥ���մϴ�.
                MessageBox.Show("������ ����� ������ ã�� �� �����ϴ�.", "���� �̹߰�", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void UpdateDataGridViewCell1(string fullpath, string lasttime)
        {
            foreach (DataGridViewRow row in dataGridView1.Rows)
            {
                if (row.Cells["fullpath"].Value.ToString() == fullpath)
                {
                    row.Cells["Lasttime"].Value = lasttime;  // Eval �÷��� �� �򰡸� ǥ���ϴ� �÷��̶�� ����
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
                    row.Cells["Eval"].Value = eval;  // Eval �÷��� �� �򰡸� ǥ���ϴ� �÷��̶�� ����
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

        private BindingList<FileEntry> filteredFiles = new BindingList<FileEntry>(); // ���͸��� ���� ���

        private void Search()
        {
            string filterText = textBox1.Text.ToLower(); // ��ҹ��ڸ� �������� �ʱ� ���� �ҹ��ڷ� ��ȯ
            filteredFiles.Clear(); // ���� �˻� ����� Ŭ����
            if (filterText.Trim().Length == 0)
            {
                dataGridView1.DataSource = fileEntries; // DataGridView�� ���ε�
                return;
            }

            foreach (var file in fileEntries)
            {
                if (file.Filename.ToLower().Contains(filterText))
                {
                    filteredFiles.Add(file); // ���� ���ǿ� �´� ���ϸ� �߰�
                }
            }

            dataGridView1.DataSource = filteredFiles; // DataGridView�� ���ε�
        }

        private void deleteDup(string path)
        {
            string jsonFilePath = path;

            // JSON ������ �а�, ����Ʈ�� ��ųʸ��� ������ȭ�մϴ�.
            List<Dictionary<string, object>> dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePath));

            // "fullpath" ���� Ű�� ����ϴ� ��ųʸ��� �����մϴ�.
            Dictionary<string, Dictionary<string, object>> dict = new Dictionary<string, Dictionary<string, object>>();

            // ����Ʈ���� �����͸� ������ ��ųʸ��� ä��ϴ�.
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
                    // "fullpath" Ű�� ���� �����Ϳ� ���� ó�� (��: �α� �Ǵ� ���� �޽��� ���)
                    Console.WriteLine("Warning: A record without a 'Fullpath' was found and skipped.");
                }
            }

            // ��ųʸ��� �ٽ� ��ųʸ��� ����Ʈ�� ��ȯ�մϴ�.
            List<Dictionary<string, object>> uniqueDataList = new List<Dictionary<string, object>>(dict.Values);

            // ����Ʈ�� ��ųʸ��� JSON �������� ����ȭ�ϰ� ���Ͽ� ����մϴ�.
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

        // �߰��� ������
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
