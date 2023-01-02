namespace BaseBall_Video_Manager
{
    partial class MainForm
    {
        /// <summary>
        /// 필수 디자이너 변수입니다.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// 사용 중인 모든 리소스를 정리합니다.
        /// </summary>
        /// <param name="disposing">관리되는 리소스를 삭제해야 하면 true이고, 그렇지 않으면 false입니다.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form 디자이너에서 생성한 코드

        /// <summary>
        /// 디자이너 지원에 필요한 메서드입니다. 
        /// 이 메서드의 내용을 코드 편집기로 수정하지 마세요.
        /// </summary>
        private void InitializeComponent()
        {
            System.Windows.Forms.DataGridViewCellStyle dataGridViewCellStyle1 = new System.Windows.Forms.DataGridViewCellStyle();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(MainForm));
            this.tableLayoutPanel1 = new System.Windows.Forms.TableLayoutPanel();
            this.dataGridView1 = new System.Windows.Forms.DataGridView();
            this.panel1 = new System.Windows.Forms.Panel();
            this.textBox1 = new System.Windows.Forms.TextBox();
            this.checkBox1 = new System.Windows.Forms.CheckBox();
            this.button_refresh = new System.Windows.Forms.Button();
            this.button_del = new System.Windows.Forms.Button();
            this.label_status = new System.Windows.Forms.Label();
            this.button_lib = new System.Windows.Forms.Button();
            this.label1 = new System.Windows.Forms.Label();
            this.statusStrip1 = new System.Windows.Forms.StatusStrip();
            this.toolStripStatusLabel1 = new System.Windows.Forms.ToolStripStatusLabel();
            this.toolStripStatusLabel_totalcount = new System.Windows.Forms.ToolStripStatusLabel();
            this.filename = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.exe = new System.Windows.Forms.DataGridViewButtonColumn();
            this.lasttime = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.addtime = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.eval = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.Score1 = new System.Windows.Forms.DataGridViewButtonColumn();
            this.Score2 = new System.Windows.Forms.DataGridViewButtonColumn();
            this.Score3 = new System.Windows.Forms.DataGridViewButtonColumn();
            this.Score4 = new System.Windows.Forms.DataGridViewButtonColumn();
            this.Score5 = new System.Windows.Forms.DataGridViewButtonColumn();
            this.desc = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.OpenPath = new System.Windows.Forms.DataGridViewButtonColumn();
            this.fullpath = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.tableLayoutPanel1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.panel1.SuspendLayout();
            this.statusStrip1.SuspendLayout();
            this.SuspendLayout();
            // 
            // tableLayoutPanel1
            // 
            this.tableLayoutPanel1.ColumnCount = 2;
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Absolute, 144F));
            this.tableLayoutPanel1.Controls.Add(this.dataGridView1, 0, 1);
            this.tableLayoutPanel1.Controls.Add(this.panel1, 0, 0);
            this.tableLayoutPanel1.Controls.Add(this.label1, 1, 0);
            this.tableLayoutPanel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.tableLayoutPanel1.Location = new System.Drawing.Point(0, 0);
            this.tableLayoutPanel1.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.tableLayoutPanel1.Name = "tableLayoutPanel1";
            this.tableLayoutPanel1.RowCount = 3;
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 41F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 26F));
            this.tableLayoutPanel1.Size = new System.Drawing.Size(889, 766);
            this.tableLayoutPanel1.TabIndex = 0;
            // 
            // dataGridView1
            // 
            this.dataGridView1.AllowUserToAddRows = false;
            this.dataGridView1.AllowUserToDeleteRows = false;
            this.dataGridView1.AllowUserToResizeRows = false;
            dataGridViewCellStyle1.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleCenter;
            dataGridViewCellStyle1.BackColor = System.Drawing.SystemColors.Control;
            dataGridViewCellStyle1.Font = new System.Drawing.Font("맑은 고딕", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            dataGridViewCellStyle1.ForeColor = System.Drawing.SystemColors.WindowText;
            dataGridViewCellStyle1.SelectionBackColor = System.Drawing.SystemColors.Highlight;
            dataGridViewCellStyle1.SelectionForeColor = System.Drawing.SystemColors.HighlightText;
            dataGridViewCellStyle1.WrapMode = System.Windows.Forms.DataGridViewTriState.True;
            this.dataGridView1.ColumnHeadersDefaultCellStyle = dataGridViewCellStyle1;
            this.dataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridView1.Columns.AddRange(new System.Windows.Forms.DataGridViewColumn[] {
            this.filename,
            this.exe,
            this.lasttime,
            this.addtime,
            this.eval,
            this.Score1,
            this.Score2,
            this.Score3,
            this.Score4,
            this.Score5,
            this.desc,
            this.OpenPath,
            this.fullpath});
            this.tableLayoutPanel1.SetColumnSpan(this.dataGridView1, 2);
            this.dataGridView1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.dataGridView1.Location = new System.Drawing.Point(3, 45);
            this.dataGridView1.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.dataGridView1.Name = "dataGridView1";
            this.dataGridView1.RowHeadersVisible = false;
            this.dataGridView1.RowHeadersWidth = 62;
            this.dataGridView1.RowTemplate.Height = 23;
            this.dataGridView1.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridView1.Size = new System.Drawing.Size(883, 691);
            this.dataGridView1.TabIndex = 1;
            this.dataGridView1.CellClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellClick);
            this.dataGridView1.CellContentClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellContentClick);
            this.dataGridView1.CellDoubleClick += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellDoubleClick);
            this.dataGridView1.CellEndEdit += new System.Windows.Forms.DataGridViewCellEventHandler(this.dataGridView1_CellEndEdit);
            this.dataGridView1.CellFormatting += new System.Windows.Forms.DataGridViewCellFormattingEventHandler(this.dataGridView1_CellFormatting);
            this.dataGridView1.KeyDown += new System.Windows.Forms.KeyEventHandler(this.dataGridView1_KeyDown);
            // 
            // panel1
            // 
            this.panel1.Controls.Add(this.textBox1);
            this.panel1.Controls.Add(this.checkBox1);
            this.panel1.Controls.Add(this.button_refresh);
            this.panel1.Controls.Add(this.button_del);
            this.panel1.Controls.Add(this.label_status);
            this.panel1.Controls.Add(this.button_lib);
            this.panel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel1.Location = new System.Drawing.Point(3, 4);
            this.panel1.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.panel1.Name = "panel1";
            this.panel1.Size = new System.Drawing.Size(739, 33);
            this.panel1.TabIndex = 3;
            // 
            // textBox1
            // 
            this.textBox1.Location = new System.Drawing.Point(3, 4);
            this.textBox1.Name = "textBox1";
            this.textBox1.Size = new System.Drawing.Size(156, 31);
            this.textBox1.TabIndex = 9;
            this.textBox1.KeyDown += new System.Windows.Forms.KeyEventHandler(this.textBox1_KeyDown);
            // 
            // checkBox1
            // 
            this.checkBox1.AutoSize = true;
            this.checkBox1.Checked = true;
            this.checkBox1.CheckState = System.Windows.Forms.CheckState.Checked;
            this.checkBox1.Location = new System.Drawing.Point(455, 8);
            this.checkBox1.Name = "checkBox1";
            this.checkBox1.Size = new System.Drawing.Size(110, 29);
            this.checkBox1.TabIndex = 8;
            this.checkBox1.Text = "삭제잠금";
            this.checkBox1.UseVisualStyleBackColor = true;
            this.checkBox1.CheckedChanged += new System.EventHandler(this.checkBox1_CheckedChanged);
            // 
            // button_refresh
            // 
            this.button_refresh.Location = new System.Drawing.Point(273, 2);
            this.button_refresh.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.button_refresh.Name = "button_refresh";
            this.button_refresh.Size = new System.Drawing.Size(105, 29);
            this.button_refresh.TabIndex = 7;
            this.button_refresh.Text = "리프레시";
            this.button_refresh.UseVisualStyleBackColor = true;
            this.button_refresh.Click += new System.EventHandler(this.button_refresh_Click);
            // 
            // button_del
            // 
            this.button_del.Enabled = false;
            this.button_del.Location = new System.Drawing.Point(535, 2);
            this.button_del.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.button_del.Name = "button_del";
            this.button_del.Size = new System.Drawing.Size(112, 29);
            this.button_del.TabIndex = 3;
            this.button_del.Text = "선택한 파일 삭제";
            this.button_del.UseVisualStyleBackColor = true;
            this.button_del.Click += new System.EventHandler(this.button1_Click);
            // 
            // label_status
            // 
            this.label_status.AutoSize = true;
            this.label_status.Font = new System.Drawing.Font("맑은 고딕", 12F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.label_status.Location = new System.Drawing.Point(565, 10);
            this.label_status.Name = "label_status";
            this.label_status.Size = new System.Drawing.Size(110, 32);
            this.label_status.TabIndex = 6;
            this.label_status.Text = "            ";
            // 
            // button_lib
            // 
            this.button_lib.Location = new System.Drawing.Point(166, 2);
            this.button_lib.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.button_lib.Name = "button_lib";
            this.button_lib.Size = new System.Drawing.Size(101, 29);
            this.button_lib.TabIndex = 0;
            this.button_lib.Text = "라이브러리";
            this.button_lib.UseVisualStyleBackColor = true;
            this.button_lib.Click += new System.EventHandler(this.button_lib_Click);
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Dock = System.Windows.Forms.DockStyle.Right;
            this.label1.Location = new System.Drawing.Point(754, 0);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(132, 41);
            this.label1.TabIndex = 2;
            this.label1.Text = "문의 : fmsj@naver.com";
            this.label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // statusStrip1
            // 
            this.statusStrip1.ImageScalingSize = new System.Drawing.Size(20, 20);
            this.statusStrip1.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.toolStripStatusLabel1,
            this.toolStripStatusLabel_totalcount});
            this.statusStrip1.Location = new System.Drawing.Point(0, 734);
            this.statusStrip1.Name = "statusStrip1";
            this.statusStrip1.Size = new System.Drawing.Size(889, 32);
            this.statusStrip1.TabIndex = 1;
            this.statusStrip1.Text = "statusStrip1";
            // 
            // toolStripStatusLabel1
            // 
            this.toolStripStatusLabel1.Name = "toolStripStatusLabel1";
            this.toolStripStatusLabel1.Size = new System.Drawing.Size(56, 25);
            this.toolStripStatusLabel1.Text = "Total:";
            // 
            // toolStripStatusLabel_totalcount
            // 
            this.toolStripStatusLabel_totalcount.Name = "toolStripStatusLabel_totalcount";
            this.toolStripStatusLabel_totalcount.Size = new System.Drawing.Size(22, 25);
            this.toolStripStatusLabel_totalcount.Text = "0";
            // 
            // filename
            // 
            this.filename.DataPropertyName = "filename";
            this.filename.HeaderText = "파일명";
            this.filename.MinimumWidth = 250;
            this.filename.Name = "filename";
            this.filename.ReadOnly = true;
            this.filename.Width = 250;
            // 
            // exe
            // 
            this.exe.DataPropertyName = "exe";
            this.exe.HeaderText = "재생";
            this.exe.MinimumWidth = 8;
            this.exe.Name = "exe";
            this.exe.ReadOnly = true;
            this.exe.Width = 37;
            // 
            // lasttime
            // 
            this.lasttime.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.AllCells;
            this.lasttime.DataPropertyName = "lasttime";
            this.lasttime.HeaderText = "마지막 실행";
            this.lasttime.MinimumWidth = 120;
            this.lasttime.Name = "lasttime";
            this.lasttime.ReadOnly = true;
            this.lasttime.Width = 120;
            // 
            // addtime
            // 
            this.addtime.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.AllCells;
            this.addtime.DataPropertyName = "addtime";
            this.addtime.HeaderText = "추가된 시각";
            this.addtime.MinimumWidth = 120;
            this.addtime.Name = "addtime";
            this.addtime.ReadOnly = true;
            this.addtime.Width = 120;
            // 
            // eval
            // 
            this.eval.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.AllCells;
            this.eval.DataPropertyName = "eval";
            this.eval.HeaderText = "평가 (1~5)";
            this.eval.MaxInputLength = 5;
            this.eval.MinimumWidth = 8;
            this.eval.Name = "eval";
            this.eval.Width = 123;
            // 
            // Score1
            // 
            this.Score1.DataPropertyName = "Score1";
            this.Score1.FillWeight = 10F;
            this.Score1.HeaderText = "1";
            this.Score1.MinimumWidth = 8;
            this.Score1.Name = "Score1";
            this.Score1.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.Score1.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.Score1.Width = 20;
            // 
            // Score2
            // 
            this.Score2.DataPropertyName = "Score2";
            this.Score2.FillWeight = 10F;
            this.Score2.HeaderText = "2";
            this.Score2.MinimumWidth = 8;
            this.Score2.Name = "Score2";
            this.Score2.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.Score2.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.Score2.Width = 20;
            // 
            // Score3
            // 
            this.Score3.DataPropertyName = "Score3";
            this.Score3.FillWeight = 10F;
            this.Score3.HeaderText = "3";
            this.Score3.MinimumWidth = 8;
            this.Score3.Name = "Score3";
            this.Score3.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.Score3.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.Score3.Width = 20;
            // 
            // Score4
            // 
            this.Score4.DataPropertyName = "Score4";
            this.Score4.FillWeight = 10F;
            this.Score4.HeaderText = "4";
            this.Score4.MinimumWidth = 8;
            this.Score4.Name = "Score4";
            this.Score4.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.Score4.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.Score4.Width = 20;
            // 
            // Score5
            // 
            this.Score5.DataPropertyName = "Score5";
            this.Score5.FillWeight = 10F;
            this.Score5.HeaderText = "5";
            this.Score5.MinimumWidth = 8;
            this.Score5.Name = "Score5";
            this.Score5.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.Score5.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.Score5.Width = 20;
            // 
            // desc
            // 
            this.desc.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.desc.DataPropertyName = "desc";
            this.desc.HeaderText = "메모";
            this.desc.MinimumWidth = 8;
            this.desc.Name = "desc";
            // 
            // OpenPath
            // 
            this.OpenPath.DataPropertyName = "OpenPath";
            this.OpenPath.HeaderText = "Path";
            this.OpenPath.MinimumWidth = 8;
            this.OpenPath.Name = "OpenPath";
            this.OpenPath.Resizable = System.Windows.Forms.DataGridViewTriState.True;
            this.OpenPath.SortMode = System.Windows.Forms.DataGridViewColumnSortMode.Automatic;
            this.OpenPath.Width = 40;
            // 
            // fullpath
            // 
            this.fullpath.DataPropertyName = "fullpath";
            this.fullpath.HeaderText = "fullpath";
            this.fullpath.MinimumWidth = 8;
            this.fullpath.Name = "fullpath";
            this.fullpath.ReadOnly = true;
            this.fullpath.Visible = false;
            this.fullpath.Width = 73;
            // 
            // MainForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(10F, 25F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(889, 766);
            this.Controls.Add(this.statusStrip1);
            this.Controls.Add(this.tableLayoutPanel1);
            this.Font = new System.Drawing.Font("맑은 고딕", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(129)));
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Margin = new System.Windows.Forms.Padding(3, 4, 3, 4);
            this.Name = "MainForm";
            this.Text = "Baseball Video Manager V.3";
            this.tableLayoutPanel1.ResumeLayout(false);
            this.tableLayoutPanel1.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.panel1.ResumeLayout(false);
            this.panel1.PerformLayout();
            this.statusStrip1.ResumeLayout(false);
            this.statusStrip1.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.TableLayoutPanel tableLayoutPanel1;
        private System.Windows.Forms.Button button_lib;
        private System.Windows.Forms.DataGridView dataGridView1;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Panel panel1;
        private System.Windows.Forms.Button button_del;
        private System.Windows.Forms.Label label_status;
        private System.Windows.Forms.Button button_refresh;
        private System.Windows.Forms.StatusStrip statusStrip1;
        private System.Windows.Forms.ToolStripStatusLabel toolStripStatusLabel1;
        private System.Windows.Forms.ToolStripStatusLabel toolStripStatusLabel_totalcount;
        private System.Windows.Forms.CheckBox checkBox1;
        private System.Windows.Forms.TextBox textBox1;
        private System.Windows.Forms.DataGridViewTextBoxColumn filename;
        private System.Windows.Forms.DataGridViewButtonColumn exe;
        private System.Windows.Forms.DataGridViewTextBoxColumn lasttime;
        private System.Windows.Forms.DataGridViewTextBoxColumn addtime;
        private System.Windows.Forms.DataGridViewTextBoxColumn eval;
        private System.Windows.Forms.DataGridViewButtonColumn Score1;
        private System.Windows.Forms.DataGridViewButtonColumn Score2;
        private System.Windows.Forms.DataGridViewButtonColumn Score3;
        private System.Windows.Forms.DataGridViewButtonColumn Score4;
        private System.Windows.Forms.DataGridViewButtonColumn Score5;
        private System.Windows.Forms.DataGridViewTextBoxColumn desc;
        private System.Windows.Forms.DataGridViewButtonColumn OpenPath;
        private System.Windows.Forms.DataGridViewTextBoxColumn fullpath;
    }
}

