using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Xml;

namespace BaseBall_Video_Manager
{
    public partial class MainForm : Form
    {
        DataTable dt_file = new DataTable();
        DataTable dt_lib = new DataTable();
        DataTable dt_clear = new DataTable();

        XmlDocument doc = new XmlDocument();
        string[] exts = new[] { ".avi" , ".mp4" , ".mov" , ".wmv" , ".avchd" , ".flv" , ".f4v" , ".swf", ".mkv", ".mpeg2", ".ts", ".tp" };
        
        public MainForm()
        {
            InitializeComponent();
            try
            {
                getLibrary();//라이브러리 항목 가져오기
                getFiles();//파일 정보 가져오기
                Refresh_Data();
                Total = this.dataGridView1.Rows.Count;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        int Total
        {
            set { this.toolStripStatusLabel_totalcount.Text = value.ToString(); }
        }
        string Status
        {
            set { this.label_status.Text = value; }
            get { return this.label_status.Text; }
        }
        string SearchTextBox
        {
            get { return this.textBox1.Text; }
        }
        private void SetField(DataTable dt)
        {
            dt.Columns[0].ColumnName = "filename";
            dt.Columns[1].ColumnName = "exe";
            dt.Columns[2].ColumnName = "lasttime";
            dt.Columns[3].ColumnName = "addtime";
            dt.Columns[4].ColumnName = "eval";
            dt.Columns[5].ColumnName = "desc";
            dt.Columns[6].ColumnName = "fullpath";
        }
        private void button_lib_Click(object sender, EventArgs e)
        {
            Library libform = new Library();
            libform.ShowDialog();
            if(libform.DialogResult == DialogResult.OK)
            {
                getLibrary();//라이브러리 항목 가져오기
                getFiles();//파일 정보 가져오기
                Refresh_Data();
                Total = this.dataGridView1.Rows.Count;
            }
        }

        private void getLibrary()
        {
            FileInfo fi = new FileInfo(Application.StartupPath + @"\library.xml");
            if (fi.Exists)
            {
                dt_lib = new DataTable("library");
                try
                {
                    dt_lib.ReadXmlSchema(Application.StartupPath + @"\library.xml");
                }
                catch { return; }
                dt_lib.ReadXml(Application.StartupPath + @"\library.xml");
                dt_lib.Columns[0].ColumnName = "path";
            }
        }

        private void getFiles()
        {
            if (dt_lib.Rows.Count == 0)
                return;
            Status = "파일정보 가져오는 중...";
            FileInfo fi = new FileInfo(Application.StartupPath + @"\files.xml");
            if (fi.Exists)
            {
                dt_file = new DataTable("files");
                try
                {
                    dt_file.ReadXmlSchema(Application.StartupPath + @"\files.xml");
                }
                catch (Exception ex)
                {
                    MessageBox.Show(ex.Message);
                    Status = ""; 
                    return; 
                }
                dt_file.ReadXml(Application.StartupPath + @"\files.xml");
                this.dataGridView1.DataSource = dt_file;
            }
            else
            {
                //라이브러리 정보는 있는데, files.xml 파일이 없는 경우 신규 생성
                if(dt_lib.Rows.Count > 0)
                {
                    createData();
                    getFiles();
                }
            }

            Status = "";
        }

        private void createData()
        {
            Status = "파일정보 신규 생성 중...";

            //1. datatable 필드 세팅
            dt_file = new DataTable("files");
            for(int col=0; col< dataGridView1.Columns.Count; col++)
            {
                dt_file.Columns.Add();
                dt_clear.Columns.Add();
            }
            SetField(dt_file);
            SetField(dt_clear);
            string now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            //2. datatable 채워넣기
            for (int i=0; i<dt_lib.Rows.Count; i++)
            {
                String FolderName = dt_lib.Rows[i][0].ToString();
                System.IO.DirectoryInfo di = new System.IO.DirectoryInfo(FolderName);
                //디렉토리 내의 모든 파일 리스트
                List<string> filenames = Directory.GetFiles(FolderName, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                if(filenames.Count>0)
                    Add_FileData(filenames, now);
                //디렉토리 내의 디렉토리 내의 파일 리스트도 추가
                List<string> dirnames = Directory.GetDirectories(FolderName).ToList<string>();
                foreach(string dirname in dirnames)
                {
                    List<string> filenames_indir = Directory.GetFiles(dirname, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                    if(filenames_indir.Count>0)
                        Add_FileData(filenames_indir, now);
                }
            }
            //3. xml파일 생성
            dt_file.WriteXml(Application.StartupPath + @"\files.xml", true);

            Status = "";
        }

        private void Add_FileData(List<string> filenames, string now)
        {
            for (int j = 0; j < filenames.Count; j++)
            {
                dt_file.Rows.Add();
                dt_file.Rows[dt_file.Rows.Count - 1]["filename"] = Path.GetFileName(filenames[j]);
                dt_file.Rows[dt_file.Rows.Count - 1]["exe"] = "▶";
                dt_file.Rows[dt_file.Rows.Count - 1]["lasttime"] = "";
                dt_file.Rows[dt_file.Rows.Count - 1]["addtime"] = now;
                dt_file.Rows[dt_file.Rows.Count - 1]["eval"] = "";
                dt_file.Rows[dt_file.Rows.Count - 1]["desc"] = "";
                dt_file.Rows[dt_file.Rows.Count - 1]["fullpath"] = Path.GetFullPath(filenames[j]);
            }
        }
        private void DupClear()
        {
            //중복데이터 제거 및 Datatable, XML 파일 업데이트
            int dt_count = dt_file.Rows.Count;
            DataTable dt = dt_file.AsEnumerable()
               .GroupBy(r => new { Col1 = r["fullpath"] })
               .Select(g => g.OrderBy(r => r["lasttime"]).Last()
               )
               .CopyToDataTable();
            if(dt_count > dt.Rows.Count)
            {
                dt.TableName = "files";
                dataGridView1.DataSource = dt;
                dt.WriteXml(Application.StartupPath + @"\files.xml", true);
                Total = this.dataGridView1.Rows.Count;
            }
        }

        private void Refresh_Data()
        {
            List<string> filenames = new List<string>();
            for (int i = 0; i < dt_lib.Rows.Count; i++)
            {
                String FolderName = dt_lib.Rows[i][0].ToString();
                System.IO.DirectoryInfo di = new System.IO.DirectoryInfo(FolderName);
                //디렉토리 내의 모든 파일 리스트
                List<string> filenames_ = Directory.GetFiles(FolderName, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                //디렉토리 내의 디렉토리 내의 파일 리스트도 추가
                List<string> dirnames = Directory.GetDirectories(FolderName).ToList<string>();
                foreach (string dirname in dirnames)
                {
                    List<string> filenames_indir = Directory.GetFiles(dirname, "*.*", SearchOption.TopDirectoryOnly).Where(s => exts.Contains(Path.GetExtension(s), StringComparer.OrdinalIgnoreCase)).ToList<string>();
                    foreach (string filename in filenames_indir)
                    {
                        filenames_.Add(filename);
                    }
                }
                foreach (string f in filenames_)
                    filenames.Add(f);
            }
            string fullpath = "";
            //그리드 (dt_file) 에는 존재하지만, filename에는 없는 것은 삭제한다.
            for (int row = dataGridView1.Rows.Count - 1; row > -1 ; row--)
            {
                fullpath = dataGridView1.Rows[row].Cells["fullpath"].Value.ToString();
                if (filenames.AsEnumerable().Where(x => x == fullpath).Count() == 0)
                {
                    dataGridView1.Rows.RemoveAt(row);
                    //Update XML
                    doc.Load(Application.StartupPath + @"\files.xml");
                    XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                    if (node != null)
                        node.ParentNode.RemoveAll();
                    doc.Save(Application.StartupPath + @"\files.xml");
                }
            }

            //추가 된것이 존재하면 갱신
            int cur_count = filenames.Count;
            int old_count = dataGridView1.Rows.Count;
            if (cur_count > old_count)
            {
                int add_count = 0;
                string now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                for (int j = 0; j< cur_count; j++)
                {
                    //신규 파일을 발견한 경우 Datable에 추가
                    if (dt_file.AsEnumerable()
                        .Where(x=>  x.Field<string>("fullpath") == Path.GetFullPath(filenames[j]))
                        .Count() == 0)
                    {
                        dt_file.Rows.Add();
                        dt_file.Rows[dt_file.Rows.Count - 1]["filename"] = Path.GetFileName(filenames[j]);
                        dt_file.Rows[dt_file.Rows.Count - 1]["exe"] = "▶";
                        dt_file.Rows[dt_file.Rows.Count - 1]["lasttime"] = "";
                        dt_file.Rows[dt_file.Rows.Count - 1]["addtime"] = now;
                        dt_file.Rows[dt_file.Rows.Count - 1]["eval"] = "";
                        dt_file.Rows[dt_file.Rows.Count - 1]["desc"] = "";
                        dt_file.Rows[dt_file.Rows.Count - 1]["fullpath"] = Path.GetFullPath(filenames[j]);
                        add_count++;
                        if (cur_count - old_count == add_count)
                            break;
                    }
                }
                if(add_count > 0)
                {
                    dt_file.WriteXml(Application.StartupPath + @"\files.xml", true);
                    this.dataGridView1.DataSource = dt_file;
                    Total = this.dataGridView1.Rows.Count;
                }
            }
            if(dataGridView1.Rows.Count > 0)
            {
                //기본 소트는 추가된 시각 DESC
                this.dataGridView1.Sort(this.dataGridView1.Columns["addtime"], ListSortDirection.Descending);
                //첫줄로 스크롤 이동
                dataGridView1.FirstDisplayedScrollingRowIndex = 0;
            }
        }

        private void button_refresh_Click(object sender, EventArgs e)
        {
            Refresh_Data();
            DupClear();
        }

        private void button2_Click(object sender, EventArgs e)
        {
            DupClear();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            List<int> del_list = new List<int>();
            for(int row = 0; row< this.dataGridView1.Rows.Count; row++)
            {
                if(dataGridView1.Rows[row].Selected)
                {
                    del_list.Add(row);
                }
            }
            for(int row = del_list.Count-1; row>=0; row--)
            {
                string fullpath = dataGridView1.Rows[del_list[row]].Cells["fullpath"].Value.ToString();
                //파일삭제
                new System.IO.FileInfo(fullpath).Delete();
                //Update XML
                doc.Load(Application.StartupPath + @"\files.xml");
                XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                if (node != null)
                    node.ParentNode.RemoveAll();
                doc.Save(Application.StartupPath + @"\files.xml");
                //그리드 삭제
                dataGridView1.Rows.RemoveAt(del_list[row]);

            }
            Total = this.dataGridView1.Rows.Count;
        }

        private void ExcuteFile(int ColumnIndex, int RowIndex)
        {
            int index_exe = dataGridView1.Columns["exe"].Index;
            if (ColumnIndex == index_exe && RowIndex > -1)
            {
                dataGridView1.MultiSelect = false;
                dataGridView1.CurrentCell = null;

                string fullpath = dataGridView1.Rows[RowIndex].Cells["fullpath"].Value.ToString();

                dataGridView1.CurrentCell = null;
                System.Diagnostics.Process.Start(fullpath);

                string now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                //Update 그리드
                dataGridView1.Rows[RowIndex].Cells["lasttime"].Value = now;
                //Update XML
                doc.Load(Application.StartupPath + @"\files.xml");
                XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                if (node != null)
                    node.ParentNode.ChildNodes[2].InnerText = now.ToString();
                doc.Save(Application.StartupPath + @"\files.xml");
            }
            dataGridView1.MultiSelect = true;
        }
        private void dataGridView1_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            if(e.ColumnIndex != -1 && e.RowIndex != -1)
            {
                ExcuteFile(e.ColumnIndex, e.RowIndex);
                dataGridView1.CurrentCell = dataGridView1.Rows[e.RowIndex].Cells[0];
            }
        }
        private void dataGridView1_CellDoubleClick(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex != -1 && e.RowIndex != -1)
            {
                ExcuteFile(1, e.RowIndex);
                dataGridView1.CurrentCell = dataGridView1.Rows[e.RowIndex].Cells[0];
            }
        }

        private void dataGridView1_CellFormatting(object sender, DataGridViewCellFormattingEventArgs e)
        {
            if (e.ColumnIndex == dataGridView1.Columns["eval"].Index
              && e.Value != null )
            {
                if(e.Value.ToString().Length > 0)
                {
                    bool flag = false;
                    switch (e.Value.ToString().Trim())
                    {
                        case "0":
                            e.Value = "";
                            flag = true;
                            break;
                        case "1":
                            e.Value = "★";
                            flag = true;
                            break;
                        case "2":
                            e.Value = "★★";
                            flag = true;
                            break;
                        case "3":
                            e.Value = "★★★";
                            flag = true;
                            break;
                        case "4":
                            e.Value = "★★★★";
                            flag = true;
                            break;
                        case "5":
                            e.Value = "★★★★★";
                            flag = true;
                            break;
                    }
                    if (flag)
                    {
                        string fullpath = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString();
                        //Update XML
                        doc.Load(Application.StartupPath + @"\files.xml");
                        XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                        if (node != null)
                            node.ParentNode.ChildNodes[4].InnerText = e.Value.ToString();
                        doc.Save(Application.StartupPath + @"\files.xml");
                    }
                }
            }
        }

        private void dataGridView1_CellEndEdit(object sender, DataGridViewCellEventArgs e)
        {
            if (e.ColumnIndex == dataGridView1.Columns["desc"].Index )
            {
                string fullpath = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString();
                //Update XML
                doc.Load(Application.StartupPath + @"\files.xml");
                XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                if (node != null)
                    node.ParentNode.ChildNodes[5].InnerText = dataGridView1.Rows[e.RowIndex].Cells["desc"].Value.ToString();
                doc.Save(Application.StartupPath + @"\files.xml");
            }
            if (e.ColumnIndex == dataGridView1.Columns["eval"].Index)
            {
                string j = dataGridView1.Rows[e.RowIndex].Cells["desc"].Value.ToString();
                //if(dataGridView1.Rows[e.RowIndex].Cells["desc"].Value.ToString().Substring(0, 1) != )
            }
        }

        private void checkBox1_CheckedChanged(object sender, EventArgs e)
        {
            if (checkBox1.Checked)
                this.button_del.Enabled = false;
            else
                this.button_del.Enabled = true;
        }

        // 파일 실행 이벤트
        private void dataGridView1_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            // 파일 실행
            if(dataGridView1.Columns[e.ColumnIndex].Name == "exe")
            {
                dataGridView1.BeginEdit(false);
            }
            // 점수
            else if ((dataGridView1.Columns[e.ColumnIndex].Name).ToLower().Contains("score") )
            {
                string val = dataGridView1.Columns[e.ColumnIndex].Name;
                val = val.Substring(val.Length - 1, 1);
                bool flag = false;
                switch (val)
                {
                    case "0":
                        val = "";
                        flag = true;
                        break;
                    case "1":
                        val = "★";
                        flag = true;
                        break;
                    case "2":
                        val = "★★";
                        flag = true;
                        break;
                    case "3":
                        val = "★★★";
                        flag = true;
                        break;
                    case "4":
                        val = "★★★★";
                        flag = true;
                        break;
                    case "5":
                        val = "★★★★★";
                        flag = true;
                        break;
                }
                if (flag)
                {
                    string fullpath = dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString();
                    //Update XML
                    doc.Load(Application.StartupPath + @"\files.xml");
                    XmlNode node = doc.SelectSingleNode(string.Format("/descendant::DocumentElement/files/fullpath[.='{0}']", fullpath));
                    if (node != null)
                        node.ParentNode.ChildNodes[4].InnerText = val.ToString();
                    doc.Save(Application.StartupPath + @"\files.xml");
                    dataGridView1.Rows[e.RowIndex].Cells["eval"].Value = val.ToString();
                }
            }
            // 경로 오픈
            else if (dataGridView1.Columns[e.ColumnIndex].Name == "OpenPath")
            {
                System.Diagnostics.Process.Start(Path.GetDirectoryName(dataGridView1.Rows[e.RowIndex].Cells["fullpath"].Value.ToString()));
            }
        }
        
        /*
        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            dataGridView1.CurrentCell = null;
            foreach (System.Windows.Forms.DataGridViewRow r in dataGridView1.Rows)
            {
                if ((r.Cells[0].Value).ToString().ToUpper().Contains(textBox1.Text.ToUpper()))
                {
                    r.Visible = true;
                    //dataGridView1.Rows[r.Index].Visible = true;
                }
                else
                {
                     r.Visible = false;
                    //dataGridView1.Rows[r.Index].Visible = false;
                }
            }
        }
        */
        private void textBox1_KeyDown(object sender, KeyEventArgs e)
        {
            if(e.KeyCode == Keys.Enter)
            {
                Search();
            }
        }

        //검색
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
                    Total = this.dataGridView1.Rows.Count;
                }
                catch
                {
                    dataGridView1.Visible = false;
                }
            }
            else
            {
                dataGridView1.DataSource = dt_file;
                Total = dt_file.Rows.Count;
            }
        }

        private void dataGridView1_KeyDown(object sender, KeyEventArgs e)
        {
            int col = dataGridView1.CurrentCellAddress.X;
            int row = dataGridView1.CurrentCellAddress.Y;

            if(col > -1 && col < 5 && row > -1)
            {
                if(e.KeyCode == Keys.D0
                    || e.KeyCode == Keys.Delete)
                {
                    dataGridView1[4, row].Value = string.Empty;
                }
                else if (e.KeyCode == Keys.D1
                    || e.KeyCode == Keys.D2
                    || e.KeyCode == Keys.D3
                    || e.KeyCode == Keys.D4
                    || e.KeyCode == Keys.D5)
                {
                    dataGridView1[4, row].Value = e.KeyData;
                }
            }
        }
    }
}
