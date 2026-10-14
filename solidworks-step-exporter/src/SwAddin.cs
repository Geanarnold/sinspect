using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;
using SolidWorks.Interop.swpublished;

namespace StepExporter
{
    /// <summary>
    /// Add-in do SOLIDWORKS: adiciona o comando "Exportar STEP" (menu, barra de ferramentas
    /// e aba no CommandManager) para montagens e peças.
    /// </summary>
    [ComVisible(true)]
    [Guid("f004cba8-388c-4126-8113-efc4fd40b057")]
    public class SwAddin : ISwAddin
    {
        private const string AddinTitle = "Exportador STEP";
        private const string AddinDescription = "Exporta peças, submontagens e montagens para STEP em lote.";
        private const int MainCmdGroupId = 7001;
        private const int CmdExportId = 0;

        private ISldWorks _swApp;
        private ICommandManager _cmdMgr;
        private int _addinCookie;

        #region Registro COM

        [ComRegisterFunction]
        public static void RegisterFunction(Type t)
        {
            string guid = "{" + t.GUID.ToString() + "}";

            using (RegistryKey key = Registry.LocalMachine.CreateSubKey(@"SOFTWARE\SolidWorks\Addins\" + guid))
            {
                key.SetValue(null, 0);
                key.SetValue("Description", AddinDescription);
                key.SetValue("Title", AddinTitle);
            }

            // Carregar automaticamente ao iniciar o SOLIDWORKS (usuário que executou o registro).
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\SolidWorks\AddInsStartup\" + guid))
            {
                key.SetValue(null, 1, RegistryValueKind.DWord);
            }
        }

        [ComUnregisterFunction]
        public static void UnregisterFunction(Type t)
        {
            string guid = "{" + t.GUID.ToString() + "}";
            Registry.LocalMachine.DeleteSubKey(@"SOFTWARE\SolidWorks\Addins\" + guid, false);
            Registry.CurrentUser.DeleteSubKey(@"Software\SolidWorks\AddInsStartup\" + guid, false);
        }

        #endregion

        #region ISwAddin

        public bool ConnectToSW(object ThisSW, int Cookie)
        {
            _swApp = (ISldWorks)ThisSW;
            _addinCookie = Cookie;

            _swApp.SetAddinCallbackInfo2(0, this, _addinCookie);
            _cmdMgr = _swApp.GetCommandManager(Cookie);
            AddCommandManager();
            return true;
        }

        public bool DisconnectFromSW()
        {
            RemoveCommandManager();
            Marshal.ReleaseComObject(_cmdMgr);
            _cmdMgr = null;
            Marshal.ReleaseComObject(_swApp);
            _swApp = null;
            GC.Collect();
            GC.WaitForPendingFinalizers();
            return true;
        }

        #endregion

        #region Interface (CommandManager)

        private void AddCommandManager()
        {
            int err = 0;
            ICommandGroup group = _cmdMgr.CreateCommandGroup2(
                MainCmdGroupId, AddinTitle, AddinDescription, AddinDescription, -1, true, ref err);

            string[] icons = IconFactory.CreateIconStrips();
            group.IconList = icons;
            group.MainIconList = icons;

            int menuToolbar = (int)(swCommandItemType_e.swMenuItem | swCommandItemType_e.swToolbarItem);
            int cmdIndex = group.AddCommandItem2(
                "Exportar STEP", -1,
                "Exporta para STEP os componentes selecionados da montagem",
                "Exportar STEP em lote", 0,
                nameof(OnExportStep), nameof(OnExportStepEnable), CmdExportId, menuToolbar);

            group.HasToolbar = true;
            group.HasMenu = true;
            group.Activate();

            int[] docTypes = { (int)swDocumentTypes_e.swDocASSEMBLY, (int)swDocumentTypes_e.swDocPART };
            foreach (int docType in docTypes)
            {
                CommandTab tab = _cmdMgr.GetCommandTab(docType, AddinTitle);
                if (tab != null)
                    _cmdMgr.RemoveCommandTab(tab);

                tab = _cmdMgr.AddCommandTab(docType, AddinTitle);
                CommandTabBox box = tab.AddCommandTabBox();
                int[] ids = { group.get_CommandID(cmdIndex) };
                int[] textTypes = { (int)swCommandTabButtonTextDisplay_e.swCommandTabButton_TextBelow };
                box.AddCommands(ids, textTypes);
            }
        }

        private void RemoveCommandManager()
        {
            int[] docTypes = { (int)swDocumentTypes_e.swDocASSEMBLY, (int)swDocumentTypes_e.swDocPART };
            foreach (int docType in docTypes)
            {
                CommandTab tab = _cmdMgr.GetCommandTab(docType, AddinTitle);
                if (tab != null)
                    _cmdMgr.RemoveCommandTab(tab);
            }
            _cmdMgr.RemoveCommandGroup(MainCmdGroupId);
        }

        #endregion

        #region Callbacks

        /// <summary>Habilita o comando somente com peça ou montagem ativa (1 = habilitado).</summary>
        public int OnExportStepEnable()
        {
            ModelDoc2 doc = (ModelDoc2)_swApp.ActiveDoc;
            if (doc == null)
                return 0;
            int type = doc.GetType();
            return type == (int)swDocumentTypes_e.swDocASSEMBLY || type == (int)swDocumentTypes_e.swDocPART ? 1 : 0;
        }

        public void OnExportStep()
        {
            ExportCommand.Run(_swApp);
        }

        #endregion
    }

    /// <summary>
    /// Gera os ícones do comando em tempo de execução (evita arquivos binários no repositório).
    /// </summary>
    internal static class IconFactory
    {
        private static readonly int[] Sizes = { 20, 32, 40, 64, 96, 128 };

        public static string[] CreateIconStrips()
        {
            string folder = Path.Combine(Path.GetTempPath(), "StepExporterIcons");
            Directory.CreateDirectory(folder);

            var paths = new string[Sizes.Length];
            for (int i = 0; i < Sizes.Length; i++)
            {
                int s = Sizes[i];
                string path = Path.Combine(folder, "step_" + s + ".png");
                using (var bmp = new Bitmap(s, s, PixelFormat.Format32bppArgb))
                using (var g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.Clear(Color.Transparent);
                    using (var bg = new SolidBrush(Color.FromArgb(232, 82, 10)))
                        g.FillRectangle(bg, 0, 0, s, s);
                    using (var font = new Font("Arial", s * 0.30f, FontStyle.Bold, GraphicsUnit.Pixel))
                    using (var fg = new SolidBrush(Color.White))
                    {
                        var fmt = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                        g.DrawString("STP", font, fg, new RectangleF(0, 0, s, s), fmt);
                    }
                    bmp.Save(path, ImageFormat.Png);
                }
                paths[i] = path;
            }
            return paths;
        }
    }
}
