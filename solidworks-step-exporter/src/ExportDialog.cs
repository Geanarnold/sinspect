using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Windows.Forms;

namespace StepExporter
{
    public class ExportOptions
    {
        public List<ExportItem> Items = new List<ExportItem>();
        public string OutputFolder;
        public int StepAp = 214;
        public bool Overwrite;
        public bool AlwaysAppendConfiguration;
        public bool OpenFolderWhenDone = true;
    }

    /// <summary>
    /// Pop-up de seleção: lista agrupada (montagem principal, submontagens, peças, Toolbox)
    /// com atalhos de seleção e opções de saída.
    /// </summary>
    public class ExportDialog : Form
    {
        private readonly ComponentCollection _collection;

        private readonly ListView _list = new ListView();
        private readonly TextBox _txtFolder = new TextBox();
        private readonly ComboBox _cmbAp = new ComboBox();
        private readonly CheckBox _chkOverwrite = new CheckBox();
        private readonly CheckBox _chkConfigName = new CheckBox();
        private readonly CheckBox _chkOpenFolder = new CheckBox();
        private readonly Label _lblCount = new Label();

        private ListViewGroup _grpTop, _grpSub, _grpPart, _grpToolbox;

        public ExportOptions Result { get; private set; }

        public ExportDialog(ComponentCollection collection)
        {
            _collection = collection;
            BuildLayout();
            FillList();
            UpdateCount();
        }

        private void BuildLayout()
        {
            Text = "Gerador de STEP – " + _collection.RootName;
            StartPosition = FormStartPosition.CenterScreen;
            TopMost = true;
            Size = new Size(820, 640);
            MinimumSize = new Size(640, 480);
            Font = new Font("Segoe UI", 9f);
            ShowInTaskbar = false;
            MinimizeBox = false;

            var root = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 1,
                RowCount = 5,
                Padding = new Padding(10)
            };
            root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            Controls.Add(root);

            var header = new Label
            {
                AutoSize = true,
                Text = "Marque o que deve ser convertido para STEP (das peças simples até a montagem principal):",
                Margin = new Padding(0, 0, 0, 6)
            };
            root.Controls.Add(header, 0, 0);

            // Atalhos de seleção
            var quick = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, WrapContents = true };
            quick.Controls.Add(MakeButton("Todas as peças", (s, e) => SetChecked(i => i.Kind == ItemKind.Part && !i.IsToolbox, true)));
            quick.Controls.Add(MakeButton("Todas as submontagens", (s, e) => SetChecked(i => i.Kind == ItemKind.SubAssembly, true)));
            quick.Controls.Add(MakeButton("Montagem principal", (s, e) => SetChecked(i => i.Kind == ItemKind.TopAssembly, true)));
            quick.Controls.Add(MakeButton("Toolbox", (s, e) => SetChecked(i => i.IsToolbox, true)));
            quick.Controls.Add(MakeButton("Tudo", (s, e) => SetChecked(i => true, true)));
            quick.Controls.Add(MakeButton("Nada", (s, e) => SetChecked(i => true, false)));
            root.Controls.Add(quick, 0, 1);

            // Lista
            _list.Dock = DockStyle.Fill;
            _list.View = View.Details;
            _list.CheckBoxes = true;
            _list.FullRowSelect = true;
            _list.GridLines = true;
            _list.ShowGroups = true;
            _list.Columns.Add("Arquivo", 260);
            _list.Columns.Add("Configuração", 140);
            _list.Columns.Add("Qtd", 50, HorizontalAlignment.Right);
            _list.Columns.Add("Nível", 50, HorizontalAlignment.Right);
            _list.Columns.Add("Observação", 120);
            _list.Columns.Add("Caminho", 400);
            _list.ItemChecked += (s, e) => UpdateCount();
            root.Controls.Add(_list, 0, 2);

