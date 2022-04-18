namespace BaseBall_Video_Manager
{
    partial class Library
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.tableLayoutPanel1 = new System.Windows.Forms.TableLayoutPanel();
            this.dataGridView1 = new System.Windows.Forms.DataGridView();
            this.path = new System.Windows.Forms.DataGridViewTextBoxColumn();
            this.button_save_exit = new System.Windows.Forms.Button();
            this.button_add = new System.Windows.Forms.Button();
            this.button_del = new System.Windows.Forms.Button();
            this.tableLayoutPanel1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).BeginInit();
            this.SuspendLayout();
            // 
            // tableLayoutPanel1
            // 
            this.tableLayoutPanel1.ColumnCount = 4;
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Absolute, 90F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Absolute, 90F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Absolute, 125F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutPanel1.Controls.Add(this.dataGridView1, 0, 1);
            this.tableLayoutPanel1.Controls.Add(this.button_save_exit, 2, 0);
            this.tableLayoutPanel1.Controls.Add(this.button_add, 0, 0);
            this.tableLayoutPanel1.Controls.Add(this.button_del, 1, 0);
            this.tableLayoutPanel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.tableLayoutPanel1.Location = new System.Drawing.Point(0, 0);
            this.tableLayoutPanel1.Name = "tableLayoutPanel1";
            this.tableLayoutPanel1.RowCount = 2;
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Absolute, 30F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutPanel1.Size = new System.Drawing.Size(413, 450);
            this.tableLayoutPanel1.TabIndex = 0;
            // 
            // dataGridView1
            // 
            this.dataGridView1.AllowUserToAddRows = false;
            this.dataGridView1.AllowUserToDeleteRows = false;
            this.dataGridView1.AllowUserToResizeColumns = false;
            this.dataGridView1.AllowUserToResizeRows = false;
            this.dataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridView1.ColumnHeadersVisible = false;
            this.dataGridView1.Columns.AddRange(new System.Windows.Forms.DataGridViewColumn[] {
            this.path});
            this.tableLayoutPanel1.SetColumnSpan(this.dataGridView1, 4);
            this.dataGridView1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.dataGridView1.Location = new System.Drawing.Point(3, 33);
            this.dataGridView1.Name = "dataGridView1";
            this.dataGridView1.RowHeadersVisible = false;
            this.dataGridView1.RowTemplate.Height = 23;
            this.dataGridView1.SelectionMode = System.Windows.Forms.DataGridViewSelectionMode.FullRowSelect;
            this.dataGridView1.Size = new System.Drawing.Size(407, 414);
            this.dataGridView1.TabIndex = 0;
            // 
            // path
            // 
            this.path.AutoSizeMode = System.Windows.Forms.DataGridViewAutoSizeColumnMode.Fill;
            this.path.DataPropertyName = "path";
            this.path.HeaderText = "path";
            this.path.Name = "path";
            this.path.ReadOnly = true;
            // 
            // button_save_exit
            // 
            this.button_save_exit.Dock = System.Windows.Forms.DockStyle.Fill;
            this.button_save_exit.Location = new System.Drawing.Point(183, 3);
            this.button_save_exit.Name = "button_save_exit";
            this.button_save_exit.Size = new System.Drawing.Size(119, 24);
            this.button_save_exit.TabIndex = 3;
            this.button_save_exit.Text = "저장 후 닫기";
            this.button_save_exit.UseVisualStyleBackColor = true;
            this.button_save_exit.Click += new System.EventHandler(this.button_save_exit_Click);
            // 
            // button_add
            // 
            this.button_add.Dock = System.Windows.Forms.DockStyle.Fill;
            this.button_add.Location = new System.Drawing.Point(3, 3);
            this.button_add.Name = "button_add";
            this.button_add.Size = new System.Drawing.Size(84, 24);
            this.button_add.TabIndex = 1;
            this.button_add.Text = "추가";
            this.button_add.UseVisualStyleBackColor = true;
            this.button_add.Click += new System.EventHandler(this.button_add_Click);
            // 
            // button_del
            // 
            this.button_del.Dock = System.Windows.Forms.DockStyle.Fill;
            this.button_del.Location = new System.Drawing.Point(93, 3);
            this.button_del.Name = "button_del";
            this.button_del.Size = new System.Drawing.Size(84, 24);
            this.button_del.TabIndex = 2;
            this.button_del.Text = "삭제";
            this.button_del.UseVisualStyleBackColor = true;
            this.button_del.Click += new System.EventHandler(this.button_del_Click);
            // 
            // Library
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 12F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(413, 450);
            this.Controls.Add(this.tableLayoutPanel1);
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "Library";
            this.ShowIcon = false;
            this.Text = "Librari";
            this.tableLayoutPanel1.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.dataGridView1)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.TableLayoutPanel tableLayoutPanel1;
        private System.Windows.Forms.DataGridView dataGridView1;
        private System.Windows.Forms.Button button_save_exit;
        private System.Windows.Forms.Button button_add;
        private System.Windows.Forms.Button button_del;
        private System.Windows.Forms.DataGridViewTextBoxColumn path;
    }
}