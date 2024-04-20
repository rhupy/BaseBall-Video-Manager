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
            DataGridViewCellStyle dataGridViewCellStyle1 = new DataGridViewCellStyle();
            DataGridViewCellStyle dataGridViewCellStyle2 = new DataGridViewCellStyle();
            DataGridViewCellStyle dataGridViewCellStyle3 = new DataGridViewCellStyle();
            tableLayoutPanel1 = new TableLayoutPanel();
            tableLayoutPanel2 = new TableLayoutPanel();
            textBox1 = new TextBox();
            button_lib = new Button();
            button_del = new Button();
            checkBox1 = new CheckBox();
            button2 = new Button();
            button3 = new Button();
            progressBar1 = new ProgressBar();
            tableLayoutPanel3 = new TableLayoutPanel();
            button1 = new Button();
            button_refresh = new Button();
            button4 = new Button();
            dataGridView1 = new DataGridView();
            idx = new DataGridViewTextBoxColumn();
            filename = new DataGridViewTextBoxColumn();
            exe = new DataGridViewButtonColumn();
            lasttime = new DataGridViewTextBoxColumn();
            addtime = new DataGridViewTextBoxColumn();
            eval = new DataGridViewTextBoxColumn();
            score0 = new DataGridViewButtonColumn();
            score1 = new DataGridViewButtonColumn();
            score2 = new DataGridViewButtonColumn();
            score3 = new DataGridViewButtonColumn();
            score4 = new DataGridViewButtonColumn();
            score5 = new DataGridViewButtonColumn();
            desc = new DataGridViewTextBoxColumn();
            openpath = new DataGridViewButtonColumn();
            fullpath = new DataGridViewTextBoxColumn();
            label_status = new StatusStrip();
            toolStripStatusLabel1 = new ToolStripStatusLabel();
            toolStripStatusLabel_totalcount = new ToolStripStatusLabel();
            tableLayoutPanel1.SuspendLayout();
            tableLayoutPanel2.SuspendLayout();
            tableLayoutPanel3.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)dataGridView1).BeginInit();
            label_status.SuspendLayout();
            SuspendLayout();
            // 
            // tableLayoutPanel1
            // 
            tableLayoutPanel1.ColumnCount = 1;
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 29F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 29F));
            tableLayoutPanel1.Controls.Add(tableLayoutPanel2, 0, 0);
            tableLayoutPanel1.Controls.Add(dataGridView1, 0, 1);
            tableLayoutPanel1.Dock = DockStyle.Fill;
            tableLayoutPanel1.Location = new Point(0, 0);
            tableLayoutPanel1.Margin = new Padding(4, 7, 4, 7);
            tableLayoutPanel1.Name = "tableLayoutPanel1";
            tableLayoutPanel1.RowCount = 3;
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Absolute, 63F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Absolute, 43F));
            tableLayoutPanel1.Size = new Size(1549, 1422);
            tableLayoutPanel1.TabIndex = 0;
            // 
            // tableLayoutPanel2
            // 
            tableLayoutPanel2.ColumnCount = 9;
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 286F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 300F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 0F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 0F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 139F));
            tableLayoutPanel2.Controls.Add(textBox1, 0, 0);
            tableLayoutPanel2.Controls.Add(button_lib, 1, 0);
            tableLayoutPanel2.Controls.Add(button_del, 4, 0);
            tableLayoutPanel2.Controls.Add(checkBox1, 3, 0);
            tableLayoutPanel2.Controls.Add(button2, 7, 0);
            tableLayoutPanel2.Controls.Add(button3, 6, 0);
            tableLayoutPanel2.Controls.Add(progressBar1, 5, 0);
            tableLayoutPanel2.Controls.Add(tableLayoutPanel3, 2, 0);
            tableLayoutPanel2.Controls.Add(button4, 8, 0);
            tableLayoutPanel2.Dock = DockStyle.Fill;
            tableLayoutPanel2.Location = new Point(4, 5);
            tableLayoutPanel2.Margin = new Padding(4, 5, 4, 5);
            tableLayoutPanel2.Name = "tableLayoutPanel2";
            tableLayoutPanel2.RowCount = 1;
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel2.Size = new Size(1541, 53);
            tableLayoutPanel2.TabIndex = 4;
            // 
            // textBox1
            // 
            textBox1.Dock = DockStyle.Fill;
            textBox1.Location = new Point(4, 12);
            textBox1.Margin = new Padding(4, 12, 4, 5);
            textBox1.Name = "textBox1";
            textBox1.Size = new Size(278, 31);
            textBox1.TabIndex = 9;
            textBox1.KeyDown += textBox1_KeyDown;
            // 
            // button_lib
            // 
            button_lib.Dock = DockStyle.Fill;
            button_lib.Location = new Point(290, 7);
            button_lib.Margin = new Padding(4, 7, 4, 7);
            button_lib.Name = "button_lib";
            button_lib.Size = new Size(112, 39);
            button_lib.TabIndex = 0;
            button_lib.Text = "라이브러리";
            button_lib.UseVisualStyleBackColor = true;
            button_lib.Click += button_lib_Click;
            // 
            // button_del
            // 
            button_del.Dock = DockStyle.Fill;
            button_del.Enabled = false;
            button_del.Location = new Point(830, 7);
            button_del.Margin = new Padding(4, 7, 4, 7);
            button_del.Name = "button_del";
            button_del.Size = new Size(172, 39);
            button_del.TabIndex = 3;
            button_del.Text = "선택한 파일 삭제";
            button_del.UseVisualStyleBackColor = true;
            button_del.Click += button1_Click;
            // 
            // checkBox1
            // 
            checkBox1.AutoSize = true;
            checkBox1.Dock = DockStyle.Right;
            checkBox1.Location = new Point(712, 5);
            checkBox1.Margin = new Padding(4, 5, 4, 5);
            checkBox1.Name = "checkBox1";
            checkBox1.Size = new Size(110, 43);
            checkBox1.TabIndex = 8;
            checkBox1.Text = "삭제잠금";
            checkBox1.UseVisualStyleBackColor = true;
            checkBox1.CheckedChanged += checkBox1_CheckedChanged;
            // 
            // button2
            // 
            button2.Location = new Point(1406, 7);
            button2.Margin = new Padding(4, 7, 4, 7);
            button2.Name = "button2";
            button2.Size = new Size(1, 38);
            button2.TabIndex = 11;
            button2.Text = "files 이전";
            button2.UseVisualStyleBackColor = true;
            button2.Visible = false;
            // 
            // button3
            // 
            button3.Location = new Point(1406, 7);
            button3.Margin = new Padding(4, 7, 4, 7);
            button3.Name = "button3";
            button3.Size = new Size(1, 38);
            button3.TabIndex = 12;
            button3.Text = "lib 이전";
            button3.UseVisualStyleBackColor = true;
            button3.Visible = false;
            // 
            // progressBar1
            // 
            progressBar1.BackColor = SystemColors.ActiveCaption;
            progressBar1.Dock = DockStyle.Fill;
            progressBar1.ForeColor = Color.HotPink;
            progressBar1.Location = new Point(1009, 3);
            progressBar1.Name = "progressBar1";
            progressBar1.Size = new Size(390, 47);
            progressBar1.TabIndex = 13;
            // 
            // tableLayoutPanel3
            // 
            tableLayoutPanel3.ColumnCount = 2;
            tableLayoutPanel3.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50F));
            tableLayoutPanel3.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50F));
            tableLayoutPanel3.Controls.Add(button1, 1, 0);
            tableLayoutPanel3.Controls.Add(button_refresh, 0, 0);
            tableLayoutPanel3.Dock = DockStyle.Fill;
            tableLayoutPanel3.Location = new Point(406, 0);
            tableLayoutPanel3.Margin = new Padding(0);
            tableLayoutPanel3.Name = "tableLayoutPanel3";
            tableLayoutPanel3.RowCount = 1;
            tableLayoutPanel3.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel3.Size = new Size(300, 53);
            tableLayoutPanel3.TabIndex = 14;
            // 
            // button1
            // 
            button1.Dock = DockStyle.Fill;
            button1.Location = new Point(154, 7);
            button1.Margin = new Padding(4, 7, 4, 7);
            button1.Name = "button1";
            button1.Size = new Size(142, 39);
            button1.TabIndex = 8;
            button1.Text = "삭제 검색";
            button1.UseVisualStyleBackColor = true;
            button1.Click += button1_Click_1;
            // 
            // button_refresh
            // 
            button_refresh.Dock = DockStyle.Fill;
            button_refresh.Location = new Point(4, 7);
            button_refresh.Margin = new Padding(4, 7, 4, 7);
            button_refresh.Name = "button_refresh";
            button_refresh.Size = new Size(142, 39);
            button_refresh.TabIndex = 7;
            button_refresh.Text = "추가 검색";
            button_refresh.UseVisualStyleBackColor = true;
            button_refresh.Click += button_refresh_Click;
            // 
            // button4
            // 
            button4.Location = new Point(1406, 7);
            button4.Margin = new Padding(4, 7, 4, 7);
            button4.Name = "button4";
            button4.Size = new Size(131, 39);
            button4.TabIndex = 15;
            button4.UseVisualStyleBackColor = true;
            button4.Click += button4_Click;
            // 
            // dataGridView1
            // 
            dataGridView1.AllowUserToAddRows = false;
            dataGridView1.AllowUserToDeleteRows = false;
            dataGridViewCellStyle1.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle1.BackColor = SystemColors.Control;
            dataGridViewCellStyle1.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle1.ForeColor = SystemColors.WindowText;
            dataGridViewCellStyle1.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle1.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle1.WrapMode = DataGridViewTriState.True;
            dataGridView1.ColumnHeadersDefaultCellStyle = dataGridViewCellStyle1;
            dataGridView1.ColumnHeadersHeight = 34;
            dataGridView1.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing;
            dataGridView1.Columns.AddRange(new DataGridViewColumn[] { idx, filename, exe, lasttime, addtime, eval, score0, score1, score2, score3, score4, score5, desc, openpath, fullpath });
            dataGridViewCellStyle2.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle2.BackColor = SystemColors.Window;
            dataGridViewCellStyle2.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle2.ForeColor = SystemColors.ControlText;
            dataGridViewCellStyle2.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle2.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle2.WrapMode = DataGridViewTriState.False;
            dataGridView1.DefaultCellStyle = dataGridViewCellStyle2;
            dataGridView1.Dock = DockStyle.Fill;
            dataGridView1.Location = new Point(4, 68);
            dataGridView1.Margin = new Padding(4, 5, 4, 5);
            dataGridView1.Name = "dataGridView1";
            dataGridViewCellStyle3.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle3.BackColor = SystemColors.Control;
            dataGridViewCellStyle3.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle3.ForeColor = SystemColors.WindowText;
            dataGridViewCellStyle3.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle3.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle3.WrapMode = DataGridViewTriState.True;
            dataGridView1.RowHeadersDefaultCellStyle = dataGridViewCellStyle3;
            dataGridView1.RowHeadersVisible = false;
            dataGridView1.RowHeadersWidth = 62;
            dataGridView1.RowHeadersWidthSizeMode = DataGridViewRowHeadersWidthSizeMode.DisableResizing;
            dataGridView1.RowTemplate.Height = 25;
            dataGridView1.RowTemplate.Resizable = DataGridViewTriState.False;
            dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridView1.Size = new Size(1541, 1306);
            dataGridView1.TabIndex = 5;
            dataGridView1.CellContentClick += dataGridView1_CellContentClick;
            dataGridView1.CellContentDoubleClick += dataGridView1_CellDoubleClick;
            dataGridView1.CellEndEdit += dataGridView1_CellEndEdit;
            // 
            // idx
            // 
            idx.DataPropertyName = "idx";
            idx.Frozen = true;
            idx.HeaderText = "Column1";
            idx.MinimumWidth = 8;
            idx.Name = "idx";
            idx.ReadOnly = true;
            idx.Visible = false;
            idx.Width = 150;
            // 
            // filename
            // 
            filename.DataPropertyName = "filename";
            filename.Frozen = true;
            filename.HeaderText = "파일명";
            filename.MinimumWidth = 8;
            filename.Name = "filename";
            filename.ReadOnly = true;
            filename.Width = 430;
            // 
            // exe
            // 
            exe.DataPropertyName = "exe";
            exe.Frozen = true;
            exe.HeaderText = "실행";
            exe.MinimumWidth = 8;
            exe.Name = "exe";
            exe.ReadOnly = true;
            exe.Text = "📺";
            exe.UseColumnTextForButtonValue = true;
            exe.Width = 70;
            // 
            // lasttime
            // 
            lasttime.DataPropertyName = "lasttime";
            lasttime.Frozen = true;
            lasttime.HeaderText = "실행시간";
            lasttime.MinimumWidth = 8;
            lasttime.Name = "lasttime";
            lasttime.ReadOnly = true;
            lasttime.Width = 190;
            // 
            // addtime
            // 
            addtime.DataPropertyName = "addtime";
            addtime.Frozen = true;
            addtime.HeaderText = "추가시간";
            addtime.MinimumWidth = 8;
            addtime.Name = "addtime";
            addtime.ReadOnly = true;
            addtime.Width = 190;
            // 
            // eval
            // 
            eval.DataPropertyName = "eval";
            eval.Frozen = true;
            eval.HeaderText = "점수";
            eval.MinimumWidth = 8;
            eval.Name = "eval";
            eval.ReadOnly = true;
            eval.Width = 110;
            // 
            // score0
            // 
            score0.DataPropertyName = "score0";
            score0.Frozen = true;
            score0.HeaderText = "0";
            score0.MinimumWidth = 8;
            score0.Name = "score0";
            score0.ReadOnly = true;
            score0.Text = "0";
            score0.UseColumnTextForButtonValue = true;
            score0.Width = 30;
            // 
            // score1
            // 
            score1.DataPropertyName = "score1";
            score1.Frozen = true;
            score1.HeaderText = "1";
            score1.MinimumWidth = 8;
            score1.Name = "score1";
            score1.ReadOnly = true;
            score1.Text = "1";
            score1.UseColumnTextForButtonValue = true;
            score1.Width = 30;
            // 
            // score2
            // 
            score2.DataPropertyName = "score2";
            score2.Frozen = true;
            score2.HeaderText = "2";
            score2.MinimumWidth = 8;
            score2.Name = "score2";
            score2.ReadOnly = true;
            score2.Text = "2";
            score2.UseColumnTextForButtonValue = true;
            score2.Width = 30;
            // 
            // score3
            // 
            score3.DataPropertyName = "score3";
            score3.Frozen = true;
            score3.HeaderText = "3";
            score3.MinimumWidth = 8;
            score3.Name = "score3";
            score3.ReadOnly = true;
            score3.Text = "3";
            score3.UseColumnTextForButtonValue = true;
            score3.Width = 30;
            // 
            // score4
            // 
            score4.DataPropertyName = "score4";
            score4.Frozen = true;
            score4.HeaderText = "4";
            score4.MinimumWidth = 8;
            score4.Name = "score4";
            score4.ReadOnly = true;
            score4.Text = "4";
            score4.UseColumnTextForButtonValue = true;
            score4.Width = 30;
            // 
            // score5
            // 
            score5.DataPropertyName = "score5";
            score5.Frozen = true;
            score5.HeaderText = "5";
            score5.MinimumWidth = 8;
            score5.Name = "score5";
            score5.ReadOnly = true;
            score5.Text = "5";
            score5.UseColumnTextForButtonValue = true;
            score5.Width = 30;
            // 
            // desc
            // 
            desc.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill;
            desc.DataPropertyName = "desc";
            desc.HeaderText = "설명";
            desc.MinimumWidth = 100;
            desc.Name = "desc";
            // 
            // openpath
            // 
            openpath.DataPropertyName = "openpath";
            openpath.HeaderText = "경로";
            openpath.MinimumWidth = 8;
            openpath.Name = "openpath";
            openpath.ReadOnly = true;
            openpath.Text = "📁";
            openpath.UseColumnTextForButtonValue = true;
            openpath.Width = 70;
            // 
            // fullpath
            // 
            fullpath.DataPropertyName = "fullpath";
            fullpath.HeaderText = "fullpath";
            fullpath.MinimumWidth = 8;
            fullpath.Name = "fullpath";
            fullpath.ReadOnly = true;
            fullpath.Visible = false;
            fullpath.Width = 150;
            // 
            // label_status
            // 
            label_status.ImageScalingSize = new Size(20, 20);
            label_status.Items.AddRange(new ToolStripItem[] { toolStripStatusLabel1, toolStripStatusLabel_totalcount });
            label_status.Location = new Point(0, 1390);
            label_status.Name = "label_status";
            label_status.Padding = new Padding(1, 0, 20, 0);
            label_status.Size = new Size(1549, 32);
            label_status.TabIndex = 1;
            label_status.Text = "statusStrip1";
            // 
            // toolStripStatusLabel1
            // 
            toolStripStatusLabel1.Name = "toolStripStatusLabel1";
            toolStripStatusLabel1.Size = new Size(56, 25);
            toolStripStatusLabel1.Text = "Total:";
            // 
            // toolStripStatusLabel_totalcount
            // 
            toolStripStatusLabel_totalcount.Name = "toolStripStatusLabel_totalcount";
            toolStripStatusLabel_totalcount.Size = new Size(22, 25);
            toolStripStatusLabel_totalcount.Text = "0";
            // 
            // MainForm
            // 
            AutoScaleDimensions = new SizeF(10F, 25F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1549, 1422);
            Controls.Add(label_status);
            Controls.Add(tableLayoutPanel1);
            Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            Margin = new Padding(4, 7, 4, 7);
            Name = "MainForm";
            Text = "Baseball Video Manager V.3";
            tableLayoutPanel1.ResumeLayout(false);
            tableLayoutPanel2.ResumeLayout(false);
            tableLayoutPanel2.PerformLayout();
            tableLayoutPanel3.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)dataGridView1).EndInit();
            label_status.ResumeLayout(false);
            label_status.PerformLayout();
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private TableLayoutPanel tableLayoutPanel1;
        private Button button_lib;
        private Button button_del;
        private Button button_refresh;
        private StatusStrip label_status;
        private ToolStripStatusLabel toolStripStatusLabel1;
        private ToolStripStatusLabel toolStripStatusLabel_totalcount;
        private CheckBox checkBox1;
        private TextBox textBox1;
        private Button button2;
        private TableLayoutPanel tableLayoutPanel2;
        private Button button3;
        private ProgressBar progressBar1;
        private DataGridView dataGridView1;
        private TableLayoutPanel tableLayoutPanel3;
        private Button button1;
        private Button button4;
        private DataGridViewTextBoxColumn idx;
        private DataGridViewTextBoxColumn filename;
        private DataGridViewButtonColumn exe;
        private DataGridViewTextBoxColumn lasttime;
        private DataGridViewTextBoxColumn addtime;
        private DataGridViewTextBoxColumn eval;
        private DataGridViewButtonColumn score0;
        private DataGridViewButtonColumn score1;
        private DataGridViewButtonColumn score2;
        private DataGridViewButtonColumn score3;
        private DataGridViewButtonColumn score4;
        private DataGridViewButtonColumn score5;
        private DataGridViewTextBoxColumn desc;
        private DataGridViewButtonColumn openpath;
        private DataGridViewTextBoxColumn fullpath;
    }
}