            // Opções
            var opts = new TableLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, ColumnCount = 3 };
            opts.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            opts.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            opts.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

            opts.Controls.Add(new Label { Text = "Pasta de saída:", AutoSize = true, Anchor = AnchorStyles.Left }, 0, 0);
            _txtFolder.Dock = DockStyle.Fill;
            _txtFolder.Text = Path.Combine(_collection.RootFolder ?? "", "STEP");
            opts.Controls.Add(_txtFolder, 1, 0);
            opts.Controls.Add(MakeButton("Procurar...", OnBrowse), 2, 0);

            opts.Controls.Add(new Label { Text = "Formato:", AutoSize = true, Anchor = AnchorStyles.Left }, 0, 1);
            _cmbAp.DropDownStyle = ComboBoxStyle.DropDownList;
            _cmbAp.Items.AddRange(new object[] { "AP203", "AP214 (recomendado)", "AP242" });
            _cmbAp.SelectedIndex = 1;
            _cmbAp.Width = 200;
            opts.Controls.Add(_cmbAp, 1, 1);

            var checks = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill };
            _chkOverwrite.Text = "Sobrescrever arquivos existentes";
            _chkOverwrite.AutoSize = true;
            _chkOverwrite.Checked = true;
            _chkConfigName.Text = "Sempre incluir configuração no nome";
            _chkConfigName.AutoSize = true;
            _chkOpenFolder.Text = "Abrir pasta ao terminar";
            _chkOpenFolder.AutoSize = true;
            _chkOpenFolder.Checked = true;
            checks.Controls.Add(_chkOverwrite);
            checks.Controls.Add(_chkConfigName);
            checks.Controls.Add(_chkOpenFolder);
            opts.Controls.Add(checks, 0, 2);
            opts.SetColumnSpan(checks, 3);

            if (_collection.Warnings.Count > 0)
            {
                var warn = new Label
                {
                    AutoSize = true,
                    ForeColor = Color.DarkRed,
                    Text = "Atenção: " + _collection.Warnings.Count + " componente(s) não carregado(s) serão ignorados."
                };
                opts.Controls.Add(warn, 0, 3);
                opts.SetColumnSpan(warn, 3);
            }
            root.Controls.Add(opts, 0, 3);

            // Rodapé
            var footer = new FlowLayoutPanel
            {
                AutoSize = true,
                Dock = DockStyle.Fill,
                FlowDirection = FlowDirection.RightToLeft
            };
            var btnCancel = MakeButton("Cancelar", (s, e) => { DialogResult = DialogResult.Cancel; Close(); });
            var btnOk = MakeButton("Gerar STEP", OnOk);
            btnOk.Font = new Font(Font, FontStyle.Bold);
            footer.Controls.Add(btnCancel);
            footer.Controls.Add(btnOk);
            _lblCount.AutoSize = true;
            _lblCount.Margin = new Padding(3, 8, 20, 3);
            footer.Controls.Add(_lblCount);
            root.Controls.Add(footer, 0, 4);

            AcceptButton = btnOk;
            CancelButton = btnCancel;
        }

        private static Button MakeButton(string text, EventHandler onClick)
        {
            var b = new Button { Text = text, AutoSize = true, Padding = new Padding(6, 2, 6, 2) };
            b.Click += onClick;
            return b;
        }

        private void FillList()
        {
            _grpTop = new ListViewGroup("Montagem principal");
            _grpSub = new ListViewGroup("Submontagens");
            _grpPart = new ListViewGroup("Peças");
            _grpToolbox = new ListViewGroup("Toolbox (desmarcado por padrão)");
            _list.Groups.AddRange(new[] { _grpTop, _grpSub, _grpPart, _grpToolbox });

            IEnumerable<ExportItem> ordered = _collection.Items
                .OrderBy(i => i.Kind)
                .ThenBy(i => i.FileName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(i => i.Configuration, StringComparer.OrdinalIgnoreCase);

            _list.BeginUpdate();
            foreach (ExportItem item in ordered)
            {
                var notes = new List<string>();
                if (item.IsVirtual) notes.Add("virtual");
                if (item.IsToolbox) notes.Add("toolbox");

                var lvi = new ListViewItem(item.FileName)
                {
                    Tag = item,
                    Checked = !item.IsToolbox,
                    Group = GroupFor(item)
                };
                lvi.SubItems.Add(item.Configuration ?? "");
                lvi.SubItems.Add(item.Quantity.ToString());
                lvi.SubItems.Add(item.Level.ToString());
                lvi.SubItems.Add(string.Join(", ", notes));
                lvi.SubItems.Add(item.FilePath);
                _list.Items.Add(lvi);
            }
            _list.EndUpdate();
        }

        private ListViewGroup GroupFor(ExportItem item)
        {
            if (item.Kind == ItemKind.TopAssembly) return _grpTop;
            if (item.Kind == ItemKind.SubAssembly) return _grpSub;
            return item.IsToolbox ? _grpToolbox : _grpPart;
        }

        private void SetChecked(Func<ExportItem, bool> predicate, bool value)
        {
            _list.BeginUpdate();
            foreach (ListViewItem lvi in _list.Items)
            {
                if (predicate((ExportItem)lvi.Tag))
                    lvi.Checked = value;
            }
            _list.EndUpdate();
            UpdateCount();
        }

        private void UpdateCount()
        {
            _lblCount.Text = _list.CheckedItems.Count + " de " + _list.Items.Count + " selecionado(s)";
        }

        private void OnBrowse(object sender, EventArgs e)
        {
            using (var fbd = new FolderBrowserDialog())
            {
                fbd.Description = "Selecione a pasta de saída dos arquivos STEP";
                if (Directory.Exists(_txtFolder.Text))
                    fbd.SelectedPath = _txtFolder.Text;
                if (fbd.ShowDialog(this) == DialogResult.OK)
                    _txtFolder.Text = fbd.SelectedPath;
            }
        }

        private void OnOk(object sender, EventArgs e)
        {
            string folder = _txtFolder.Text.Trim();
            if (string.IsNullOrEmpty(folder))
            {
                MessageBox.Show(this, "Informe a pasta de saída.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                Directory.CreateDirectory(folder);
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "Não foi possível criar a pasta:\n" + ex.Message, Text,
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            int[] apValues = { 203, 214, 242 };
            Result = new ExportOptions
            {
                Items = _list.CheckedItems.Cast<ListViewItem>().Select(l => (ExportItem)l.Tag).ToList(),
                OutputFolder = folder,
                StepAp = apValues[_cmbAp.SelectedIndex],
                Overwrite = _chkOverwrite.Checked,
                AlwaysAppendConfiguration = _chkConfigName.Checked,
                OpenFolderWhenDone = _chkOpenFolder.Checked
            };

            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
