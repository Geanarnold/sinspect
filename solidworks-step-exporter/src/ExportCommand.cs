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
        public const string Revision = "rev.03";

        public static void Run(ISldWorks swApp)
        {
            try
            {
                Ui.Log("Run: obtendo documento ativo");
                ModelDoc2 doc = (ModelDoc2)swApp.ActiveDoc;
                Ui.Log("Run: documento ativo = " + (doc == null ? "(nenhum)" : doc.GetPathName()));
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

                ComponentCollection collection;
                using (WaitForm.Open("Lendo a montagem, aguarde..."))
                    collection = ComponentCollector.Collect(doc);
                Ui.Log("Run: " + collection.Items.Count + " itens coletados, " + collection.Warnings.Count + " avisos");

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

                Ui.Log("Run: exportando " + options.Items.Count + " itens para " + options.OutputFolder);
                ExportReport report = new StepExportService(swApp).Export(doc, options);
                Ui.Log("Run: concluído. OK=" + report.Succeeded + " falhas=" + report.Failed);

                string summary = string.Format(
                    "Exportação concluída.\n\nExportados: {0}\nIgnorados (já existiam): {1}\nFalhas: {2}\n\nPasta: {3}\nLog: {4}",
                    report.Succeeded, report.Skipped, report.Failed, options.OutputFolder, report.LogPath);
                if (report.Cancelled)
                    summary = "Exportação CANCELADA pelo usuário.\n\n" + summary;

                Ui.Show(summary, report.Failed > 0 ? MessageBoxIcon.Warning : MessageBoxIcon.Information);

                if (options.OpenFolderWhenDone && Directory.Exists(options.OutputFolder))
                    System.Diagnostics.Process.Start("explorer.exe", "\"" + options.OutputFolder + "\"");
            }
            catch (Exception ex)
            {
                Ui.Error(ex);
            }
        }

        public static void Warn(string message)
        {
            Ui.Log("Aviso: " + message);
            Ui.Show(message, MessageBoxIcon.Warning);
        }
    }
}
