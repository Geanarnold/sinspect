using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

namespace StepExporter
{
    public class ExportReport
    {
        public int Succeeded;
        public int Skipped;
        public int Failed;
        public bool Cancelled;
        public string LogPath;
    }

    public class StepExportService
    {
        private readonly dynamic _swApp; // ISldWorks

        private readonly int _dontRebuild;
        private readonly int _saveAsVersion;
        private readonly int _saveAsOptions;
        private readonly int _userCancel;

        public StepExportService(object swApp)
        {
            _swApp = swApp;
            _dontRebuild = SwConst.Get("swRebuildOnActivation_e", "swDontRebuildActiveDoc");
            _saveAsVersion = SwConst.Get("swSaveAsVersion_e", "swSaveAsCurrentVersion");
            _saveAsOptions = SwConst.Get("swSaveAsOptions_e", "swSaveAsOptions_Silent") |
                             SwConst.Get("swSaveAsOptions_e", "swSaveAsOptions_Copy");
            _userCancel = SwConst.Get("swUpdateProgressError_e", "swUpdateProgressError_UserCancel");
        }

        public ExportReport Export(dynamic rootDoc, ExportOptions options)
        {
            var report = new ExportReport();
            var log = new StringBuilder();
            log.AppendLine("Exportação STEP – " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            log.AppendLine("Origem: " + (string)rootDoc.GetPathName());
            log.AppendLine("Formato: AP" + options.StepAp);
            log.AppendLine();

            // Peças primeiro, depois submontagens, por último a montagem principal.
            List<ExportItem> items = options.Items.OrderByDescending(i => i.Kind).ToList();
            Dictionary<ExportItem, string> targets = BuildTargetNames(items, options);

            int stepApPref = SwConst.Get("swUserPreferenceIntegerValue_e", "swStepAP");
            int previousAp = _swApp.GetUserPreferenceIntegerValue(stepApPref);
            if (!(bool)_swApp.SetUserPreferenceIntegerValue(stepApPref, options.StepAp))
                log.AppendLine("AVISO: esta versão do SOLIDWORKS não aceitou AP" + options.StepAp +
                               "; usando AP" + previousAp + ".");

            string rootTitle = rootDoc.GetTitle();
            bool activatedOtherDocs = false;

            object progressObj;
            _swApp.GetUserProgressBar(out progressObj);
            dynamic progress = progressObj;
            progress.Start(0, items.Count, "Exportando STEP");
            _swApp.CommandInProgress = true;

            try
            {
                for (int n = 0; n < items.Count; n++)
                {
                    ExportItem item = items[n];
                    string target = targets[item];

                    progress.UpdateTitle(string.Format("Exportando STEP {0}/{1}: {2}", n + 1, items.Count, Path.GetFileName(target)));
                    if ((int)progress.UpdateProgress(n) == _userCancel)
                    {
                        report.Cancelled = true;
                        log.AppendLine("CANCELADO pelo usuário.");
                        break;
                    }

                    if (!options.Overwrite && File.Exists(target))
                    {
                        report.Skipped++;
                        log.AppendLine("IGNORADO (já existe)  " + target);
                        continue;
                    }

                    string error;
                    bool activated;
                    if (ExportOne(item, target, out error, out activated))
                    {
                        report.Succeeded++;
                        log.AppendLine("OK     " + Describe(item) + "  ->  " + target);
                    }
                    else
                    {
                        report.Failed++;
                        log.AppendLine("FALHA  " + Describe(item) + "  ->  " + error);
                    }
                    activatedOtherDocs |= activated;
                }
            }
            finally
            {
                progress.End();
                _swApp.CommandInProgress = false;
                _swApp.SetUserPreferenceIntegerValue(stepApPref, previousAp);

                if (activatedOtherDocs)
                {
                    int err = 0;
                    _swApp.ActivateDoc3(rootTitle, false, _dontRebuild, ref err);
                }
            }

            log.AppendLine();
            log.AppendLine(string.Format("Resumo: {0} OK, {1} ignorado(s), {2} falha(s).",
                report.Succeeded, report.Skipped, report.Failed));

            report.LogPath = Path.Combine(options.OutputFolder,
                "exportacao_step_" + DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".log");
            try
            {
                File.WriteAllText(report.LogPath, log.ToString(), Encoding.UTF8);
            }
            catch (Exception ex)
            {
                report.LogPath = "(não gravado: " + ex.Message + ")";
            }

            return report;
        }

        /// <summary>
        /// Exporta um item na configuração referenciada pela montagem, restaurando a
        /// configuração ativa original do arquivo ao final.
        /// </summary>
        private bool ExportOne(ExportItem item, string target, out string error, out bool activated)
        {
            error = null;
            activated = false;

            dynamic doc = item.Model;
            if (doc == null)
            {
                error = "documento não carregado";
                return false;
            }

            string originalCfg = doc.ConfigurationManager.ActiveConfiguration.Name;
            bool switchCfg = !string.IsNullOrEmpty(item.Configuration) &&
                             !string.Equals(originalCfg, item.Configuration, StringComparison.Ordinal);
            bool wasVisible = doc.Visible;

            try
            {
                if (switchCfg && !(bool)doc.ShowConfiguration2(item.Configuration))
                {
                    // Alguns documentos ocultos (carregados só pela montagem) não trocam de
                    // configuração sem uma janela ativa: ativa, troca e fecha depois.
                    int actErr = 0;
                    _swApp.ActivateDoc3((string)doc.GetTitle(), false, _dontRebuild, ref actErr);
                    activated = true;
                    if (!(bool)doc.ShowConfiguration2(item.Configuration))
                    {
                        error = "não foi possível ativar a configuração '" + item.Configuration + "'";
                        return false;
                    }
                }

                int errors = 0, warnings = 0;
                // DispatchWrapper(null) = "Nothing" do VBA (VT_DISPATCH nulo) para os parâmetros opcionais.
                bool ok = doc.Extension.SaveAs3(
                    target, _saveAsVersion, _saveAsOptions,
                    new DispatchWrapper(null), new DispatchWrapper(null), ref errors, ref warnings);

                if (!ok || !File.Exists(target))
                {
                    error = string.Format("SaveAs3 falhou (erros={0}, avisos={1})", errors, warnings);
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
            finally
            {
                if (switchCfg)
                    doc.ShowConfiguration2(originalCfg);

                // Fecha apenas a janela aberta por nós; o modelo continua referenciado pela montagem.
                if (activated && !wasVisible)
                    _swApp.CloseDoc((string)doc.GetTitle());
            }
        }

        private static Dictionary<ExportItem, string> BuildTargetNames(List<ExportItem> items, ExportOptions options)
        {
            var configsPerFile = items
                .GroupBy(i => i.FilePath, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

            var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var result = new Dictionary<ExportItem, string>();

            foreach (ExportItem item in items)
            {
                string name = item.FileName;
                bool appendCfg = options.AlwaysAppendConfiguration || configsPerFile[item.FilePath] > 1;
                if (appendCfg && !string.IsNullOrEmpty(item.Configuration))
                    name += "_" + item.Configuration;

                name = Sanitize(name);

                // Arquivos homônimos em pastas diferentes não podem se sobrescrever.
                string candidate = name;
                int suffix = 2;
                while (!used.Add(candidate))
                    candidate = name + "_" + suffix++;

                result[item] = Path.Combine(options.OutputFolder, candidate + ".step");
            }
            return result;
        }

        private static string Sanitize(string name)
        {
            foreach (char c in Path.GetInvalidFileNameChars())
                name = name.Replace(c, '_');
            return name.Trim();
        }

        private static string Describe(ExportItem item)
        {
            return string.Format("[{0}] {1} ({2})", item.Kind, item.FileName, item.Configuration);
        }
    }
}
