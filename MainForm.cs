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
        }

        private void LoadFiles()
        {
            var entries = fileManager.LoadFiles();  // ���� ��� �ε�
                                                    // addtime�� �������� �������� ����
            entries.Sort((x, y) => DateTime.Parse(y.Addtime).CompareTo(DateTime.Parse(x.Addtime)));
            fileEntries = new BindingList<FileEntry>(entries);
            dataGridView1.DataSource = fileEntries;
            StatusText = fileEntries.Count().ToString();
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
        }
        // �߰��˻�
        private void button_refresh_Click(object sender, EventArgs e)
        {
            fileManager.UpdateFiles();  // ���� ����� �ε��ϰ� �����Ͽ� �׸��忡 ǥ��
        }
        // ���� �˻�
        private void button1_Click_1(object sender, EventArgs e)
        {

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
                    string filePath = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // ������ ���� ���
                    try
                    {
                        // explorer�� ����Ͽ� ������ ����
                        System.Diagnostics.Process.Start("explorer", $"\"{filePath}\"");
                        string fileID_ = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString(); // ���� ID
                        UpdateAddtime(fileID_);
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

        private void UpdateAddtime(string fullpath)
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
                UpdateDataGridViewCell(fullpath, file.Lasttime);
            }
            else
            {
                // ������ ã�� �� ���� ��� ��� �޽����� ǥ���մϴ�.
                MessageBox.Show("������ ����� ������ ã�� �� �����ϴ�.", "���� �̹߰�", MessageBoxButtons.OK, MessageBoxIcon.Warning);
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
                //Search();
            }
        }

        private void deleteDup(string path)
        {
            string jsonFilePath = path;

            // Read the JSON file and deserialize it into a list of dictionaries
            List<Dictionary<string, object>> dataList = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(File.ReadAllText(jsonFilePath));

            // Create a dictionary where the keys are the "fullpath" values
            Dictionary<string, Dictionary<string, object>> dict = new Dictionary<string, Dictionary<string, object>>();

            // Populate the dictionary with data from the list
            foreach (var data in dataList)
            {
                string fullpath = data["fullpath"].ToString();
                if (!dict.ContainsKey(fullpath))
                {
                    dict.Add(fullpath, data);
                }
            }

            // Convert the dictionary back into a list of dictionaries
            List<Dictionary<string, object>> uniqueDataList = new List<Dictionary<string, object>>(dict.Values);

            // Serialize the list of dictionaries back into JSON format and write it to the file
            string updatedJson = JsonConvert.SerializeObject(uniqueDataList, Formatting.Indented);
            File.WriteAllText(jsonFilePath, updatedJson);

            Console.WriteLine("Duplicate entries with the same fullpath removed successfully.");
        }
        #endregion


    }
}
