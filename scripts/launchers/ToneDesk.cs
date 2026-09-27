using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

public static class ToneDesk
{
    [STAThread]
    public static void Main()
    {
        try
        {
            string browser = FindBrowser();
            if (browser == null)
                throw new InvalidOperationException("Install Microsoft Edge or Google Chrome, then open Tone Desk again.");
            string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GP-200 Tone Desk");
            string page = PreparePage(folder);
            Process.Start(new ProcessStartInfo(browser, "\"" + new Uri(page).AbsoluteUri + "\"") { UseShellExecute = false });
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "GP-200 Tone Desk", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    public static string PreparePage(string folder)
    {
        // A stable page address lets future launcher updates reuse browser storage.
        Directory.CreateDirectory(folder);
        string page = Path.Combine(folder, "GP-200 Tone Desk.html");
        using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream("ToneDesk.html"))
        using (FileStream destination = File.Create(page))
            source.CopyTo(destination);
        return page;
    }

    public static string FindBrowser()
    {
        // Prefer Edge on Windows to match the browser used by existing local tests.
        foreach (string name in new string[] { "msedge.exe", "chrome.exe" })
        {
            foreach (RegistryKey hive in new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine })
            {
                using (RegistryKey key = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + name))
                {
                    string path = key == null ? null : key.GetValue(null) as string;
                    if (path != null && File.Exists(path.Trim('"'))) return path.Trim('"');
                }
            }
            string relative = name == "msedge.exe" ? @"Microsoft\Edge\Application\msedge.exe" : @"Google\Chrome\Application\chrome.exe";
            foreach (Environment.SpecialFolder location in new Environment.SpecialFolder[] {
                Environment.SpecialFolder.ProgramFiles, Environment.SpecialFolder.ProgramFilesX86,
                Environment.SpecialFolder.LocalApplicationData })
            {
                string path = Path.Combine(Environment.GetFolderPath(location), relative);
                if (File.Exists(path)) return path;
            }
        }
        return null;
    }
}
