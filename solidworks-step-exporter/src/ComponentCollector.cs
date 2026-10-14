using System;
using System.Collections.Generic;
using System.IO;

namespace StepExporter
{
    public enum ItemKind
    {
        TopAssembly,
        SubAssembly,
        Part
    }

    /// <summary>Um arquivo + configuração exportável (componentes repetidos são agrupados).</summary>
    public class ExportItem
    {
        public string FilePath;
        public string Configuration;
        public ItemKind Kind;
        public bool IsToolbox;
        public bool IsVirtual;
        public int Quantity;
        public int Level;
        public dynamic Model; // ModelDoc2

        public string FileName
        {
            get { return Path.GetFileNameWithoutExtension(FilePath); }
        }

        public string Key
        {
            get { return (FilePath + "|" + Configuration).ToUpperInvariant(); }
        }
    }

    public class ComponentCollection
    {
        public string RootName;
        public string RootFolder;
        public readonly List<ExportItem> Items = new List<ExportItem>();
        public readonly List<string> Warnings = new List<string>();
    }

    /// <summary>
    /// Varre a árvore da montagem. Usa ligação tardia (dynamic) para funcionar tanto
    /// dentro do add-in quanto no executável avulso, sem DLLs de interop na compilação.
    /// </summary>
    public static class ComponentCollector
    {
        public static bool IsAssemblyPath(string path)
        {
            return path != null && path.EndsWith(".sldasm", StringComparison.OrdinalIgnoreCase);
        }

        public static ComponentCollection Collect(dynamic rootDoc)
        {
            string rootPath = rootDoc.GetPathName();
            var result = new ComponentCollection
            {
                RootName = Path.GetFileName(rootPath),
                RootFolder = Path.GetDirectoryName(rootPath)
            };

            bool isAssembly = IsAssemblyPath(rootPath);
            dynamic activeCfg = rootDoc.ConfigurationManager.ActiveConfiguration;

            result.Items.Add(new ExportItem
            {
                FilePath = rootPath,
                Configuration = (string)activeCfg.Name,
                Kind = isAssembly ? ItemKind.TopAssembly : ItemKind.Part,
                Quantity = 1,
                Level = 0,
                Model = rootDoc
            });

            if (!isAssembly)
                return result;

            // Componentes leves (lightweight) não expõem o ModelDoc2: resolve antes de varrer.
            rootDoc.ResolveAllLightWeightComponents(false);

            dynamic root = activeCfg.GetRootComponent3(true);
            if (root == null)
            {
                result.Warnings.Add("Não foi possível obter o componente raiz da montagem.");
                return result;
            }

            int notToolbox = SwConst.Get("swToolBoxPartType_e", "swNotAToolboxPart");
            var index = new Dictionary<string, ExportItem>(StringComparer.OrdinalIgnoreCase);
            Traverse(root, 1, result, index, notToolbox);
            return result;
        }

        private static void Traverse(dynamic parent, int level, ComponentCollection result,
            Dictionary<string, ExportItem> index, int notToolbox)
        {
            object[] children = parent.GetChildren() as object[];
            if (children == null)
                return;

            foreach (object o in children)
            {
                dynamic comp = o;

                if ((bool)comp.IsSuppressed() || (bool)comp.IsEnvelope())
                    continue;

                dynamic model = comp.GetModelDoc2();
                if (model == null)
                {
                    result.Warnings.Add("Componente não carregado (ignorado): " + (string)comp.Name2);
                    continue;
                }

                string path = comp.GetPathName();
                bool isAssembly = IsAssemblyPath(path);

                var item = new ExportItem
                {
                    FilePath = path,
                    Configuration = (string)comp.ReferencedConfiguration,
                    Kind = isAssembly ? ItemKind.SubAssembly : ItemKind.Part,
                    IsToolbox = !isAssembly && (int)model.Extension.ToolboxPartType != notToolbox,
                    IsVirtual = (bool)comp.IsVirtual,
                    Quantity = 1,
                    Level = level,
                    Model = model
                };

                ExportItem existing;
                if (index.TryGetValue(item.Key, out existing))
                {
                    existing.Quantity++;
                    existing.Level = Math.Min(existing.Level, level);
                }
                else
                {
                    index[item.Key] = item;
                    result.Items.Add(item);
                }

                if (isAssembly)
                    Traverse(comp, level + 1, result, index, notToolbox);
            }
        }
    }
}
