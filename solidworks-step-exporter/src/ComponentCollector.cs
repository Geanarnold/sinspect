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

    public static class ComponentCollector
    {
        public static ComponentCollection Collect(ISldWorks swApp, ModelDoc2 rootDoc)
        {
            string rootPath = rootDoc.GetPathName();
            var result = new ComponentCollection
            {
                RootName = Path.GetFileName(rootPath),
                RootFolder = Path.GetDirectoryName(rootPath)
            };

            bool isAssembly = rootDoc.GetType() == (int)swDocumentTypes_e.swDocASSEMBLY;
            string rootCfg = rootDoc.ConfigurationManager.ActiveConfiguration.Name;

            result.Items.Add(new ExportItem
            {
                FilePath = rootPath,
                Configuration = rootCfg,
                Kind = isAssembly ? ItemKind.TopAssembly : ItemKind.Part,
                Quantity = 1,
                Level = 0,
                Model = rootDoc
            });

            if (!isAssembly)
                return result;

            AssemblyDoc assy = (AssemblyDoc)rootDoc;

            // Componentes leves (lightweight) não expõem o ModelDoc2: resolve antes de varrer.
            assy.ResolveAllLightWeightComponents(false);

            Component2 root = (Component2)rootDoc.ConfigurationManager.ActiveConfiguration.GetRootComponent3(true);
            if (root == null)
            {
                result.Warnings.Add("Não foi possível obter o componente raiz da montagem.");
                return result;
            }

            var index = new Dictionary<string, ExportItem>(StringComparer.OrdinalIgnoreCase);
            Traverse(root, 1, result, index);
            return result;
        }

        private static void Traverse(Component2 parent, int level, ComponentCollection result,
            Dictionary<string, ExportItem> index)
        {
            object[] children = (object[])parent.GetChildren();
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

                int docType = model.GetType();
                bool isAssembly = docType == (int)swDocumentTypes_e.swDocASSEMBLY;

                var item = new ExportItem
                {
                    FilePath = comp.GetPathName(),
                    Configuration = comp.ReferencedConfiguration,
                    Kind = isAssembly ? ItemKind.SubAssembly : ItemKind.Part,
                    IsToolbox = !isAssembly &&
                                model.Extension.ToolboxPartType != (int)swToolBoxPartType_e.swNotAToolboxPart,
                    IsVirtual = comp.IsVirtual,
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
                    Traverse(comp, level + 1, result, index);
            }
        }
    }
}
