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

namespace BaseBall_Video_Manager
{
    public partial class Library : Form
    {
        DataTable dt_lib = new DataTable();
        public Library()
        {
            InitializeComponent();
            //라이브러리 데이터 가져오기
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
                SetField(dt_lib);
                for (int row = 0; row < dt_lib.Rows.Count; row++)
                    this.dataGridView1.Rows.Add(new object[] {
                         dt_lib.Rows[row][0].ToString()
                    });
                this.dataGridView1.CurrentCell = null;
            }
        }
        private void SetField(DataTable dt)
        {
            dt.Columns[0].ColumnName = "path";
        }
        private void button_add_Click(object sender, EventArgs e)
        {
            //추가
            FolderBrowserDialog dialog = new FolderBrowserDialog();
            dialog.SelectedPath = @"C:\";
            dialog.ShowDialog();
            string selected = dialog.SelectedPath;
            //이미 존재하면 추가안됨
            for(int row = 0; row< dataGridView1.Rows.Count; row++)
            {
                if (dataGridView1[0, row].Value.ToString() == selected)
                    return;
            }
            this.dataGridView1.Rows.Add(new object[] {
                         dialog.SelectedPath
                    });
        }
        private void button_del_Click(object sender, EventArgs e)
        {
            //삭제
            List<int> del_row = new List<int>();
            for (int row = 0; row < this.dataGridView1.Rows.Count; row++)
            {
                if (this.dataGridView1.Rows[row].Selected)
                {
                    del_row.Add(row);
                }
            }
            for (int i = del_row.Count-1; i>=0; i--)
            {
                this.dataGridView1.Rows.RemoveAt(del_row[i]);
            }
        }
        private void button_save_exit_Click(object sender, EventArgs e)
        {
            //저장
            //1. 새로추가된 항목 저장
            //
            //2. 없어진 항목 저장
            //
            //3. 데이터테이블에 저장
            //3-1. 데이터테이블 생성
            DataTable dt_ = new DataTable("library");
            dt_.Columns.Add("path");
            for (int row = 0; row<this.dataGridView1.Rows.Count; row++)
            {
                dt_.Rows.Add();
                dt_.Rows[row][0] = dataGridView1.Rows[row].Cells[0].Value;
            }
            //3-2. Xml생성
            dt_.WriteXml(Application.StartupPath + @"\library.xml", true);
            this.DialogResult = DialogResult.OK;
            this.Close();
        }
    }
}
