using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace StepExporter
{
    public class ExportReport
    {
        public int Succeeded;
        public int Skipped;
        public int Failed;
        public int DxfSucceeded;
        public int DxfFailed;
        public int DxfWithoutCode;
        public bool Cancelled;
        public string LogPath;
    }

    public class StepExportService
    {
        private readonly ISldWorks _swApp;

        private const int DontRebuild = (int)swRebuildOnActivation_e.swDontRebuildActiveDoc;

        public StepExportService(ISldWorks swApp)
        {
            _swApp = swApp;
        }

        public ExportReport Export(ModelDoc2 rootDoc, ExportOptions options)
        {
            var report = new ExportReport();
            var log = new StringBuilder();
            log.AppendLine("Exportação STEP – " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            log.AppendLine("Origem: " + rootDoc.GetPathName());
            log.AppendLine("STEP: " + (options.GenerateStep ? "AP" + options.StepAp + " em " + options.OutputFolder : "não"));
            log.AppendLine("DXF planificado: " + (options.GenerateDxf ? options.DxfFolder + " (prefixo = propriedade \"" + options.CodeProperty + "\", SheetMetalOptions = " + SheetMetalOptions(options) + ")" : "não"));
            log.AppendLine();

            // Peças primeiro, depois submontagens, por último a montagem principal.
            List<ExportItem> items = options.Items.OrderByDescending(i => i.Kind).ToList();
            Dictionary<ExportItem, string> targets = BuildTargetNames(items, options);

            const int stepApPref = (int)swUserPreferenceIntegerValue_e.swStepAP;
            int previousAp = _swApp.GetUserPreferenceIntegerValue(stepApPref);
            if (!_swApp.SetUserPreferenceIntegerValue(stepApPref, options.StepAp))
                log.AppendLine("AVISO: esta versão do SOLIDWORKS não aceitou AP" + options.StepAp +
                               "; usando AP" + previousAp + ".");

            string rootTitle = rootDoc.GetTitle();
            bool activatedOtherDocs = false;

            UserProgressBar progress;
            _swApp.GetUserProgressBar(out progress);
            progress.Start(0, items.Count, "Gerando arquivos");
            _swApp.CommandInProgress = true;

            try
            {
                for (int n = 0; n < items.Count; n++)
                {
                    ExportItem item = items[n];
                    string target = targets[item];

                    progress.UpdateTitle(string.Format("Gerando {0}/{1}: {2}", n + 1, items.Count, item.FileName));
                    if (progress.UpdateProgress(n) == (int)swUpdateProgressError_e.swUpdateProgressError_UserCancel)
                    {
                        report.Cancelled = true;
                        log.AppendLine("CANCELADO pelo usuário.");
                        break;
                    }

                    bool activated;
                    if (options.GenerateStep)
                    {
                        if (!options.Overwrite && File.Exists(target))
                        {
                            report.Skipped++;
                            log.AppendLine("IGNORADO (já existe)  " + target);
                        }
                        else
                        {
                            string error = WithConfiguration(item, doc => SaveStep(doc, target), out activated);
                            activatedOtherDocs |= activated;
                            if (error == null)
                            {
                                report.Succeeded++;
                                log.AppendLine("OK     STEP " + Describe(item) + "  ->  " + target);
                            }
                            else
                            {
                                report.Failed++;
                                log.AppendLine("FALHA  STEP " + Describe(item) + "  ->  " + error);
                            }
                        }
                    }

                    if (options.GenerateDxf && item.Kind == ItemKind.Part && item.IsSheetMetal)
                    {
                        string dxfTarget = null;
                        bool warnedNoCode = false;
                        Func<ModelDoc2, string> dxfAction = doc =>
                        {
                            string code = ReadProperty(doc, item.Configuration, options.CodeProperty);
                            if (string.IsNullOrEmpty(code) && !warnedNoCode)
                            {
                                warnedNoCode = true;
                                report.DxfWithoutCode++;
                                log.AppendLine("AVISO  DXF  " + Describe(item) + ": propriedade \"" + options.CodeProperty + "\" vazia, DXF sai sem prefixo");
                            }
                            string baseName = Path.GetFileNameWithoutExtension(target);
                            string name = string.IsNullOrEmpty(code) ? baseName : Sanitize(code) + " - " + baseName;
                            dxfTarget = Path.Combine(options.DxfFolder, name + ".dxf");
                            if (!options.Overwrite && File.Exists(dxfTarget))
                                return null;
                            return SaveFlatPattern(doc, dxfTarget, SheetMetalOptions(options));
                        };
                        string error = WithConfiguration(item, dxfAction, out activated);
                        activatedOtherDocs |= activated;
                        if (error != null && item.Model != null && !item.Model.Visible)
                        {
                            // Alguns exportadores só funcionam com a peça aberta em janela.
                            log.AppendLine("       DXF  " + Describe(item) + ": nova tentativa com a peça aberta (" + error + ")");
                            error = WithConfiguration(item, dxfAction, out activated, forceWindow: true);
                            activatedOtherDocs |= activated;
                        }
                        if (error == null)
                        {
                            report.DxfSucceeded++;
                            log.AppendLine("OK     DXF  " + Describe(item) + "  ->  " + dxfTarget);
                        }
                        else
                        {
                            report.DxfFailed++;
                            log.AppendLine("FALHA  DXF  " + Describe(item) + "  ->  " + error);
                        }
                    }
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
                    _swApp.ActivateDoc3(rootTitle, false, DontRebuild, ref err);
                }
            }

            log.AppendLine();
            log.AppendLine(string.Format("Resumo STEP: {0} OK, {1} ignorado(s), {2} falha(s).",
                report.Succeeded, report.Skipped, report.Failed));
            log.AppendLine(string.Format("Resumo DXF:  {0} OK, {1} falha(s), {2} sem código.",
                report.DxfSucceeded, report.DxfFailed, report.DxfWithoutCode));

            report.LogPath = Path.Combine(options.GenerateStep ? options.OutputFolder : options.DxfFolder,
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
        /// Executa <paramref name="action"/> com o documento na configuração referenciada pela
        /// montagem e restaura a configuração original. Retorna null se OK ou a mensagem de erro.
        /// </summary>
        private string WithConfiguration(ExportItem item, Func<ModelDoc2, string> action, out bool activated, bool forceWindow = false)
        {
            activated = false;

            ModelDoc2 doc = item.Model;
            if (doc == null)
                return "documento não carregado";

            string originalCfg = doc.ConfigurationManager.ActiveConfiguration.Name;
            bool switchCfg = !string.IsNullOrEmpty(item.Configuration) &&
                             !string.Equals(originalCfg, item.Configuration, StringComparison.Ordinal);
            bool wasVisible = doc.Visible;

            try
            {
                if (forceWindow && !wasVisible)
                {
                    int winErr = 0;
                    _swApp.ActivateDoc3(doc.GetTitle(), false, DontRebuild, ref winErr);
                    activated = true;
                }

                if (switchCfg && !doc.ShowConfiguration2(item.Configuration))
                {
                    // Alguns documentos ocultos (carregados só pela montagem) não trocam de
                    // configuração sem uma janela ativa: ativa, troca e fecha depois.
                    int actErr = 0;
                    _swApp.ActivateDoc3(doc.GetTitle(), false, DontRebuild, ref actErr);
                    activated = true;
                    if (!doc.ShowConfiguration2(item.Configuration))
                        return "não foi possível ativar a configuração '" + item.Configuration + "'";
                }

                return action(doc);
            }
            catch (Exception ex)
            {
                return ex.Message;
            }
            finally
            {
                if (switchCfg)
                    doc.ShowConfiguration2(originalCfg);

                // Fecha apenas a janela aberta por nós; o modelo continua referenciado pela montagem.
                if (activated && !wasVisible)
                    _swApp.CloseDoc(doc.GetTitle());
            }
        }

        private static string SaveStep(ModelDoc2 doc, string target)
        {
            int errors = 0, warnings = 0;
            bool ok = doc.Extension.SaveAs3(
                target,
                (int)swSaveAsVersion_e.swSaveAsCurrentVersion,
                (int)(swSaveAsOptions_e.swSaveAsOptions_Silent | swSaveAsOptions_e.swSaveAsOptions_Copy),
                null, null, ref errors, ref warnings);

            if (!ok || !File.Exists(target))
                return string.Format("SaveAs3 falhou (erros={0}, avisos={1})", errors, warnings);
            return null;
        }

        // Bits de SheetMetalOptions (ExportToDWG2, doc. oficial): bit1 = 1 geometria do planificado
        // (obrigatório), bit3 = 4 linhas de dobra, bit4 = 8 esboços, bit7 = 64 ferramentas de
        // conformação (repuxo, venezianas, nervuras...).
        private const int SheetMetalGeometry = 1;
        private const int SheetMetalBendLines = 4;
        private const int SheetMetalSketches = 8;
        private const int SheetMetalFormingTools = 64;

        public static int SheetMetalOptions(ExportOptions o)
        {
            return SheetMetalGeometry
                   | (o.DxfBendLines ? SheetMetalBendLines : 0)
                   | (o.DxfFormingTools ? SheetMetalFormingTools : 0)
                   | (o.DxfSketches ? SheetMetalSketches : 0);
        }

        private static string SaveFlatPattern(ModelDoc2 doc, string target, int options)
        {
            if (!ComponentCollector.IsSheetMetal(doc))
                return "nesta configuração a peça não é chapa metálica";

            bool ok = ((PartDoc)doc).ExportToDWG2(
                target, doc.GetPathName(), (int)swExportToDWG_e.swExportToDWG_ExportSheetMetal,
                true, null, false, false, options, null);

            if (!ok || !File.Exists(target))
                return "ExportToDWG2 falhou ao gerar o planificado";
            return null;
        }

        /// <summary>
        /// Lê uma propriedade personalizada (primeiro na configuração, depois no arquivo).
        /// Aceita o nome com ou sem ":" e com ou sem acento ("Código", "Código:", "Codigo").
        /// </summary>
        public static string ReadProperty(ModelDoc2 doc, string configuration, string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return null;

            string bare = name.Trim().TrimEnd(':').Trim();
            var names = new List<string> { name.Trim(), bare, bare + ":" };
            string noAccent = RemoveAccents(bare);
            if (noAccent != bare)
            {
                names.Add(noAccent);
                names.Add(noAccent + ":");
            }

            foreach (string scope in new[] { configuration ?? "", "" })
            {
                CustomPropertyManager manager = doc.Extension.get_CustomPropertyManager(scope);
                if (manager == null)
                    continue;
                foreach (string n in names)
                {
                    string raw, resolved;
                    bool wasResolved;
                    manager.Get5(n, false, out raw, out resolved, out wasResolved);
                    string value = string.IsNullOrWhiteSpace(resolved) ? raw : resolved;
                    if (!string.IsNullOrWhiteSpace(value))
                        return value.Trim();
                }
            }
            return null;
        }

        private static string RemoveAccents(string text)
        {
            string normalized = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (char c in normalized)
                if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            return sb.ToString().Normalize(NormalizationForm.FormC);
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
