[CmdletBinding()]
param([ValidateSet('Inspect', 'Apply', 'Restore')][string]$Action = 'Inspect')

$ErrorActionPreference = 'Stop'
$backupPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'data\terminal-handler-before.json'
$keyPath = 'Console\%%Startup'
$names = @('DelegationConsole', 'DelegationTerminal')
$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($keyPath)
$savedValues = @{}
foreach ($name in $names) {
    $savedValues[$name] = if ($null -ne $key) { $key.GetValue($name, $null) } else { $null }
}
if ($key) { $key.Dispose() }
$savedValues | ConvertTo-Json
if ($Action -eq 'Inspect') { return }

if ($Action -eq 'Apply') {
    if (-not (Test-Path -LiteralPath $backupPath)) {
        @{ user = [Security.Principal.WindowsIdentity]::GetCurrent().Name; captured = (Get-Date).ToString('o'); values = $savedValues } |
            ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $backupPath -Encoding UTF8
    }
    $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($keyPath)
    try {
        # Microsoft's documented Windows Console Host choice avoids Terminal delegation.
        foreach ($name in $names) { $key.SetValue($name, '{B23D10C0-E52E-411E-9D5B-C09FDF709C7D}', [Microsoft.Win32.RegistryValueKind]::String) }
    } finally { $key.Dispose() }
    Write-Output 'Default terminal handler is now Windows Console Host. Existing windows are unchanged.'
} else {
    $backup = Get-Content -LiteralPath $backupPath -Raw | ConvertFrom-Json
    if ($backup.user -ne [Security.Principal.WindowsIdentity]::GetCurrent().Name) { throw 'Backup belongs to a different Windows user.' }
    $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($keyPath)
    try {
        foreach ($name in $names) {
            $value = $backup.values.$name
            if ($null -eq $value) { $key.DeleteValue($name, $false) }
            else { $key.SetValue($name, [string]$value, [Microsoft.Win32.RegistryValueKind]::String) }
        }
    } finally { $key.Dispose() }
    Write-Output 'Restored the prior default terminal handler.'
}
