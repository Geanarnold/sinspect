using System;
using System.IO;
using System.Windows.Forms;
using SolidWorks.Interop.sldworks;

namespace StepExporter
{
    /// <summary>
    /// Fluxo completo do comando (pop-up → exportação → resumo). Compartilhado pelo
    /// add-in (dentro do SOLIDWORKS) e pelo executável avulso (sem registro/admin).
    /// </summary>
    public static class ExportCommand
    {
        public const string Title = "Gerador de STEP";

        public static void Run(ISldWorks swApp)
        {
            try
            {
                ModelDoc2 doc = (ModelDoc2)swApp.ActiveDoc;
                if (doc == null)
                {
                    Warn("Abra uma peça ou montagem antes de exportar.");
                    return;
                }

                string docPath = doc.GetPathName();
                if (string.IsNullOrEmpty(docPath))
                {
                    Warn("Salve o documento antes de exportar (o arquivo ainda não tem caminho).");
                    return;
                }

                ComponentCollection collection = ComponentCollector.Collect(doc);

                ExportOptions options;
                using (var dialog = new ExportDialog(collection))
                {
                    if (dialog.ShowDialog() != DialogResult.OK)
                        return;
                    options = dialog.Result;
                }

                if (options.Items.Count == 0)
                {
                    Warn("Nenhum item selecionado.");
                    return;
                }

                ExportReport report = new StepExportService(swApp).Export(doc, options);

                string summary = string.Format(
                    "Exportação concluída.\n\nExportados: {0}\nIgnorados (já existiam): {1}\nFalhas: {2}\n\nPasta: {3}\nLog: {4}",
                    report.Succeeded, report.Skipped, report.Failed, options.OutputFolder, report.LogPath);
                if (report.Cancelled)
                    summary = "Exportação CANCELADA pelo usuário.\n\n" + summary;

                MessageBox.Show(summary, Title, MessageBoxButtons.OK,
                    report.Failed > 0 ? MessageBoxIcon.Warning : MessageBoxIcon.Information);

                if (options.OpenFolderWhenDone && Directory.Exists(options.OutputFolder))
                    System.Diagnostics.Process.Start("explorer.exe", "\"" + options.OutputFolder + "\"");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro inesperado:\n\n" + ex, Title, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        public static void Warn(string message)
        {
            MessageBox.Show(message, Title, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
