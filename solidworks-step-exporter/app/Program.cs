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
            Ui.Log("==== " + ExportCommand.Title + " " + ExportCommand.Revision + " iniciado (exe) ====");
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
            Application.ThreadException += (s, e) => Ui.Error(e.Exception);
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                var ex = e.ExceptionObject as Exception;
                if (ex != null) Ui.Error(ex);
            };

            ISldWorks swApp;
            WaitForm wait = WaitForm.Open("Conectando ao SOLIDWORKS...");
            try
            {
                object instance = Marshal.GetActiveObject("SldWorks.Application");
                Ui.Log("SOLIDWORKS encontrado");
                swApp = (ISldWorks)instance;
                Ui.Log("Conectado: " + swApp.RevisionNumber());
            }
            catch (COMException ex)
            {
                wait.Close();
                Ui.Log("SOLIDWORKS não encontrado: " + ex.Message);
                ExportCommand.Warn("Não encontrei o SOLIDWORKS aberto.\n\n" +
                                   "Abra o SOLIDWORKS com a montagem desejada e execute novamente.\n" +
                                   "Se o SOLIDWORKS foi aberto como administrador, execute este programa " +
                                   "também como administrador (botão direito > Executar como administrador).");
                return;
            }
            catch (Exception ex)
            {
                wait.Close();
                Ui.Error(ex);
                return;
            }
            wait.Close();

            ExportCommand.Run(swApp);
            Marshal.ReleaseComObject(swApp);
            Ui.Log("Encerrado");
        }
    }
}
