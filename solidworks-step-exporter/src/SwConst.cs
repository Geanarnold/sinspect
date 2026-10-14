using System;
using System.IO;
using System.Linq;
using System.Reflection;

namespace StepExporter
{
    /// <summary>
    /// Lê as constantes da API (swconst) em tempo de execução, direto da instalação do
    /// SOLIDWORKS. Assim o executável compila sem as DLLs de interop e os valores das
    /// enumerações são sempre os da versão instalada.
    /// </summary>
    internal static class SwConst
    {
        private const string AssemblyName = "SolidWorks.Interop.swconst";
        private const string DefaultInstallDir = @"C:\Program Files\SOLIDWORKS Corp\SOLIDWORKS";

        private static Assembly _swconst;

        public static void Init(dynamic swApp)
        {
            if (_swconst != null)
                return;

            // Dentro do add-in a DLL já está carregada pelo próprio SOLIDWORKS.
            _swconst = AppDomain.CurrentDomain.GetAssemblies()
                .FirstOrDefault(a => a.GetName().Name == AssemblyName);
            if (_swconst != null)
                return;

            string exePath = null;
            try { exePath = (string)swApp.GetExecutablePath(); } catch { }

            foreach (string dir in CandidateDirs(exePath))
            {
                string dll = Path.Combine(dir, AssemblyName + ".dll");
                if (File.Exists(dll))
                {
                    _swconst = Assembly.LoadFrom(dll);
                    return;
                }
            }

            try
            {
#pragma warning disable 618
                _swconst = Assembly.LoadWithPartialName(AssemblyName); // GAC
#pragma warning restore 618
            }
            catch { }

            if (_swconst == null)
                throw new InvalidOperationException(
                    "Não foi possível localizar " + AssemblyName + ".dll na instalação do SOLIDWORKS" +
                    (exePath != null ? " (" + exePath + ")" : "") + ".");
        }

        public static int Get(string enumName, string member)
        {
            Type type = _swconst.GetType(AssemblyName + "." + enumName, true);
            return Convert.ToInt32(Enum.Parse(type, member));
        }

        private static string[] CandidateDirs(string exePath)
        {
            string root = DefaultInstallDir;
            if (!string.IsNullOrEmpty(exePath))
                root = exePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)
                    ? Path.GetDirectoryName(exePath)
                    : exePath.TrimEnd('\\', '/');

            return new[]
            {
                Path.Combine(root, "api", "redist"),
                root,
                Path.Combine(DefaultInstallDir, "api", "redist")
            };
        }
    }
}
