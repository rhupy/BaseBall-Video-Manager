//�����ִºκк��� ��ť�� �Ұ�
using MySqlConnector;
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

namespace BaseBall_Video_Manager
{
    public partial class MainForm : Form
    {
        #region variable
        MySqlConnection mySqlConnection = null;
        string[] exts = new[] { ".avi", ".mp4", ".mov", ".wmv", ".avchd", ".flv", ".f4v", ".swf", ".mkv", ".mpeg2", ".ts", ".tp" };
        DataTable dt_file = new DataTable();
        DataTable dt_lib = new DataTable();
        XmlDocument doc = new XmlDocument();

        const string sqlInsertLib = "INSERT INTO `baseball_mgr`.`library` (`path`) VALUES (@path)";
        const string sqlInsertFile = "INSERT INTO `baseball_mgr`.`files` (`filename`, `lasttime`, `addtime`, `eval`, `desc`, `fullpath`) VALUES (@filename, @lasttime, @addtime, @eval, @desc, @fullpath)";
        const string sqlSelectlib = "SELECT * FROM `baseball_mgr`.`library`";
        const string sqlSelectFile = "SELECT * FROM `baseball_mgr`.`files` order by addtime desc, idx";

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
            try
            {
                // DB ����
                ConnMariaDB();
                // DB �κ��� ���̺귯�� ���� ��������
                GetLibraries();
                // DB �κ��� ���� ���� ��������
                GetFiles();
                // ���ϻ��� �����Ͽ� �߰��ϱ�
                GetNewFiles();
                // �׸��� ����
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
            dt_lib = select(sqlSelectlib);
        }
        private void GetFiles()
        {
            dt_file = select(sqlSelectFile);
            StatusCount = dt_file.Rows.Count;
        }

