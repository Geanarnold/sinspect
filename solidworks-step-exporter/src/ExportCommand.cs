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
        public const string Revision = "rev.05";

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

                string summary = "Concluído.\n";
                if (options.GenerateStep)
                    summary += string.Format("\nSTEP: {0} gerado(s), {1} ignorado(s), {2} falha(s)\n  {3}",
                        report.Succeeded, report.Skipped, report.Failed, options.OutputFolder);
                if (options.GenerateDxf)
                    summary += string.Format("\nDXF planificado: {0} gerado(s), {1} falha(s), {2} sem código\n  {3}",
                        report.DxfSucceeded, report.DxfFailed, report.DxfWithoutCode, options.DxfFolder);
                summary += "\n\nLog: " + report.LogPath;
                if (report.Cancelled)
                    summary = "CANCELADO pelo usuário.\n\n" + summary;

                Ui.Show(summary, report.Failed + report.DxfFailed > 0 ? MessageBoxIcon.Warning : MessageBoxIcon.Information);

                if (options.OpenFolderWhenDone)
                {
                    if (options.GenerateStep && Directory.Exists(options.OutputFolder))
                        System.Diagnostics.Process.Start("explorer.exe", "\"" + options.OutputFolder + "\"");
                    if (options.GenerateDxf && report.DxfSucceeded > 0 && Directory.Exists(options.DxfFolder))
                        System.Diagnostics.Process.Start("explorer.exe", "\"" + options.DxfFolder + "\"");
                }
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
