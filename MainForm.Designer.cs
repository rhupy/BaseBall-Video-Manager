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
            DataGridViewCellStyle dataGridViewCellStyle4 = new DataGridViewCellStyle();
            DataGridViewCellStyle dataGridViewCellStyle5 = new DataGridViewCellStyle();
            DataGridViewCellStyle dataGridViewCellStyle6 = new DataGridViewCellStyle();
            tableLayoutPanel1 = new TableLayoutPanel();
            tableLayoutPanel2 = new TableLayoutPanel();
            button_del = new Button();
            label1 = new Label();
            textBox1 = new TextBox();
            button_refresh = new Button();
            button5 = new Button();
            button4 = new Button();
            button_lib = new Button();
            tabControl1 = new TabControl();
            tabPage1 = new TabPage();
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
            tabPage2 = new TabPage();
            dataGridView2 = new DataGridView();
            label_status = new StatusStrip();
            toolStripStatusLabel1 = new ToolStripStatusLabel();
            toolStripStatusLabel_totalcount = new ToolStripStatusLabel();
            toolStripProgressBar1 = new ToolStripProgressBar();
            toolStripStatusLabel2 = new ToolStripStatusLabel();
            idx_ = new DataGridViewTextBoxColumn();
            filename_ = new DataGridViewTextBoxColumn();
            exe_ = new DataGridViewButtonColumn();
            lasttime_ = new DataGridViewTextBoxColumn();
            addtime_ = new DataGridViewTextBoxColumn();
            eval_ = new DataGridViewTextBoxColumn();
            score0_ = new DataGridViewButtonColumn();
            score1_ = new DataGridViewButtonColumn();
            score2_ = new DataGridViewButtonColumn();
            score3_ = new DataGridViewButtonColumn();
            score4_ = new DataGridViewButtonColumn();
            score5_ = new DataGridViewButtonColumn();
            desc_ = new DataGridViewTextBoxColumn();
            openpath_ = new DataGridViewButtonColumn();
            fullpath_ = new DataGridViewTextBoxColumn();
            tableLayoutPanel1.SuspendLayout();
            tableLayoutPanel2.SuspendLayout();
            tabControl1.SuspendLayout();
            tabPage1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)dataGridView1).BeginInit();
            tabPage2.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)dataGridView2).BeginInit();
            label_status.SuspendLayout();
            SuspendLayout();
            // 
            // tableLayoutPanel1
            // 
            tableLayoutPanel1.ColumnCount = 1;
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 20F));
            tableLayoutPanel1.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 20F));
            tableLayoutPanel1.Controls.Add(tableLayoutPanel2, 0, 0);
            tableLayoutPanel1.Controls.Add(tabControl1, 0, 1);
            tableLayoutPanel1.Dock = DockStyle.Fill;
            tableLayoutPanel1.Location = new Point(0, 0);
            tableLayoutPanel1.Margin = new Padding(3, 4, 3, 4);
            tableLayoutPanel1.Name = "tableLayoutPanel1";
            tableLayoutPanel1.RowCount = 3;
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Absolute, 39F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel1.RowStyles.Add(new RowStyle(SizeType.Absolute, 26F));
            tableLayoutPanel1.Size = new Size(1353, 944);
            tableLayoutPanel1.TabIndex = 0;
            // 
            // tableLayoutPanel2
            // 
            tableLayoutPanel2.ColumnCount = 8;
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 37F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 169F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100F));
            tableLayoutPanel2.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 90F));
            tableLayoutPanel2.Controls.Add(button_del, 4, 0);
            tableLayoutPanel2.Controls.Add(label1, 0, 0);
            tableLayoutPanel2.Controls.Add(textBox1, 1, 0);
            tableLayoutPanel2.Controls.Add(button_refresh, 3, 0);
            tableLayoutPanel2.Controls.Add(button5, 2, 0);
            tableLayoutPanel2.Controls.Add(button4, 5, 0);
            tableLayoutPanel2.Controls.Add(button_lib, 7, 0);
            tableLayoutPanel2.Dock = DockStyle.Fill;
            tableLayoutPanel2.Location = new Point(3, 3);
            tableLayoutPanel2.Name = "tableLayoutPanel2";
            tableLayoutPanel2.RowCount = 1;
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Percent, 100F));
            tableLayoutPanel2.RowStyles.Add(new RowStyle(SizeType.Absolute, 31F));
            tableLayoutPanel2.Size = new Size(1347, 33);
            tableLayoutPanel2.TabIndex = 4;
            // 
            // button_del
            // 
            button_del.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            button_del.Location = new Point(389, 5);
            button_del.Margin = new Padding(3, 4, 3, 4);
            button_del.Name = "button_del";
            button_del.Size = new Size(84, 23);
            button_del.TabIndex = 3;
            button_del.Text = "선택 삭제";
            button_del.UseVisualStyleBackColor = true;
            button_del.Click += button1_Click;
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.Dock = DockStyle.Fill;
            label1.Location = new Point(3, 0);
            label1.Name = "label1";
            label1.Size = new Size(31, 33);
            label1.TabIndex = 17;
            label1.Text = "검색";
            label1.TextAlign = ContentAlignment.MiddleCenter;
            // 
            // textBox1
            // 
            textBox1.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            textBox1.Location = new Point(40, 5);
            textBox1.Margin = new Padding(3, 3, 15, 3);
            textBox1.Name = "textBox1";
            textBox1.Size = new Size(151, 23);
            textBox1.TabIndex = 9;
            textBox1.KeyDown += textBox1_KeyDown;
            // 
            // button_refresh
            // 
            button_refresh.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            button_refresh.Location = new Point(299, 5);
            button_refresh.Margin = new Padding(3, 4, 3, 4);
            button_refresh.Name = "button_refresh";
            button_refresh.Size = new Size(84, 23);
            button_refresh.TabIndex = 7;
            button_refresh.Text = "리프레시";
            button_refresh.UseVisualStyleBackColor = true;
            button_refresh.Click += button_refresh_Click;
            // 
            // button5
            // 
            button5.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            button5.Location = new Point(208, 3);
            button5.Margin = new Padding(2);
            button5.Name = "button5";
            button5.Size = new Size(86, 27);
            button5.TabIndex = 16;
            button5.Text = "데이터 반영";
            button5.UseVisualStyleBackColor = true;
            button5.Click += button5_Click;
            // 
            // button4
            // 
            button4.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            button4.Location = new Point(479, 5);
            button4.Margin = new Padding(3, 4, 3, 4);
            button4.Name = "button4";
            button4.Size = new Size(84, 23);
            button4.TabIndex = 15;
            button4.Text = "빈 폴더 제거";
            button4.UseVisualStyleBackColor = true;
            button4.Click += button4_Click;
            // 
            // button_lib
            // 
            button_lib.Anchor = AnchorStyles.Left | AnchorStyles.Right;
            button_lib.Location = new Point(1260, 5);
            button_lib.Margin = new Padding(3, 4, 3, 4);
            button_lib.Name = "button_lib";
            button_lib.Size = new Size(84, 23);
            button_lib.TabIndex = 0;
            button_lib.Text = "라이브러리";
            button_lib.UseVisualStyleBackColor = true;
            button_lib.Click += button_lib_Click;
            // 
            // tabControl1
            // 
            tabControl1.Controls.Add(tabPage1);
            tabControl1.Controls.Add(tabPage2);
            tabControl1.Dock = DockStyle.Fill;
            tabControl1.Location = new Point(3, 42);
            tabControl1.Name = "tabControl1";
            tabControl1.SelectedIndex = 0;
            tabControl1.Size = new Size(1347, 873);
            tabControl1.TabIndex = 5;
            tabControl1.SelectedIndexChanged += tabControl1_SelectedIndexChanged;
            // 
            // tabPage1
            // 
            tabPage1.Controls.Add(dataGridView1);
            tabPage1.Location = new Point(4, 24);
            tabPage1.Name = "tabPage1";
            tabPage1.Padding = new Padding(3);
            tabPage1.Size = new Size(1339, 845);
            tabPage1.TabIndex = 0;
            tabPage1.Text = "      영상      ";
            tabPage1.UseVisualStyleBackColor = true;
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
            dataGridView1.Location = new Point(3, 3);
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
            dataGridView1.Size = new Size(1333, 839);
            dataGridView1.TabIndex = 5;
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
            filename.Width = 450;
            // 
            // exe
            // 
            exe.DataPropertyName = "exe";
            exe.Frozen = true;
            exe.HeaderText = "실행";
            exe.MinimumWidth = 8;
            exe.Name = "exe";
            exe.ReadOnly = true;
            exe.SortMode = DataGridViewColumnSortMode.Automatic;
            exe.Text = "📺";
            exe.UseColumnTextForButtonValue = true;
            exe.Width = 70;
            // 
            // lasttime
            // 
            lasttime.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            lasttime.DataPropertyName = "lasttime";
            lasttime.Frozen = true;
            lasttime.HeaderText = "실행시간";
            lasttime.MinimumWidth = 8;
            lasttime.Name = "lasttime";
            lasttime.ReadOnly = true;
            lasttime.Width = 80;
            // 
            // addtime
            // 
            addtime.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            addtime.DataPropertyName = "addtime";
            addtime.Frozen = true;
            addtime.HeaderText = "추가시간";
            addtime.MinimumWidth = 8;
            addtime.Name = "addtime";
            addtime.ReadOnly = true;
            addtime.Width = 80;
            // 
            // eval
            // 
            eval.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            eval.DataPropertyName = "eval";
            eval.Frozen = true;
            eval.HeaderText = "점수";
            eval.MinimumWidth = 8;
            eval.Name = "eval";
            eval.ReadOnly = true;
            eval.Width = 56;
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
            openpath.Width = 37;
            // 
            // fullpath
            // 
            fullpath.DataPropertyName = "fullpath";
            fullpath.HeaderText = "fullpath";
            fullpath.MinimumWidth = 8;
            fullpath.Name = "fullpath";
            fullpath.ReadOnly = true;
            fullpath.Width = 150;
            // 
            // tabPage2
            // 
            tabPage2.Controls.Add(dataGridView2);
            tabPage2.Location = new Point(4, 24);
            tabPage2.Name = "tabPage2";
            tabPage2.Padding = new Padding(3);
            tabPage2.Size = new Size(1339, 845);
            tabPage2.TabIndex = 1;
            tabPage2.Text = "      파일      ";
            tabPage2.UseVisualStyleBackColor = true;
            // 
            // dataGridView2
            // 
            dataGridView2.AllowUserToAddRows = false;
            dataGridView2.AllowUserToDeleteRows = false;
            dataGridViewCellStyle4.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle4.BackColor = SystemColors.Control;
            dataGridViewCellStyle4.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle4.ForeColor = SystemColors.WindowText;
            dataGridViewCellStyle4.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle4.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle4.WrapMode = DataGridViewTriState.True;
            dataGridView2.ColumnHeadersDefaultCellStyle = dataGridViewCellStyle4;
            dataGridView2.ColumnHeadersHeight = 34;
            dataGridView2.ColumnHeadersHeightSizeMode = DataGridViewColumnHeadersHeightSizeMode.DisableResizing;
            dataGridView2.Columns.AddRange(new DataGridViewColumn[] { idx_, filename_, exe_, lasttime_, addtime_, eval_, score0_, score1_, score2_, score3_, score4_, score5_, desc_, openpath_, fullpath_ });
            dataGridViewCellStyle5.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle5.BackColor = SystemColors.Window;
            dataGridViewCellStyle5.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle5.ForeColor = SystemColors.ControlText;
            dataGridViewCellStyle5.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle5.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle5.WrapMode = DataGridViewTriState.False;
            dataGridView2.DefaultCellStyle = dataGridViewCellStyle5;
            dataGridView2.Dock = DockStyle.Fill;
            dataGridView2.Location = new Point(3, 3);
            dataGridView2.Name = "dataGridView2";
            dataGridViewCellStyle6.Alignment = DataGridViewContentAlignment.MiddleLeft;
            dataGridViewCellStyle6.BackColor = SystemColors.Control;
            dataGridViewCellStyle6.Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            dataGridViewCellStyle6.ForeColor = SystemColors.WindowText;
            dataGridViewCellStyle6.SelectionBackColor = SystemColors.Highlight;
            dataGridViewCellStyle6.SelectionForeColor = SystemColors.HighlightText;
            dataGridViewCellStyle6.WrapMode = DataGridViewTriState.True;
            dataGridView2.RowHeadersDefaultCellStyle = dataGridViewCellStyle6;
            dataGridView2.RowHeadersVisible = false;
            dataGridView2.RowHeadersWidth = 62;
            dataGridView2.RowHeadersWidthSizeMode = DataGridViewRowHeadersWidthSizeMode.DisableResizing;
            dataGridView2.RowTemplate.Height = 25;
            dataGridView2.RowTemplate.Resizable = DataGridViewTriState.False;
            dataGridView2.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
            dataGridView2.Size = new Size(1333, 839);
            dataGridView2.TabIndex = 6;
            // 
            // label_status
            // 
            label_status.ImageScalingSize = new Size(20, 20);
            label_status.Items.AddRange(new ToolStripItem[] { toolStripStatusLabel1, toolStripStatusLabel_totalcount, toolStripProgressBar1, toolStripStatusLabel2 });
            label_status.Location = new Point(0, 922);
            label_status.Name = "label_status";
            label_status.Size = new Size(1353, 22);
            label_status.TabIndex = 1;
            label_status.Text = "statusStrip1";
            // 
            // toolStripStatusLabel1
            // 
            toolStripStatusLabel1.Name = "toolStripStatusLabel1";
            toolStripStatusLabel1.Size = new Size(36, 17);
            toolStripStatusLabel1.Text = "Total:";
            // 
            // toolStripStatusLabel_totalcount
            // 
            toolStripStatusLabel_totalcount.Name = "toolStripStatusLabel_totalcount";
            toolStripStatusLabel_totalcount.Size = new Size(14, 17);
            toolStripStatusLabel_totalcount.Text = "0";
            // 
            // toolStripProgressBar1
            // 
            toolStripProgressBar1.Alignment = ToolStripItemAlignment.Right;
            toolStripProgressBar1.Name = "toolStripProgressBar1";
            toolStripProgressBar1.Size = new Size(200, 16);
            // 
            // toolStripStatusLabel2
            // 
            toolStripStatusLabel2.Name = "toolStripStatusLabel2";
            toolStripStatusLabel2.Size = new Size(0, 17);
            // 
            // idx_
            // 
            idx_.DataPropertyName = "idx";
            idx_.Frozen = true;
            idx_.HeaderText = "Column1";
            idx_.MinimumWidth = 8;
            idx_.Name = "idx_";
            idx_.ReadOnly = true;
            idx_.Visible = false;
            idx_.Width = 150;
            // 
            // filename_
            // 
            filename_.DataPropertyName = "filename";
            filename_.Frozen = true;
            filename_.HeaderText = "파일명";
            filename_.MinimumWidth = 8;
            filename_.Name = "filename_";
            filename_.ReadOnly = true;
            filename_.Width = 450;
            // 
            // exe_
            // 
            exe_.DataPropertyName = "exe";
            exe_.Frozen = true;
            exe_.HeaderText = "실행";
            exe_.MinimumWidth = 8;
            exe_.Name = "exe_";
            exe_.ReadOnly = true;
            exe_.SortMode = DataGridViewColumnSortMode.Automatic;
            exe_.Text = "📺";
            exe_.UseColumnTextForButtonValue = true;
            exe_.Width = 70;
            // 
            // lasttime_
            // 
            lasttime_.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            lasttime_.DataPropertyName = "lasttime";
            lasttime_.Frozen = true;
            lasttime_.HeaderText = "실행시간";
            lasttime_.MinimumWidth = 8;
            lasttime_.Name = "lasttime_";
            lasttime_.ReadOnly = true;
            lasttime_.Width = 80;
            // 
            // addtime_
            // 
            addtime_.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            addtime_.DataPropertyName = "addtime";
            addtime_.Frozen = true;
            addtime_.HeaderText = "추가시간";
            addtime_.MinimumWidth = 8;
            addtime_.Name = "addtime_";
            addtime_.ReadOnly = true;
            addtime_.Width = 80;
            // 
            // eval_
            // 
            eval_.AutoSizeMode = DataGridViewAutoSizeColumnMode.AllCells;
            eval_.DataPropertyName = "eval";
            eval_.Frozen = true;
            eval_.HeaderText = "점수";
            eval_.MinimumWidth = 8;
            eval_.Name = "eval_";
            eval_.ReadOnly = true;
            eval_.Width = 56;
            // 
            // score0_
            // 
            score0_.DataPropertyName = "score0";
            score0_.Frozen = true;
            score0_.HeaderText = "0";
            score0_.MinimumWidth = 8;
            score0_.Name = "score0_";
            score0_.ReadOnly = true;
            score0_.Text = "0";
            score0_.UseColumnTextForButtonValue = true;
            score0_.Width = 30;
            // 
            // score1_
            // 
            score1_.DataPropertyName = "score1";
            score1_.Frozen = true;
            score1_.HeaderText = "1";
            score1_.MinimumWidth = 8;
            score1_.Name = "score1_";
            score1_.ReadOnly = true;
            score1_.Text = "1";
            score1_.UseColumnTextForButtonValue = true;
            score1_.Width = 30;
            // 
            // score2_
            // 
            score2_.DataPropertyName = "score2";
            score2_.Frozen = true;
            score2_.HeaderText = "2";
            score2_.MinimumWidth = 8;
            score2_.Name = "score2_";
            score2_.ReadOnly = true;
            score2_.Text = "2";
            score2_.UseColumnTextForButtonValue = true;
            score2_.Width = 30;
            // 
            // score3_
            // 
            score3_.DataPropertyName = "score3";
            score3_.Frozen = true;
            score3_.HeaderText = "3";
            score3_.MinimumWidth = 8;
            score3_.Name = "score3_";
            score3_.ReadOnly = true;
            score3_.Text = "3";
            score3_.UseColumnTextForButtonValue = true;
            score3_.Width = 30;
            // 
            // score4_
            // 
            score4_.DataPropertyName = "score4";
            score4_.Frozen = true;
            score4_.HeaderText = "4";
            score4_.MinimumWidth = 8;
            score4_.Name = "score4_";
            score4_.ReadOnly = true;
            score4_.Text = "4";
            score4_.UseColumnTextForButtonValue = true;
            score4_.Width = 30;
            // 
            // score5_
            // 
            score5_.DataPropertyName = "score5";
            score5_.Frozen = true;
            score5_.HeaderText = "5";
            score5_.MinimumWidth = 8;
            score5_.Name = "score5_";
            score5_.ReadOnly = true;
            score5_.Text = "5";
            score5_.UseColumnTextForButtonValue = true;
            score5_.Width = 30;
            // 
            // desc_
            // 
            desc_.AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill;
            desc_.DataPropertyName = "desc";
            desc_.HeaderText = "설명";
            desc_.MinimumWidth = 100;
            desc_.Name = "desc_";
            // 
            // openpath_
            // 
            openpath_.DataPropertyName = "openpath";
            openpath_.HeaderText = "경로";
            openpath_.MinimumWidth = 8;
            openpath_.Name = "openpath_";
            openpath_.ReadOnly = true;
            openpath_.Text = "📁";
            openpath_.UseColumnTextForButtonValue = true;
            openpath_.Width = 37;
            // 
            // fullpath_
            // 
            fullpath_.DataPropertyName = "fullpath";
            fullpath_.HeaderText = "fullpath";
            fullpath_.MinimumWidth = 8;
            fullpath_.Name = "fullpath_";
            fullpath_.ReadOnly = true;
            fullpath_.Width = 150;
            // 
            // MainForm
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1353, 944);
            Controls.Add(label_status);
            Controls.Add(tableLayoutPanel1);
            Font = new Font("맑은 고딕", 9F, FontStyle.Regular, GraphicsUnit.Point);
            Margin = new Padding(3, 4, 3, 4);
            Name = "MainForm";
            Text = "Baseball Video Manager V.3";
            Load += MainForm_Load;
            tableLayoutPanel1.ResumeLayout(false);
            tableLayoutPanel2.ResumeLayout(false);
            tableLayoutPanel2.PerformLayout();
            tabControl1.ResumeLayout(false);
            tabPage1.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)dataGridView1).EndInit();
            tabPage2.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)dataGridView2).EndInit();
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
        private TextBox textBox1;
        private TableLayoutPanel tableLayoutPanel2;
        private DataGridView dataGridView1;
        private Button button4;
        private Button button5;
        private Label label1;
        private ToolStripProgressBar toolStripProgressBar1;
        private TabControl tabControl1;
        private TabPage tabPage1;
        private TabPage tabPage2;
        private DataGridView dataGridView2;
        private ToolStripStatusLabel toolStripStatusLabel2;
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
        private DataGridViewTextBoxColumn idx_;
        private DataGridViewTextBoxColumn filename_;
        private DataGridViewButtonColumn exe_;
        private DataGridViewTextBoxColumn lasttime_;
        private DataGridViewTextBoxColumn addtime_;
        private DataGridViewTextBoxColumn eval_;
        private DataGridViewButtonColumn score0_;
        private DataGridViewButtonColumn score1_;
        private DataGridViewButtonColumn score2_;
        private DataGridViewButtonColumn score3_;
        private DataGridViewButtonColumn score4_;
        private DataGridViewButtonColumn score5_;
        private DataGridViewTextBoxColumn desc_;
        private DataGridViewButtonColumn openpath_;
        private DataGridViewTextBoxColumn fullpath_;
    }
}

