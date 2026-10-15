using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using SolidWorks.Interop.sldworks;

namespace StepExporter
{
    /// <summary>
    /// Executável avulso: conecta ao SOLIDWORKS já aberto e roda o mesmo fluxo do add-in.
    /// Não exige registro COM nem direitos de administrador.
    /// </summary>
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            ISldWorks swApp;
            try
            {
                swApp = (ISldWorks)Marshal.GetActiveObject("SldWorks.Application");
            }
            catch (COMException)
            {
                ExportCommand.Warn("O SOLIDWORKS não está aberto.\n\n" +
                                   "Abra o SOLIDWORKS com a montagem desejada e execute novamente.\n" +
                                   "(Se o SOLIDWORKS foi aberto como administrador, este programa também precisa ser.)");
                return;
            }

            ExportCommand.Run(swApp);
            Marshal.ReleaseComObject(swApp);
        }
    }
}
