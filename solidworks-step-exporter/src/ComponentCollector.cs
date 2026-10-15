using System;
using System.Collections.Generic;
using System.IO;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

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
        public bool IsSheetMetal;
        public int Quantity;
        public int Level;
        public ModelDoc2 Model;

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

    /// <summary>Varre a árvore da montagem (todos os níveis).</summary>
    public static class ComponentCollector
    {
        /// <summary>True se a peça (na configuração ativa) tem algum corpo de chapa metálica.</summary>
        public static bool IsSheetMetal(ModelDoc2 model)
        {
            if (model == null || model.GetType() != (int)swDocumentTypes_e.swDocPART)
                return false;
            try
            {
                object[] bodies = ((PartDoc)model).GetBodies2((int)swBodyType_e.swSolidBody, true) as object[];
                if (bodies == null)
                    return false;
                foreach (object b in bodies)
                    if (((Body2)b).IsSheetMetal())
                        return true;
            }
            catch
            {
            }
            return false;
        }

        public static bool IsAssemblyPath(string path)
        {
            return path != null && path.EndsWith(".sldasm", StringComparison.OrdinalIgnoreCase);
        }

        public static ComponentCollection Collect(ModelDoc2 rootDoc)
        {
            string rootPath = rootDoc.GetPathName();
            var result = new ComponentCollection
            {
                RootName = Path.GetFileName(rootPath),
                RootFolder = Path.GetDirectoryName(rootPath)
            };

            bool isAssembly = rootDoc.GetType() == (int)swDocumentTypes_e.swDocASSEMBLY;
            Configuration activeCfg = rootDoc.ConfigurationManager.ActiveConfiguration;

            result.Items.Add(new ExportItem
            {
                FilePath = rootPath,
                Configuration = activeCfg.Name,
                Kind = isAssembly ? ItemKind.TopAssembly : ItemKind.Part,
                IsSheetMetal = !isAssembly && IsSheetMetal(rootDoc),
                Quantity = 1,
                Level = 0,
                Model = rootDoc
            });

            if (!isAssembly)
                return result;

            // Componentes leves (lightweight) não expõem o ModelDoc2: resolve antes de varrer.
            ((AssemblyDoc)rootDoc).ResolveAllLightWeightComponents(false);

            Component2 root = (Component2)activeCfg.GetRootComponent3(true);
            if (root == null)
            {
                result.Warnings.Add("Não foi possível obter o componente raiz da montagem.");
                return result;
            }

            const int notToolbox = (int)swToolBoxPartType_e.swNotAToolboxPart;
            var index = new Dictionary<string, ExportItem>(StringComparer.OrdinalIgnoreCase);
            Traverse(root, 1, result, index, notToolbox);
            return result;
        }

        private static void Traverse(Component2 parent, int level, ComponentCollection result,
            Dictionary<string, ExportItem> index, int notToolbox)
        {
            object[] children = parent.GetChildren() as object[];
            if (children == null)
                return;

            foreach (object o in children)
            {
                Component2 comp = (Component2)o;

                if (comp.IsSuppressed() || comp.IsEnvelope())
                    continue;

                ModelDoc2 model = (ModelDoc2)comp.GetModelDoc2();
                if (model == null)
                {
                    result.Warnings.Add("Componente não carregado (ignorado): " + comp.Name2);
                    continue;
                }

                string path = comp.GetPathName();
                bool isAssembly = model.GetType() == (int)swDocumentTypes_e.swDocASSEMBLY;

                var item = new ExportItem
                {
                    FilePath = path,
                    Configuration = comp.ReferencedConfiguration,
                    Kind = isAssembly ? ItemKind.SubAssembly : ItemKind.Part,
                    IsToolbox = !isAssembly && model.Extension.ToolboxPartType != notToolbox,
                    IsVirtual = comp.IsVirtual,
                    IsSheetMetal = !isAssembly && IsSheetMetal(model),
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