        async void GetNewFiles()
        {
            this.progressBar1.Value = 0;

            // �� ��� ���
            DataTable dt_diff = new DataTable();
            dt_diff.InitDataTable();

            // ���� ���� ���
            DataTable dt_real = new DataTable();
            dt_real.InitDataTable();

            // �� ���� ����Ʈ
            List<string> list_real = new List<string>();

            // ���� �ð�
            string nowTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            // ���� ���� �� ��� ����
            foreach (DataRow dr in dt_lib.Rows)
            {
                string path = dr["path"].ToString();
                DirectoryInfo di = new DirectoryInfo(path);
                // 1. �ֻ��� �������� �˻��Ͽ� �߰�
                List<string> list_fileNames = Directory.GetFiles(path, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                list_real.AddRange(list_fileNames);

                // 2. ���� �������� �˻��Ͽ� �߰�
                List<string> dirNames = Directory.GetDirectories(path).ToList<string>();
                foreach (string dirName in dirNames)
                {
                    List<string> filenames_indir = Directory.GetFiles(dirName, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                    list_real.AddRange(filenames_indir);
                }
            }

            // ������ �� ���� ����� �˻��Ͽ� �߰�
            dt_diff.Columns.Add("result");
            foreach (string file in list_real)
            {
                ProgressBarPlus();
                int pathExists = dt_file.AsEnumerable().Where(r => r.Field<string>("fullpath").Equals(file)).Count();
                // �̹� �����ϴ� ��� ����
                if (pathExists == 1)
                    continue;
                else
                    INSERT_SINGLE(sqlInsertFile, file, nowTime, Path.GetFullPath(file));
            }
            // ����ȸ
            GetFiles();

        }
        async void SetDelFiles()
        {
            this.progressBar1.Value = 0;

            // �� ��� ���
            DataTable dt_diff = new DataTable();
            dt_diff.InitDataTable();

            // ���� ���� ���
            DataTable dt_real = new DataTable();
            dt_real.InitDataTable();

            // �� ���� ����Ʈ
            List<string> list_real = new List<string>();

            // ���� �ð�
            string nowTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            // DB���� ������� ������� ���� Ȯ���Ͽ� ����
            foreach (DataRow row in dt_file.Rows)
            {
                ProgressBarPlus();
                string fullpath = row["fullpath"].ToString();
                bool pathExists = File.Exists(fullpath);
                // �̹� �����ϴ� ��� ����
                if (pathExists)
                    continue;
                // �縮���Ÿ� DB���� ����
                string idx = row["idx"].ToString();
                QUERY($"DELETE FROM `baseball_mgr`.`files` WHERE  `idx`={idx}");
            }
            // ����ȸ
            GetFiles();
        }
        private void SetGrid()
        {
            this.dataGridView1.DataSource = dt_file;
        }
        private void CreateDbFilesFromXML()
        {
            dt_file.InitDataTable();
            doc.Load(Application.StartupPath + @"\files.xml");
            foreach (System.Xml.XmlElement x in doc.ChildNodes[1].ChildNodes)
            {
                DataRow dr = dt_file.NewRow();
                dr[0] = x.ChildNodes[0].ToNodeText();
                dr[1] = x.ChildNodes[1].ToNodeText();
                dr[2] = x.ChildNodes[2].ToNodeText();
                dr[3] = x.ChildNodes[3].ToNodeText();
                dr[4] = x.ChildNodes[4].ToNodeText();
                dr[5] = x.ChildNodes[5].ToNodeText();
                dr[6] = x.ChildNodes[6].ToNodeText();
                dt_file.Rows.Add(dr);
            }
        }
        // ������ ���� + ������Ʈ
        private void FileExe(string fullPath, int row)
        {
            fullPath = $@"{Path.GetFullPath(fullPath)}".Replace("\\", "/").Replace("/", "\\");
            dataGridView1.CurrentCell = null;
            ExeFile(fullPath);
            string now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            dataGridView1.Rows[row].Cells["lasttime"].Value = now;
            //Update DB
            string idx = dataGridView1.Rows[row].Cells["idx"].Value.ToString();
            QUERY($"UPDATE `baseball_mgr`.`files` SET `lasttime`='{now}' WHERE  `idx`={idx}");
        }
        // ������ �� + ������Ʈ
        private void FileEval(string colHeaderName, int row)
        {
            int star = Convert.ToInt16(colHeaderName);
            if (dataGridView1.Rows[row].Cells["eval"].Value.ToString().Length == star)
                return;
            string eval = string.Empty;
            for (int i = 0; i < star; i++)
            {
                eval += "��";
            }
            dataGridView1.Rows[row].Cells["eval"].Value = eval;
            //Update DB
            string idx = dataGridView1.Rows[row].Cells["idx"].Value.ToString();
            QUERY($"UPDATE `baseball_mgr`.`files` SET `eval`='{eval}' WHERE  `idx`={idx}");
        }
        // ������ �޸� + ������Ʈ
        private void FileMemo(string desc, string idx)
        {
            //Update DB
            if(desc.Trim().Length == 0)
                QUERY($"UPDATE `baseball_mgr`.`files` SET `desc`='' WHERE  `idx`={idx}");
            else
                QUERY($"UPDATE `baseball_mgr`.`files` SET `desc`='{desc}' WHERE  `idx`={idx}");
        }
        // ������ ��� ����
        private void FilePathOpen(int row)
        {
            var p = new Process();
            p.StartInfo = new ProcessStartInfo(@$"{Path.GetDirectoryName(dataGridView1.Rows[row].Cells["fullpath"].Value.ToString())}")
            {
                UseShellExecute = true
            };
            p.Start();
        }
        //�׸��� ��ȸ
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
        // lib ��ư
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
        // �ű� ���� ã�Ƽ� �߰��ϱ� ��ư
        private void button_refresh_Click(object sender, EventArgs e)
        {
            GetNewFiles();
            SetGrid();
        }
        // ����� ���� �����ϱ� ��ư
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
                //���ϻ���
                new System.IO.FileInfo(fullpath).Delete();
                int idx = dt_file.AsEnumerable().Where(x => x.Field<string>("fullpath") == fullpath).Select(r => r.Field<int>("idx")).First();
                QUERY($"DELETE FROM `baseball_mgr`.`files` WHERE  `idx`={idx}");

                //�׸��� ����
                dataGridView1.Rows.RemoveAt(del_list[row]);
            }
            StatusCount = this.dataGridView1.Rows.Count;
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
                    FileEval(colHeaderName, y);
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
            
            string idx = dataGridView1.Rows[y].Cells["idx"].Value.ToString();
            string colName = this.dataGridView1.Columns[x].Name;

            switch (colName)
            {
                case "desc":
                    FileMemo(dataGridView1.Rows[y].Cells["desc"].Value.ToString().ToStr(), idx);
                    break;
            }
            return;
        }
        private void checkBox1_CheckedChanged(object sender, EventArgs e)
        {
            if (checkBox1.Checked)
                this.button_del.Enabled = false;
            else
                this.button_del.Enabled = true;
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
        private void ConnMariaDB()
        {
            if (mySqlConnection == null)
                mySqlConnection = new MySqlConnection("Server=127.0.0.1;User ID=root;Password=root;Database=BASEBALL_MGR");
            if (mySqlConnection.State != ConnectionState.Open)
                mySqlConnection.Open();
        }
        //select ���� ���� -> DataTable ����
        public DataTable select(String sql)
        {
            var mySqlDataTable = new DataTable();
            try
            {
                MySqlCommand mySqlCommand = new MySqlCommand(sql, mySqlConnection);
                MySqlDataReader mySqlDataReader = mySqlCommand.ExecuteReader();
                mySqlDataTable.Load(mySqlDataReader);

                StringBuilder output = new StringBuilder();
                foreach (DataColumn col in mySqlDataTable.Columns)
                {
                    output.AppendFormat("{0} ", col);
                }
                output.AppendLine();
                foreach (DataRow page in mySqlDataTable.Rows)
                {
                    foreach (DataColumn col in mySqlDataTable.Columns)
                    {
                        output.AppendFormat("{0} ", page[col]);
                    }
                    output.AppendLine();

                }
                Console.WriteLine(output.ToString());

                mySqlDataReader.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
            return mySqlDataTable;
        }
        // ������ ���� : ���̺귯�� �ֱ�
        private async Task INSERT1()
        {
            using (var cmd = new MySqlCommand())
            {
                cmd.Connection = mySqlConnection;
                try
                {
                    foreach (DataRow dr in dt_lib.Rows)
                    {
                        cmd.CommandText = sqlInsertLib;
                        cmd.Parameters.Clear();
                        cmd.Parameters.AddWithValue("path", dr["path"].ToString());
                        cmd.ExecuteNonQuery();
                    }
                }
                catch (Exception ex) { MessageBox.Show(ex.Message); }
            }
        }
        // ������ ���� : ���ϵ� �ֱ�
        private async Task INSERT2(string sql)
        {
            using (var cmd = new MySqlCommand())
            {
                cmd.Connection = mySqlConnection;
                foreach (DataRow dr in dt_file.Rows)
                {
                    cmd.CommandText = sql;
                    cmd.Parameters.Clear();
                    cmd.Parameters.AddWithValue("filename", dr["filename"]);
                    cmd.Parameters.AddWithValue("lasttime", dr["lasttime"]);
                    cmd.Parameters.AddWithValue("addtime", dr["addtime"]);
                    cmd.Parameters.AddWithValue("eval", dr["eval"] == null ? "" : dr["eval"].ToString());
                    cmd.Parameters.AddWithValue("desc", dr["desc"] == null ? "" : dr["desc"].ToString());
                    cmd.Parameters.AddWithValue("fullpath", dr["fullpath"]);
                    try
                    {
                        cmd.ExecuteNonQuery();
                    }
                    catch { }
                }
            }
        }
        //�̱� ����
        private async Task QUERY(string sql)
        {
            using (var cmd = new MySqlCommand())
            {
                cmd.Connection = mySqlConnection;
                try
                {
                    cmd.CommandText = sql;
                    cmd.ExecuteNonQuery();
                }
                catch (Exception ex) { MessageBox.Show(ex.Message); }
            }
        }
        // ���� �Ѱ� �߰��ϱ�
        private async Task INSERT_SINGLE(string sql, string filename, string addtime, string fullpath)
        {
            using (var cmd = new MySqlCommand())
            {
                cmd.Connection = mySqlConnection;
                cmd.CommandText = sql;
                cmd.Parameters.Clear();
                cmd.Parameters.AddWithValue("filename", Path.GetFileName(filename));
                cmd.Parameters.AddWithValue("lasttime", "");
                cmd.Parameters.AddWithValue("addtime", addtime);
                cmd.Parameters.AddWithValue("eval", "");
                cmd.Parameters.AddWithValue("desc", "");
                cmd.Parameters.AddWithValue("fullpath", fullpath);
                try
                {
                    cmd.ExecuteNonQuery();
                }
                catch { }
            }
        }
        #endregion


    }
}
