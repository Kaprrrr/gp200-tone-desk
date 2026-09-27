# Packages the Windows launcher and the Mac standalone browser page.
# Usage (from the project folder):  powershell -ExecutionPolicy Bypass -File scripts\package-release.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }

$stage = Join-Path $root 'release\GP-200 Tone Desk'
# Verify the staging boundary before any recursive cleanup.
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $root 'release'))
$resolvedStage = [IO.Path]::GetFullPath($stage)
if ($resolvedStage -ne (Join-Path $releaseRoot 'GP-200 Tone Desk')) { throw 'Unexpected release staging directory' }
if (Test-Path -LiteralPath $stage) {
    if ((Get-Item -LiteralPath $stage).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Release staging must not be a directory link' }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
}
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item dist\index.html (Join-Path $stage 'GP-200 Tone Desk.html')
Copy-Item scripts\release-readme.txt (Join-Path $stage 'READ ME FIRST.txt')
# Keep the original HTML path available for existing shortcuts and browser data.
python scripts/package-launchers.py
if ($LASTEXITCODE -ne 0) { throw 'Windows launcher packaging failed' }
python scripts/package-html.py
if ($LASTEXITCODE -ne 0) { throw 'HTML packaging failed' }
