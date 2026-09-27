# Check the distributed Windows executable from a relocated, extracted ZIP.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$testRoot = Join-Path $root ('release\launcher check & spaces ' + [Guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath (Join-Path $root "release\GP-200_Tone_Desk_v${version}_Windows.zip") -DestinationPath $testRoot
$executable = Join-Path $testRoot 'GP-200 Tone Desk\GP-200 Tone Desk.exe'
$assembly = [Reflection.Assembly]::LoadFile($executable)
$launcher = $assembly.GetType('ToneDesk')
$pageFolder = Join-Path $testRoot 'browser data'
$page = $launcher.GetMethod('PreparePage').Invoke($null, [object[]]@([string]$pageFolder))
$expectedHash = (Get-FileHash -LiteralPath (Join-Path $root 'dist\index.html')).Hash
if ((Get-FileHash -LiteralPath $page).Hash -ne $expectedHash) { throw 'Embedded page differs from the built app.' }
# An update must use the same address so browser storage remains reachable.
$nextPage = $launcher.GetMethod('PreparePage').Invoke($null, [object[]]@([string]$pageFolder))
if ($nextPage -ne $page) { throw 'Page address changed between launches.' }
$browser = $launcher.GetMethod('FindBrowser').Invoke($null, @())
if (-not $browser -or -not (Test-Path -LiteralPath $browser)) { throw 'Installed browser was not found.' }

Add-Type -AssemblyName System.Drawing
$actualIcon = [Drawing.Icon]::ExtractAssociatedIcon($executable)
$actual = $actualIcon.ToBitmap()
try {
    $actual.Save((Join-Path $root 'release\verified-windows-icon.png'))
} finally {
    $actual.Dispose()
    $actualIcon.Dispose()
}
python (Join-Path $PSScriptRoot 'check-launchers.py')
if ($LASTEXITCODE -ne 0) { throw 'Archive or shell icon validation failed.' }
Write-Output 'PASS: relocated Windows ZIP retains the pedal icon, embedded HTML, stable page address and browser discovery.'
Write-Output "Extracted page: $page"
