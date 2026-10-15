using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace StepExporter
{
    /// <summary>
    /// Mensagens sempre na frente (o SOLIDWORKS costuma cobrir janelas sem dono) e
    /// log de diagnóstico em %TEMP%\GeradorDeSTEP.log.
    /// </summary>
    public static class Ui
    {
        public static readonly string LogPath = Path.Combine(Path.GetTempPath(), "GeradorDeSTEP.log");

        public static void Log(string message)
        {
            try
            {
                File.AppendAllText(LogPath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff") + "  " + message + Environment.NewLine);
            }
            catch { }
        }

        public static void Show(string message, MessageBoxIcon icon)
        {
            using (var owner = new Form { TopMost = true, ShowInTaskbar = false, StartPosition = FormStartPosition.CenterScreen, Size = new Size(1, 1), Opacity = 0 })
            {
                owner.Show();
                owner.Activate();
                MessageBox.Show(owner, message, ExportCommand.Title + " " + ExportCommand.Revision, MessageBoxButtons.OK, icon);
            }
        }

        public static void Error(Exception ex)
        {
            Log("ERRO: " + ex);
            Show("Erro inesperado:\n\n" + ex + "\n\nLog: " + LogPath, MessageBoxIcon.Error);
        }
    }

    /// <summary>Janela "aguarde" exibida enquanto a montagem é lida.</summary>
    public sealed class WaitForm : Form
    {
        private WaitForm(string text)
        {
            Text = ExportCommand.Title + " " + ExportCommand.Revision;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            ControlBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            TopMost = true;
            ShowInTaskbar = true;
            ClientSize = new Size(360, 70);
            Font = new Font("Segoe UI", 10f);
            Controls.Add(new Label { Text = text, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter });
        }

        public static WaitForm Open(string text)
        {
            var form = new WaitForm(text);
            form.Show();
            form.Activate();
            Application.DoEvents();
            return form;
        }
    }
}
