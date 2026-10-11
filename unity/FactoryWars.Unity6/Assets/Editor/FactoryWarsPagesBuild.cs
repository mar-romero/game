using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace FactoryWars.Unity6.Editor
{
    /// <summary>Build the public visual preview with no live service credentials or endpoint.</summary>
    public static class FactoryWarsPagesBuild
    {
        public static void Build()
        {
            string project = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            string repository = Path.GetFullPath(Path.Combine(project, "../.."));
            string output = Path.GetFullPath(Path.Combine(repository, "public/unity"));
            string staging = Path.GetFullPath(Path.Combine(project, "Library/FactoryWarsPagesBuild"));
            string configurationPath = "Assets/Resources/FactoryWarsApiConfiguration.asset";
            string settingsPath = Path.Combine(project, "ProjectSettings/ProjectSettings.asset");
            string scene = "Assets/Scenes/FactoryWarsMobile.unity";
            if (!File.Exists(Path.Combine(repository, ".github/workflows/main.yml")) ||
                !File.Exists(Path.Combine(project, scene)))
                throw new InvalidOperationException("Expected Factory Wars repository and entry scene.");

            // Never overwrite an unrelated directory or follow a linked output directory.
            ValidateDirectory(output, Path.Combine(repository, "public/unity"));
            ValidateDirectory(staging, Path.Combine(project, "Library/FactoryWarsPagesBuild"));
            var configuration = AssetDatabase.LoadAssetAtPath<FactoryWarsApiConfiguration>(configurationPath);
            if (configuration == null) throw new InvalidOperationException("Missing API configuration asset.");
            byte[] originalConfiguration = File.ReadAllBytes(Path.Combine(project, configurationPath));
            byte[] originalSettings = File.ReadAllBytes(settingsPath);

            try
            {
                configuration.apiBaseUrl = "";
                configuration.supabaseUrl = "";
                configuration.supabasePublicKey = "";
                EditorUtility.SetDirty(configuration);
                AssetDatabase.SaveAssets();
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
                PlayerSettings.WebGL.decompressionFallback = true;
                PlayerSettings.WebGL.template = "PROJECT:FactoryWarsPages";
                PlayerSettings.WebGL.nameFilesAsHashes = true;
                PlayerSettings.defaultWebScreenWidth = 390;
                PlayerSettings.defaultWebScreenHeight = 844;

                if (Directory.Exists(staging)) Directory.Delete(staging, true);
                BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    scenes = new[] { scene },
                    locationPathName = staging,
                    target = BuildTarget.WebGL,
                    options = BuildOptions.None
                });
                if (report.summary.result != BuildResult.Succeeded)
                    throw new InvalidOperationException("WebGL build failed: " + report.summary.result);
                if (!File.Exists(Path.Combine(staging, "index.html")))
                    throw new InvalidOperationException("WebGL build did not produce index.html.");

                // Publish files only after a successful build; paths are fixed and checked above.
                if (Directory.Exists(output)) Directory.Delete(output, true);
                CopyDirectory(staging, output);
                Debug.Log("PAGES_BUILD_SUCCEEDED: " + output + " (" + report.summary.totalSize + " bytes)");
            }
            finally
            {
                File.WriteAllBytes(Path.Combine(project, configurationPath), originalConfiguration);
                AssetDatabase.ImportAsset(configurationPath, ImportAssetOptions.ForceUpdate);
                File.WriteAllBytes(settingsPath, originalSettings);
            }
        }

        private static void ValidateDirectory(string candidate, string expected)
        {
            if (!string.Equals(candidate, Path.GetFullPath(expected), StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Unexpected build output path.");
            for (var directory = new DirectoryInfo(candidate); directory != null; directory = directory.Parent)
                if (directory.Exists && (directory.Attributes & FileAttributes.ReparsePoint) != 0)
                    throw new InvalidOperationException("Build paths must not contain links: " + directory.FullName);
        }

        private static void CopyDirectory(string source, string destination)
        {
            Directory.CreateDirectory(destination);
            foreach (string file in Directory.GetFiles(source))
                File.Copy(file, Path.Combine(destination, Path.GetFileName(file)));
            foreach (string directory in Directory.GetDirectories(source))
                CopyDirectory(directory, Path.Combine(destination, Path.GetFileName(directory)));
        }
    }
}
